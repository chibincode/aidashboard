import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import type { requireDb } from "@/lib/db/index";
import { dashboardOverviews } from "@/lib/db/schema";
import type { DashboardFilters, DashboardItem, DashboardOverview, DashboardOverviewTag } from "@/lib/domain";
import { appConfig, env } from "@/lib/env";
import { serializeDashboardFilters } from "@/lib/filters";

const LAST_24_HOURS_MS = 24 * 60 * 60 * 1000;
const OVERVIEW_WINDOW = "last-24h" as const;
const DEFAULT_PRIMARY_MODEL = "openrouter/hunter-alpha";
const DEFAULT_FALLBACK_MODEL = "minimax/minimax-m2.5";
const AI_INPUT_LIMIT = 12;
const AI_MAX_TOKENS = 700;
const EXCERPT_CHAR_LIMIT = 160;
const PROVIDER_TIMEOUT_MS = 12_000;

type DashboardDb = ReturnType<typeof requireDb>;

type StoredOverviewPayload = Pick<
  DashboardOverview,
  "mode" | "headline" | "bullets" | "itemCount" | "sourceCount" | "topTags" | "model" | "statusText"
>;

type DashboardOverviewRecord = {
  itemHash: string;
  generatedAt: Date | null;
  payload: StoredOverviewPayload;
};

const memoryOverviewStore = new Map<string, DashboardOverviewRecord>();

export interface DashboardOverviewCacheStore {
  get(args: {
    workspaceId: string;
    userId: string;
    filterKey: string;
    windowKey: typeof OVERVIEW_WINDOW;
  }): Promise<DashboardOverviewRecord | null>;
  save(args: {
    workspaceId: string;
    userId: string;
    filterKey: string;
    windowKey: typeof OVERVIEW_WINDOW;
    itemHash: string;
    generatedAt: Date;
    payload: StoredOverviewPayload;
  }): Promise<void>;
}

type GenerateAiOverview = (args: {
  items: DashboardItem[];
  now: Date;
}) => Promise<StoredOverviewPayload | null>;

type OpenRouterAttemptResult = {
  requestedModel: string;
  responseModel: string | null;
  status: number;
  outputText: string | null;
  finishReason: string | null;
  errorMessage: string | null;
};

const aiOverviewSchema = z.object({
  headline: z.string().min(1).max(120),
  bullets: z.array(z.string().min(1).max(140)).length(3),
});

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return count === 1 ? singular : plural;
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

function buildOverviewStatusText(mode: StoredOverviewPayload["mode"], _model: string | null) {
  if (mode === "ai") {
    return "AI summary generated for the current slice.";
  }

  return "AI summary unavailable right now. Showing direct stats from the current slice.";
}

function formatSourceTypeLabel(sourceType: DashboardItem["sourceType"]) {
  if (sourceType === "rss") {
    return "feed";
  }

  if (sourceType === "x") {
    return "X";
  }

  if (sourceType === "youtube") {
    return "YouTube";
  }

  return "website";
}

function normalizeStoredOverview(payload: unknown): StoredOverviewPayload | null {
  const parsed = z
    .object({
      mode: z.enum(["ai", "fallback"]),
      headline: z.string(),
      bullets: z.array(z.string()),
      itemCount: z.number().int().nonnegative(),
      sourceCount: z.number().int().nonnegative(),
      model: z.string().nullable().optional(),
      statusText: z.string().optional(),
      topTags: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          color: z.string(),
        }),
      ),
    })
    .safeParse(payload);

  if (!parsed.success) {
    return null;
  }

  return {
    ...parsed.data,
    model: parsed.data.model ?? null,
    statusText: parsed.data.statusText ?? buildOverviewStatusText(parsed.data.mode, parsed.data.model ?? null),
  };
}

function isMissingOverviewTableError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return message.includes("dashboard_overviews") && message.includes("does not exist");
}

function isIgnorableOverviewCacheError(error: unknown) {
  if (isMissingOverviewTableError(error)) {
    return true;
  }

  return error instanceof Error && error.message.toLowerCase().includes("dashboard_overviews");
}

function logOverviewCacheWarning(operation: "read" | "write", error: unknown) {
  if (env.NODE_ENV === "test") {
    return;
  }

  console.warn(`Skipping dashboard overview cache ${operation} after a database error.`, error);
}

