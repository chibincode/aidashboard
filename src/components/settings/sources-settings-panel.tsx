"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { sourceTypes, type AdminSnapshot, type SourceRecord, type SourceType } from "@/lib/domain";
import type { SourceMutationState } from "@/lib/source-forms";
import { createEmptySourceFormValues, createSourceMutationState, type SourceFormValues } from "@/lib/source-forms";
import {
  detectSourceTypeFromUrl,
  getDefaultExtractorProfileForType,
  getPriorityLabel,
  priorityLevelToValue,
  priorityValueToLevel,
  recommendSourceNameFromUrl,
  type SourcePriorityLevel,
} from "@/lib/source-form-ui";
import { Badge } from "@/components/ui/badge";
import { Button, FormSubmitButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SettingsModalShell } from "@/components/settings/settings-modal-shell";
import {
  getSourceExtractorProfile,
  isGalleryExtractorProfile,
} from "@/lib/source-normalization";
import { cn, formatRelativeTime } from "@/lib/utils";

type SourceAction = (
  previousState: SourceMutationState,
  formData: FormData,
) => Promise<SourceMutationState>;

const sourceTypeLabels: Record<SourceType, string> = {
  website: "Website",
  rss: "RSS / Atom",
  youtube: "YouTube",
  x: "X",
};

function FieldLabel({
  children,
}: {
  children: React.ReactNode;
}) {
  return <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{children}</span>;
}

function SettingsColumnCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={`rounded-[24px] border-black/8 bg-white p-5 shadow-[0_12px_34px_-30px_rgba(12,23,32,0.3)] ${className ?? ""}`}
    >
      {children}
    </Card>
  );
}

function SourceTypeHint({ type }: { type: SourceFormValues["type"] }) {
  if (type === "youtube") {
    return (
      <p className="text-xs leading-5 text-slate-500">
        Accepts YouTube feed URLs, <code>/channel/UC...</code>, and <code>/@handle</code>.
      </p>
    );
  }

  if (type === "x") {
    return (
      <p className="text-xs leading-5 text-slate-500">
        Accepts X profile URLs like <code>https://x.com/handle</code>. The handle and default RSS bridge are configured automatically.
      </p>
    );
  }

  return null;
}

function ExtractorHint({
  type,
  extractorProfile,
}: {
  type: SourceFormValues["type"];
  extractorProfile: SourceFormValues["extractorProfile"];
}) {
  if (type === "youtube" || type === "x") {
    return null;
  }

  if (type === "website" && extractorProfile === "a1-gallery-home") {
    return (
      <p className="text-xs leading-5 text-slate-500">
        Uses the dedicated A1 Gallery homepage parser. The <code>Website Inspiration</code> tag will be applied automatically.
      </p>
    );
  }

  if (type === "rss" && extractorProfile === "gallery-rss") {
    return (
      <p className="text-xs leading-5 text-slate-500">
        Optimized for gallery-style RSS feeds. Images are extracted automatically and the <code>Website Inspiration</code> tag will be applied.
      </p>
    );
  }

  return null;
}

function getExtractorOptions(type: SourceFormValues["type"]) {
  if (type === "rss") {
    return [
      { value: "generic-rss", label: "Default RSS" },
      { value: "gallery-rss", label: "Gallery RSS" },
    ] as const;
  }

  if (type === "website") {
    return [
      { value: "", label: "Default website scrape" },
      { value: "a1-gallery-home", label: "A1 Gallery homepage" },
    ] as const;
  }

  return [] as const;
}

function FormStatusMessage({ state }: { state: SourceMutationState }) {
  if (!state.message) {
    return null;
  }

  const tone =
    state.status === "success"
      ? "border-emerald-200 bg-emerald-50/80 text-emerald-700"
      : "border-[#fecaca] bg-[#fff1f2] text-[#991b1b]";

  return <div className={`rounded-2xl border px-4 py-3 text-sm ${tone}`}>{state.message}</div>;
}

function DeleteSourceButtons({ disabled, onCancel, pending }: { disabled?: boolean; onCancel: () => void; pending: boolean }) {
  return (
    <>
      <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
        Cancel
      </Button>
      <Button type="submit" variant="danger" disabled={disabled} loading={pending} loadingLabel="Deleting...">
        Delete source
      </Button>
    </>
  );
}