function toOverviewTagList(items: DashboardItem[]) {
  const tagMap = new Map<string, DashboardOverviewTag & { count: number }>();

  for (const item of items) {
    for (const tag of item.tags) {
      const existing = tagMap.get(tag.id);
      if (existing) {
        existing.count += 1;
      } else {
        tagMap.set(tag.id, {
          id: tag.id,
          name: tag.name,
          color: tag.color,
          count: 1,
        });
      }
    }
  }

  return [...tagMap.values()]
    .sort((left, right) => {
      if (left.count !== right.count) {
        return right.count - left.count;
      }

      return left.name.localeCompare(right.name);
    })
    .slice(0, 3)
    .map(({ count: _count, ...tag }) => tag);
}

function buildOverviewFromPayload(
  payload: StoredOverviewPayload,
  generatedAt: Date | null,
  canRetry: boolean,
): DashboardOverview {
  return {
    ...payload,
    window: OVERVIEW_WINDOW,
    generatedAt,
    canRetry,
  };
}

export function getOverviewCandidates(items: DashboardItem[], now: Date = new Date()) {
  const cutoff = now.getTime() - LAST_24_HOURS_MS;

  return items
    .filter((item) => item.publishedAt.getTime() >= cutoff)
    .sort((left, right) => right.publishedAt.getTime() - left.publishedAt.getTime());
}

function getAiInputItems(items: DashboardItem[]) {
  const seenKeys = new Set<string>();
  const dedupedItems = items.filter((item) => {
    const key = item.canonicalUrl.trim().toLowerCase();
    if (!key || seenKeys.has(key)) {
      return false;
    }

    seenKeys.add(key);
    return true;
  });

  return dedupedItems
    .sort((left, right) => {
      const leftIsLowSignal = Number(isLowSignalOverviewItem(left));
      const rightIsLowSignal = Number(isLowSignalOverviewItem(right));

      if (leftIsLowSignal !== rightIsLowSignal) {
        return leftIsLowSignal - rightIsLowSignal;
      }

      return right.publishedAt.getTime() - left.publishedAt.getTime();
    })
    .slice(0, AI_INPUT_LIMIT);
}

function isLowSignalOverviewItem(item: DashboardItem) {
  const title = item.title.trim();
  const excerpt = item.excerpt.trim();
  const combinedLength = title.length + excerpt.length;

  if (!excerpt && title.startsWith("@")) {
    return true;
  }

  if (!excerpt && /^https?:\/\//i.test(title)) {
    return true;
  }

  if (!excerpt && /^x\.com\//i.test(title)) {
    return true;
  }

  if (title.startsWith("@") && combinedLength < 48) {
    return true;
  }

  if (!excerpt && combinedLength < 18) {
    return true;
  }

  return false;
}

export function buildOverviewItemHash(items: DashboardItem[]) {
  return createHash("sha256")
    .update(
      JSON.stringify(
        items.map((item) => ({
          id: item.id,
          canonicalUrl: item.canonicalUrl,
          title: item.title,
          excerpt: item.excerpt,
          publishedAt: item.publishedAt.toISOString(),
          sourceType: item.sourceType,
          sourceName: item.sourceName,
          tags: item.tags.map((tag) => tag.id).sort(),
        })),
      ),
    )
    .digest("hex");
}

export function buildFallbackOverview(items: DashboardItem[]): StoredOverviewPayload {
  const itemCount = items.length;
  const unreadCount = items.filter((item) => !item.isRead).length;
  const sourceCount = new Set(items.map((item) => item.sourceName)).size;
  const topTags = toOverviewTagList(items);
  const sourceTypeCounts = items.reduce<Record<string, number>>((counts, item) => {
    const key = item.sourceType;
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
  const topSourceTypeEntry = Object.entries(sourceTypeCounts).sort((left, right) => right[1] - left[1])[0];
  const topSourceTypeText = topSourceTypeEntry
    ? `${formatSourceTypeLabel(topSourceTypeEntry[0] as DashboardItem["sourceType"])} leads with ${topSourceTypeEntry[1]} ${pluralize(topSourceTypeEntry[1], "item")}.`
    : "No source type stands out in this slice yet.";
  const tagSummary =
    topTags.length > 0 ? `Top tags: ${topTags.map((tag) => tag.name).join(", ")}.` : "No dominant tags surfaced in this window.";

  return {
    mode: "fallback",
    headline:
      itemCount === 1
        ? "1 fresh signal landed in the last 24h."
        : `${itemCount} fresh signals landed in the last 24h.`,
    bullets: [
      `${sourceCount} ${pluralize(sourceCount, "source")} contributed to this slice.`,
      unreadCount > 0
        ? `${unreadCount} ${pluralize(unreadCount, "item")} still unread in this slice.`
        : "Everything in this slice has already been opened.",
      topTags.length > 0 ? tagSummary : topSourceTypeText,
    ],
    itemCount,
    sourceCount,
    topTags,
    model: null,
    statusText: buildOverviewStatusText("fallback", null),
  };
}

function buildOverviewPrompt(items: DashboardItem[], now: Date) {
  return [
    `Reference time: ${now.toISOString()}`,
    "Summarize only the strongest signals from the last 24 hours.",
    "Ignore repetitive chatter, duplicate discussion, and low-information commentary.",
    "Prioritize concrete product moves, market shifts, design patterns, and implementation-relevant insight.",
    "Return valid JSON only.",
    "Return one concise headline and exactly three bullets.",
    "",
    ...items.map((item, index) => {
      const tags = item.tags.map((tag) => tag.name).join(", ") || "none";
      return `${index + 1}. ${truncateText(item.title, 120)} | source: ${item.sourceName} (${item.sourceType}) | tags: ${tags} | excerpt: ${truncateText(item.excerpt || "No excerpt", EXCERPT_CHAR_LIMIT)}`;
    }),
  ].join("\n");
}

function extractResponseText(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as {
    output_text?: unknown;
    output?: Array<{
      content?: Array<{
        type?: string;
        text?: string;
      }>;
    }>;
  };

  if (typeof record.output_text === "string" && record.output_text.trim().length > 0) {
    return record.output_text;
  }

  const messageText = record.output
    ?.flatMap((entry) => entry.content ?? [])
    .find((content) => content?.type === "output_text" && typeof content.text === "string");

  return messageText?.text ?? null;
}

function extractJsonObjectString(value: string) {
  const firstBrace = value.indexOf("{");
  const lastBrace = value.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }

  return value.slice(firstBrace, lastBrace + 1);
}

function parseOverviewOutput(outputText: string) {
  try {
    return aiOverviewSchema.safeParse(JSON.parse(outputText) as unknown);
  } catch {
    const candidate = extractJsonObjectString(outputText);
    if (!candidate) {
      return null;
    }

    try {
      return aiOverviewSchema.safeParse(JSON.parse(candidate) as unknown);
    } catch {
      return null;
    }
  }
}

async function requestOpenRouterOverview(args: {
  items: DashboardItem[];
  now: Date;
  model: string;
  signal: AbortSignal;
  strategy: "structured" | "plain";
}): Promise<OpenRouterAttemptResult> {
  const wantsStructuredOutput = args.strategy === "structured";
  const systemPrompt = wantsStructuredOutput
    ? "You compress noisy discussion into product-relevant signal. Prefer concrete moves, shifts, patterns, and implementation implications. Ignore repetitive chatter."
    : "You compress noisy discussion into product-relevant signal. Return JSON only with keys headline and bullets. No markdown, no commentary, no code fences.";
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": appConfig.url,
      "X-Title": appConfig.name,
    },
    signal: args.signal,
    body: JSON.stringify({
      model: args.model,
      temperature: 0.2,
      max_tokens: AI_MAX_TOKENS,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: wantsStructuredOutput
            ? buildOverviewPrompt(args.items, args.now)
            : `${buildOverviewPrompt(args.items, args.now)}\n\nReturn a compact JSON object only: {"headline":"...", "bullets":["...","...","..."]}`,
        },
      ],
      response_format: wantsStructuredOutput
        ? {
            type: "json_schema",
            json_schema: {
              name: "dashboard_overview",
              strict: true,
              schema: {
                type: "object",
                additionalProperties: false,
                properties: {
                  headline: {
                    type: "string",
                    minLength: 1,
                    maxLength: 120,
                  },
                  bullets: {
                    type: "array",
                    minItems: 3,
                    maxItems: 3,
                    items: {
                      type: "string",
                      minLength: 1,
                      maxLength: 140,
                    },
                  },
                },
                required: ["headline", "bullets"],
              },
            },
          }
        : undefined,
      plugins: wantsStructuredOutput ? [{ id: "response-healing" }] : undefined,
      provider: wantsStructuredOutput
        ? {
            require_parameters: true,
          }
        : undefined,
    }),
  });

  const payload = (await response.json()) as {
    error?: {
      message?: string;
    };
    model?: string;
    choices?: Array<{
      finish_reason?: string | null;
      error?: {
        message?: string;
      };
      message?: {
        content?: string | Array<{ type?: string; text?: string }>;
      };
    }>;
  };
  const choice = payload.choices?.[0];
  const errorMessage = payload.error?.message ?? choice?.error?.message ?? null;

  if (!response.ok) {
    return {
      requestedModel: args.model,
      responseModel: payload.model ?? null,
      status: response.status,
      outputText: null,
      finishReason: choice?.finish_reason ?? null,
      errorMessage: errorMessage ?? `OpenRouter overview request failed with ${response.status}.`,
    };
  }

  const outputText =
    typeof choice?.message?.content === "string"
      ? choice.message.content
      : Array.isArray(choice?.message?.content)
        ? choice.message.content.map((entry) => (typeof entry.text === "string" ? entry.text : "")).join("")
        : extractResponseText(payload);

  return {
    requestedModel: args.model,
    responseModel: payload.model ?? null,
    status: response.status,
    outputText,
    finishReason: choice?.finish_reason ?? null,
    errorMessage,
  };
}