function DeleteSourceForm({
  sourceId,
  canManageSources,
  deleteAction,
  sourceName,
  onClose,
  onSuccess,
}: {
  sourceId: string;
  canManageSources: boolean;
  deleteAction: (formData: FormData) => Promise<void>;
  sourceName: string;
  onClose: () => void;
  onSuccess: (sourceId: string, sourceName: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  return (
    <div className="grid gap-4">
      {errorMessage ? (
        <div className="rounded-2xl border border-[#fecaca] bg-[#fff1f2] px-4 py-3 text-sm text-[#991b1b]">{errorMessage}</div>
      ) : null}

      <form
        action={deleteAction}
        onSubmit={(event) => {
          event.preventDefault();
          setErrorMessage(null);

          const formData = new FormData(event.currentTarget);

          startTransition(async () => {
            try {
              await deleteAction(formData);
              onSuccess(sourceId, sourceName);
            } catch (error) {
              setErrorMessage(error instanceof Error ? error.message : "Could not delete source.");
            }
          });
        }}
        className="flex flex-wrap justify-end gap-2"
      >
        <input type="hidden" name="id" value={sourceId} />
        <DeleteSourceButtons disabled={!canManageSources} onCancel={onClose} pending={isPending} />
      </form>
    </div>
  );
}

function getFormValuesFromSource(source: SourceRecord): SourceFormValues {
  return {
    id: source.id,
    name: source.name,
    type: source.type,
    extractorProfile: getSourceExtractorProfile(source) ?? "",
    url: source.url,
    entityId: source.entityId ?? "",
    priority: String(source.priority),
    refreshMinutes: String(source.refreshMinutes),
    isActive: source.isActive,
    defaultTagIds: source.defaultTagIds,
  };
}

function SourceModal({
  mode,
  source,
  snapshot,
  canManageSources,
  createAction,
  updateAction,
  onClose,
  onSuccess,
}: {
  mode: "create" | "edit" | null;
  source: SourceRecord | null;
  snapshot: AdminSnapshot;
  canManageSources: boolean;
  createAction: SourceAction;
  updateAction: SourceAction;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  if (!mode) {
    return null;
  }

  const isEditMode = mode === "edit";
  const initialValues = isEditMode && source ? getFormValuesFromSource(source) : createEmptySourceFormValues();

  if (isEditMode && !source) {
    return null;
  }

  return (
    <SettingsModalShell
      open
      title={isEditMode ? "Edit source" : "Add source"}
      description={
        isEditMode
          ? "Update the source details, validation rules, and refresh cadence. Initial sync runs after save."
          : "Create a new source. Initial sync runs after save."
      }
      onClose={onClose}
    >
      <SourceEditorForm
        key={`${mode}-${initialValues.id || "new"}`}
        action={isEditMode ? updateAction : createAction}
        snapshot={snapshot}
        canManageSources={canManageSources}
        initialValues={initialValues}
        submitLabel={isEditMode ? "Save changes" : "Add source"}
        pendingLabel={isEditMode ? "Saving changes..." : "Adding source..."}
        submitVariant={isEditMode ? "secondary" : "primary"}
        onCancel={onClose}
        onSuccess={onSuccess}
      />
    </SettingsModalShell>
  );
}

function DeleteSourceModal({
  source,
  canManageSources,
  deleteAction,
  onClose,
  onSuccess,
}: {
  source: SourceRecord | null;
  canManageSources: boolean;
  deleteAction: (formData: FormData) => Promise<void>;
  onClose: () => void;
  onSuccess: (sourceId: string, sourceName: string) => void;
}) {
  return (
    <SettingsModalShell
      open={Boolean(source)}
      title="Delete source"
      description="This removes the source permanently and stops all future sync attempts."
      onClose={onClose}
      widthClassName="md:max-w-[560px]"
    >
      {source ? (
        <div className="grid gap-5">
          <div className="rounded-[22px] border border-[#fecaca] bg-[#fff1f2] px-4 py-4 text-sm leading-6 text-[#991b1b]">
            <p className="font-semibold text-[#7f1d1d]">Delete {source.name}?</p>
            <p className="mt-1">
              This action cannot be undone. The source will be removed from settings and no longer ingested.
            </p>
          </div>

          <div className="rounded-[22px] border border-black/8 bg-white px-4 py-4">
            <p className="text-sm font-semibold text-slate-950">{source.name}</p>
            <a
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block break-all text-sm text-slate-500 underline decoration-slate-300 underline-offset-2 transition hover:text-slate-700 hover:decoration-slate-500 focus:outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]/35"
            >
              {source.url}
            </a>
          </div>

          <DeleteSourceForm
            sourceId={source.id}
            canManageSources={canManageSources}
            deleteAction={deleteAction}
            sourceName={source.name}
            onClose={onClose}
            onSuccess={onSuccess}
          />
        </div>
      ) : null}
    </SettingsModalShell>
  );
}

function SourceEditorFields({
  state,
  values,
  snapshot,
  canManageSources,
  submitLabel,
  pendingLabel,
  submitVariant,
  isPending,
  onCancel,
}: {
  state: SourceMutationState;
  values: SourceFormValues;
  snapshot: AdminSnapshot;
  canManageSources: boolean;
  submitLabel: string;
  pendingLabel: string;
  submitVariant: "primary" | "secondary";
  isPending: boolean;
  onCancel?: () => void;
}) {
  const initialDetectedType = detectSourceTypeFromUrl(values.url);
  const initialType = initialDetectedType ?? values.type;
  const [urlValue, setUrlValue] = useState(values.url);
  const [nameValue, setNameValue] = useState(values.name);
  const [selectedType, setSelectedType] = useState<SourceFormValues["type"]>(initialType);
  const [selectedExtractorProfile, setSelectedExtractorProfile] = useState<SourceFormValues["extractorProfile"]>(
    initialType === "rss"
      ? (values.extractorProfile || getDefaultExtractorProfileForType("rss"))
      : initialDetectedType
        ? getDefaultExtractorProfileForType(initialDetectedType)
        : values.extractorProfile,
  );
  const [priorityLevel, setPriorityLevel] = useState<SourcePriorityLevel>(priorityValueToLevel(values.priority));
  const lastSuggestedNameRef = useRef(values.id ? "" : recommendSourceNameFromUrl(values.url));
  const detectedType = detectSourceTypeFromUrl(urlValue);
  const isTypeLocked = detectedType === "x" || detectedType === "youtube";

  function handleTypeChange(nextType: SourceFormValues["type"]) {
    setSelectedType(nextType);
    setSelectedExtractorProfile(getDefaultExtractorProfileForType(nextType));
  }

  function handleUrlChange(nextUrl: string) {
    setUrlValue(nextUrl);

    const nextSuggestedName = recommendSourceNameFromUrl(nextUrl);
    setNameValue((currentName) => {
      const shouldAutoUpdate = currentName.trim() === "" || currentName === lastSuggestedNameRef.current;
      lastSuggestedNameRef.current = nextSuggestedName;
      return shouldAutoUpdate ? nextSuggestedName : currentName;
    });

    const nextDetectedType = detectSourceTypeFromUrl(nextUrl);
    if (!nextDetectedType) {
      return;
    }

    setSelectedType(nextDetectedType);
    setSelectedExtractorProfile(getDefaultExtractorProfileForType(nextDetectedType));
  }

  return (
    <>
      <input type="hidden" name="id" value={values.id} />
      <input type="hidden" name="priority" value={priorityLevelToValue(priorityLevel)} />
      {isTypeLocked ? <input type="hidden" name="type" value={selectedType} /> : null}

      <label className="grid gap-1.5">
        <FieldLabel>URL</FieldLabel>
        <Input
          aria-label="URL"
          name="url"
          placeholder="https://..."
          value={urlValue}
          onChange={(event) => handleUrlChange(event.currentTarget.value)}
          disabled={!canManageSources || isPending}
          required
        />
        <SourceTypeHint type={selectedType} />
        {state.fieldErrors.url ? <p className="text-xs text-[#991b1b]">{state.fieldErrors.url}</p> : null}
      </label>

      <label className="grid gap-1.5">
        <FieldLabel>Name</FieldLabel>
        <Input
          aria-label="Name"
          name="name"
          placeholder="NavPro release notes"
          value={nameValue}
          onChange={(event) => setNameValue(event.currentTarget.value)}
          disabled={!canManageSources || isPending}
          required
        />
        {state.fieldErrors.name ? <p className="text-xs text-[#991b1b]">{state.fieldErrors.name}</p> : null}
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1.5">
          <FieldLabel>Type</FieldLabel>
          <Select
            name="type"
            aria-label="Type"
            value={selectedType}
            disabled={!canManageSources || isPending || isTypeLocked}
            onChange={(event) => {
              const nextType = event.currentTarget.value as SourceFormValues["type"];
              handleTypeChange(nextType);
            }}
          >
            <option value="website">Website</option>
            <option value="rss">RSS / Atom</option>
            <option value="youtube">YouTube</option>
            <option value="x">X</option>
          </Select>
          {isTypeLocked ? <p className="text-xs leading-5 text-slate-500">Detected from URL</p> : null}
        </label>
        <label className="grid gap-1.5">
          <FieldLabel>Entity</FieldLabel>
          <Select aria-label="Entity" name="entityId" defaultValue={values.entityId} disabled={!canManageSources || isPending}>
            <option value="">Unassigned</option>
            {snapshot.entities.map((entity) => (
              <option key={entity.id} value={entity.id}>
                {entity.name}
              </option>
            ))}
          </Select>
        </label>
      </div>

      {getExtractorOptions(selectedType).length > 0 ? (
        <label className="grid gap-1.5">
          <FieldLabel>Extractor</FieldLabel>
          <Select
            aria-label="Extractor"
            name="extractorProfile"
            value={selectedExtractorProfile}
            disabled={!canManageSources || isPending}
            onChange={(event) => setSelectedExtractorProfile(event.currentTarget.value as SourceFormValues["extractorProfile"])}
          >
            {getExtractorOptions(selectedType).map((option) => (
              <option key={option.value || "default"} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <ExtractorHint type={selectedType} extractorProfile={selectedExtractorProfile} />
        </label>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1.5">
          <FieldLabel>Priority</FieldLabel>
          <Select
            aria-label="Priority"
            value={priorityLevel}
            disabled={!canManageSources || isPending}
            onChange={(event) => setPriorityLevel(event.currentTarget.value as SourcePriorityLevel)}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </Select>
        </label>
        <label className="grid gap-1.5">
          <FieldLabel>Refresh</FieldLabel>
          <Input
            name="refreshMinutes"
            type="number"
            min={15}
            max={240}
            defaultValue={values.refreshMinutes}
            disabled={!canManageSources || isPending}
          />
        </label>
      </div>

      <div className="grid gap-2">
        <FieldLabel>Default Tags</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {snapshot.tags.map((tag) => (
            <label key={tag.id} className="flex items-center gap-2 rounded-full bg-black/[0.04] px-3 py-2 text-xs text-slate-700">
              <input
                type="checkbox"
                name="defaultTagIds"
                value={tag.id}
                defaultChecked={values.defaultTagIds.includes(tag.id)}
                disabled={!canManageSources || isPending}
              />
              {tag.name}
            </label>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" name="isActive" defaultChecked={values.isActive} disabled={!canManageSources || isPending} />
        Enable immediately
      </label>

      <FormStatusMessage state={state} />

      <div className="flex flex-wrap gap-2">
        <FormSubmitButton
          loadingLabel={pendingLabel}
          variant={submitVariant}
          disabled={!canManageSources}
        >
          {submitLabel}
        </FormSubmitButton>
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
        ) : null}
      </div>
    </>
  );
}

function SourceEditorForm({
  action,
  snapshot,
  canManageSources,
  initialValues,
  submitLabel,
  pendingLabel,
  submitVariant = "primary",
  onCancel,
  onSuccess,
}: {
  action: SourceAction;
  snapshot: AdminSnapshot;
  canManageSources: boolean;
  initialValues: SourceFormValues;
  submitLabel: string;
  pendingLabel: string;
  submitVariant?: "primary" | "secondary";
  onCancel?: () => void;
  onSuccess?: (message: string) => void;
}) {
  const [state, formAction, isPending] = useActionState(action, createSourceMutationState(initialValues));
  const resolvedValues = state.status === "error" ? state.values : initialValues;

  useEffect(() => {
    if (state.status === "success" && state.message) {
      onSuccess?.(state.message);
    }
  }, [onSuccess, state.message, state.status]);

  return (
    <form action={formAction} className="grid gap-4">
      <SourceEditorFields
        key={`${initialValues.id || "new"}-${state.nonce}-${state.status}`}
        state={state}
        values={resolvedValues}
        snapshot={snapshot}
        canManageSources={canManageSources}
        submitLabel={submitLabel}
        pendingLabel={pendingLabel}
        submitVariant={submitVariant}
        isPending={isPending}
        onCancel={onCancel}
      />
    </form>
  );
}

function SourceListItem({
  source,
  snapshot,
  canManageSources,
  onEdit,
  onDelete,
  toggleAction,
}: {
  source: SourceRecord;
  snapshot: AdminSnapshot;
  canManageSources: boolean;
  onEdit: () => void;
  onDelete: () => void;
  toggleAction: (formData: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<"toggle" | null>(null);
  const [isPending, startTransition] = useTransition();
  const rowDisabled = !canManageSources || isPending;

  return (
    <SettingsColumnCard>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={source.isActive ? "accent" : "muted"}>{source.isActive ? "active" : "paused"}</Badge>
            <Badge tone={source.healthStatus === "healthy" ? "muted" : "danger"}>{source.healthStatus}</Badge>
            <Badge tone="muted">{source.type}</Badge>
            {isGalleryExtractorProfile(getSourceExtractorProfile(source)) ? (
              <Badge tone="muted">website inspiration</Badge>
            ) : null}
          </div>
          <h4 className="mt-3 text-lg font-semibold tracking-tight text-slate-950">{source.name}</h4>
          <a
            href={source.url}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-block break-all text-sm text-slate-500 underline decoration-slate-300 underline-offset-2 transition hover:text-slate-700 hover:decoration-slate-500 focus:outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]/35"
          >
            {source.url}
          </a>
          <div className="mt-3 flex flex-wrap gap-2">
            {source.defaultTagIds.map((tagId) => {
              const tag = snapshot.tags.find((entry) => entry.id === tagId);
              return tag ? (
                <Badge key={tag.id} tone="muted">
                  {tag.name}
                </Badge>
              ) : null;
            })}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Priority {getPriorityLabel(priorityValueToLevel(source.priority))} · every {source.refreshMinutes} min ·{" "}
            {source.lastFetchedAt ? `validated ${formatRelativeTime(source.lastFetchedAt)}` : "not validated yet"}
          </p>
          {source.lastErrorMessage ? <p className="mt-2 text-sm text-[#991b1b]">{source.lastErrorMessage}</p> : null}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Button type="button" variant="ghost" disabled={rowDisabled} onClick={onEdit}>
            Edit
          </Button>
          <form
            action={toggleAction}
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              setPendingAction("toggle");
              startTransition(async () => {
                try {
                  await toggleAction(formData);
                  router.refresh();
                } finally {
                  setPendingAction(null);
                }
              });
            }}
          >
            <input type="hidden" name="id" value={source.id} />
            <input type="hidden" name="isActive" value={String(!source.isActive)} />
            <Button
              type="submit"
              variant="secondary"
              disabled={rowDisabled}
              loading={pendingAction === "toggle"}
              loadingLabel={source.isActive ? "Pausing..." : "Enabling..."}
            >
              {source.isActive ? "Pause" : "Enable"}
            </Button>
          </form>
          <Button type="button" variant="danger" disabled={rowDisabled} onClick={onDelete}>
            Delete
          </Button>
        </div>
      </div>
    </SettingsColumnCard>
  );
}

export function SourcesSettingsPanel({
  snapshot,
  canManageSources,
  isDemoMode,
  createAction,
  updateAction,
  toggleAction,
  deleteAction,
}: {
  snapshot: AdminSnapshot;
  canManageSources: boolean;
  isDemoMode: boolean;
  createAction: SourceAction;
  updateAction: SourceAction;
  toggleAction: (formData: FormData) => Promise<void>;
  deleteAction: (formData: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [activeSourceId, setActiveSourceId] = useState<string | null>(null);
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null);
  const [deletedSourceIds, setDeletedSourceIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTypeFilter, setActiveTypeFilter] = useState<SourceType | "all">("all");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [, startRefreshTransition] = useTransition();
  const visibleSources = snapshot.sources.filter((source) => !deletedSourceIds.includes(source.id));
  const activeSource = activeSourceId ? visibleSources.find((source) => source.id === activeSourceId) ?? null : null;
  const deleteCandidate = deleteCandidateId ? visibleSources.find((source) => source.id === deleteCandidateId) ?? null : null;
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredSources = visibleSources.filter((source) => {
    if (activeTypeFilter !== "all" && source.type !== activeTypeFilter) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const entityName = snapshot.entities.find((entity) => entity.id === source.entityId)?.name ?? "";
    const tagNames = source.defaultTagIds
      .map((tagId) => snapshot.tags.find((tag) => tag.id === tagId)?.name ?? "")
      .join(" ");
    const haystack = [source.name, source.url, source.type, entityName, tagNames, source.lastErrorMessage ?? ""]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });

  function openCreateModal() {
    setActiveSourceId(null);
    setModalMode("create");
  }

  function openEditModal(sourceId: string) {
    setActiveSourceId(sourceId);
    setModalMode("edit");
  }

  function closeSourceModal() {
    setModalMode(null);
    setActiveSourceId(null);
  }

  function handleSourceSaveSuccess(message: string) {
    closeSourceModal();
    setStatusMessage(message);
    startRefreshTransition(() => {
      router.refresh();
    });
  }

  function handleSourceDeleteSuccess(sourceId: string, sourceName: string) {
    setDeleteCandidateId(null);
    setDeletedSourceIds((currentIds) => (currentIds.includes(sourceId) ? currentIds : [...currentIds, sourceId]));
    setStatusMessage(`Source deleted: ${sourceName}.`);
    startRefreshTransition(() => {
      router.refresh();
    });
  }

  useEffect(() => {
    if (!statusMessage) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setStatusMessage((currentMessage) => (currentMessage === statusMessage ? null : currentMessage));
    }, 4000);

    return () => window.clearTimeout(timeout);
  }, [statusMessage]);

  return (
    <>
      <div className="grid gap-4">
        {statusMessage ? (
          <div className="rounded-[20px] border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-700">
            {statusMessage}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <label className="block">
              <span className="sr-only">Search sources</span>
              <Input
                aria-label="Search sources"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.currentTarget.value)}
                placeholder="Search by source, URL, entity, or tag"
              />
            </label>
          </div>
          <Button type="button" variant="primary" disabled={!canManageSources} onClick={openCreateModal}>
            Add source
          </Button>
        </div>

        {isDemoMode ? (
          <div className="rounded-[20px] border border-dashed border-black/10 bg-black/[0.015] px-4 py-3 text-xs leading-6 text-slate-500">
            Source management is read-only until <code>DATABASE_URL</code> is configured.
          </div>
        ) : null}

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveTypeFilter("all")}
              className={cn(
                "rounded-full px-3 py-2 text-sm font-semibold transition",
                activeTypeFilter === "all"
                  ? "bg-slate-950 text-white"
                  : "bg-white text-slate-600 ring-1 ring-black/8 hover:text-slate-950",
              )}
            >
              All
            </button>
            {sourceTypes.map((sourceType) => (
              <button
                key={sourceType}
                type="button"
                onClick={() => setActiveTypeFilter(sourceType)}
                className={cn(
                  "rounded-full px-3 py-2 text-sm font-semibold transition",
                  activeTypeFilter === sourceType
                    ? "bg-slate-950 text-white"
                    : "bg-white text-slate-600 ring-1 ring-black/8 hover:text-slate-950",
                )}
              >
                {sourceTypeLabels[sourceType]}
              </button>
            ))}
          </div>
          <p className="text-sm text-slate-500">
            {filteredSources.length} of {visibleSources.length} sources
          </p>
        </div>

        <div className="grid gap-3">
          {filteredSources.length > 0 ? (
            filteredSources.map((source) => (
              <SourceListItem
                key={source.id}
                source={source}
                snapshot={snapshot}
                canManageSources={canManageSources}
                onEdit={() => openEditModal(source.id)}
                onDelete={() => setDeleteCandidateId(source.id)}
                toggleAction={toggleAction}
              />
            ))
          ) : (
            <SettingsColumnCard className="p-8">
              <div className="text-center">
                <p className="text-base font-semibold text-slate-950">No sources match this filter</p>
                <p className="mt-2 text-sm text-slate-500">Try another keyword or switch back to a broader category.</p>
              </div>
            </SettingsColumnCard>
          )}
        </div>
      </div>
      <SourceModal
        mode={modalMode}
        source={modalMode === "edit" ? activeSource : null}
        snapshot={snapshot}
        canManageSources={canManageSources}
        createAction={createAction}
        updateAction={updateAction}
        onClose={closeSourceModal}
        onSuccess={handleSourceSaveSuccess}
      />
      <DeleteSourceModal
        source={deleteCandidate}
        canManageSources={canManageSources}
        deleteAction={deleteAction}
        onClose={() => setDeleteCandidateId(null)}
        onSuccess={handleSourceDeleteSuccess}
      />
    </>
  );
}