async function generateOverviewWithOpenRouter(args: {
  items: DashboardItem[];
  now: Date;
}): Promise<StoredOverviewPayload | null> {
  if (!env.OPENROUTER_API_KEY) {
    return null;
  }

  const primaryModel = env.OPENROUTER_PRIMARY_MODEL ?? DEFAULT_PRIMARY_MODEL;
  const fallbackModel = env.OPENROUTER_FALLBACK_MODEL ?? DEFAULT_FALLBACK_MODEL;
  const modelsToTry = [primaryModel, fallbackModel].filter(
    (model, index, models): model is string => Boolean(model) && models.indexOf(model) === index,
  );
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);

  try {
    let lastErrorMessage: string | null = null;

    for (const model of modelsToTry) {
      for (const strategy of ["structured", "plain"] as const) {
        const attempt = await requestOpenRouterOverview({
          items: args.items,
          now: args.now,
          model,
          signal: controller.signal,
          strategy,
        });

        if (attempt.errorMessage) {
          lastErrorMessage = attempt.errorMessage;

          if (attempt.status === 404) {
            break;
          }

          continue;
        }

        if (!attempt.outputText) {
          lastErrorMessage =
            attempt.finishReason === "length"
              ? `${attempt.responseModel ?? attempt.requestedModel} hit the output limit.`
              : `${attempt.responseModel ?? attempt.requestedModel} returned no parsable content.`;
          continue;
        }

        const parsed = parseOverviewOutput(attempt.outputText);
        if (!parsed?.success) {
          lastErrorMessage =
            attempt.finishReason === "length"
              ? `${attempt.responseModel ?? attempt.requestedModel} ran out of output tokens before finishing JSON.`
              : `${attempt.responseModel ?? attempt.requestedModel} returned malformed JSON.`;
          continue;
        }

        const resolvedModel = attempt.responseModel ?? attempt.requestedModel;

        return {
          mode: "ai",
          headline: parsed.data.headline,
          bullets: parsed.data.bullets,
          itemCount: args.items.length,
          sourceCount: new Set(args.items.map((item) => item.sourceName)).size,
          topTags: toOverviewTagList(args.items),
          model: resolvedModel,
          statusText: buildOverviewStatusText("ai", resolvedModel),
        };
      }
    }

    if (env.NODE_ENV !== "test" && lastErrorMessage) {
      console.error("Failed to generate dashboard overview from OpenRouter.", lastErrorMessage);
    }

    return null;
  } catch (error) {
    if (env.NODE_ENV !== "test") {
      console.error("Failed to generate dashboard overview from OpenRouter.", error);
    }

    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export function createDbDashboardOverviewCacheStore(db: DashboardDb): DashboardOverviewCacheStore {
  return {
    async get(args) {
      let record;
      try {
        [record] = await db
          .select()
          .from(dashboardOverviews)
          .where(
            and(
              eq(dashboardOverviews.workspaceId, args.workspaceId),
              eq(dashboardOverviews.userId, args.userId),
              eq(dashboardOverviews.windowKey, args.windowKey),
              eq(dashboardOverviews.filterKey, args.filterKey),
            ),
          )
          .limit(1);
      } catch (error) {
        if (isIgnorableOverviewCacheError(error)) {
          logOverviewCacheWarning("read", error);
          return null;
        }

        throw error;
      }

      if (!record) {
        return null;
      }

      const payload = normalizeStoredOverview(record.payload);
      if (!payload) {
        return null;
      }

      return {
        itemHash: record.itemHash,
        generatedAt: record.generatedAt,
        payload,
      };
    },
    async save(args) {
      try {
        await db
          .insert(dashboardOverviews)
          .values({
            workspaceId: args.workspaceId,
            userId: args.userId,
            windowKey: args.windowKey,
            filterKey: args.filterKey,
            itemHash: args.itemHash,
            mode: args.payload.mode,
            payload: args.payload,
            generatedAt: args.generatedAt,
            updatedAt: args.generatedAt,
          })
          .onConflictDoUpdate({
            target: [
              dashboardOverviews.workspaceId,
              dashboardOverviews.userId,
              dashboardOverviews.windowKey,
              dashboardOverviews.filterKey,
            ],
            set: {
              itemHash: args.itemHash,
              mode: args.payload.mode,
              payload: args.payload,
              generatedAt: args.generatedAt,
              updatedAt: args.generatedAt,
            },
          });
      } catch (error) {
        if (isIgnorableOverviewCacheError(error)) {
          logOverviewCacheWarning("write", error);
          return;
        }

        throw error;
      }
    },
  };
}

export function createMemoryDashboardOverviewCacheStore(): DashboardOverviewCacheStore {
  return {
    async get(args) {
      return memoryOverviewStore.get(`${args.workspaceId}:${args.userId}:${args.windowKey}:${args.filterKey}`) ?? null;
    },
    async save(args) {
      memoryOverviewStore.set(`${args.workspaceId}:${args.userId}:${args.windowKey}:${args.filterKey}`, {
        itemHash: args.itemHash,
        generatedAt: args.generatedAt,
        payload: args.payload,
      });
    },
  };
}

export async function buildDashboardOverview(args: {
  items: DashboardItem[];
  filters: DashboardFilters;
  workspaceId: string;
  userId: string;
  now?: Date;
  force?: boolean;
  cacheStore?: DashboardOverviewCacheStore | null;
  generateAiOverview?: GenerateAiOverview;
}): Promise<DashboardOverview | null> {
  const now = args.now ?? new Date();
  const candidates = getOverviewCandidates(args.items, now);

  if (candidates.length === 0) {
    return null;
  }

  const filterKey = serializeDashboardFilters(args.filters) || "all";
  const itemHash = buildOverviewItemHash(candidates);
  const canRetry = appConfig.hasOpenRouter || typeof args.generateAiOverview === "function";
  const cached = args.cacheStore
    ? await args.cacheStore.get({
        workspaceId: args.workspaceId,
        userId: args.userId,
        filterKey,
        windowKey: OVERVIEW_WINDOW,
      })
    : null;

  if (!args.force && cached) {
    if (cached?.itemHash === itemHash) {
      return buildOverviewFromPayload(cached.payload, cached.generatedAt, canRetry);
    }
  }

  const generateAiOverview = args.generateAiOverview ?? generateOverviewWithOpenRouter;
  const aiOverview = canRetry ? await generateAiOverview({ items: getAiInputItems(candidates), now }) : null;
  const payload = aiOverview
    ? {
        ...aiOverview,
        itemCount: candidates.length,
        sourceCount: new Set(candidates.map((item) => item.sourceName)).size,
        topTags: toOverviewTagList(candidates),
      }
    : cached?.itemHash === itemHash && cached.payload.mode === "ai"
      ? cached.payload
      : buildFallbackOverview(candidates);
  const generatedAt = now;

  if (args.cacheStore) {
    await args.cacheStore.save({
      workspaceId: args.workspaceId,
      userId: args.userId,
      filterKey,
      windowKey: OVERVIEW_WINDOW,
      itemHash,
      generatedAt,
      payload,
    });
  }

  return buildOverviewFromPayload(payload, generatedAt, canRetry);
}
