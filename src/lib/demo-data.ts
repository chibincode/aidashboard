import type {
  AdminSnapshot,
  DashboardFilters,
  DashboardSnapshot,
  UserItemStateRecord,
  ViewerContext,
} from "@/lib/domain";
import { buildDashboardSnapshot } from "@/lib/dashboard";
import {
  defaultWorkspace,
  seedEntities,
  seedFeedItems,
  seedRules,
  seedSources,
  seedTags,
} from "@/lib/seed";

export function buildDemoDashboard(
  viewer: ViewerContext,
  userStates: UserItemStateRecord[],
  filters: DashboardFilters,
): DashboardSnapshot {
  return buildDashboardSnapshot({
    workspace: defaultWorkspace,
    sources: seedSources,
    entities: seedEntities,
    tags: seedTags,
    feedItems: seedFeedItems,
    userStates,
    viewer,
    filters,
  });
}

export function buildDemoAdminSnapshot(): AdminSnapshot {
  return {
    workspace: defaultWorkspace,
    sources: seedSources,
    entities: seedEntities,
    tags: seedTags,
    rules: seedRules,
    feedItems: seedFeedItems,
  };
}

export function readDemoStatesFromCookie(value: string | undefined): UserItemStateRecord[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as UserItemStateRecord[];
    return parsed.map((entry) => ({
      ...entry,
      lastViewedAt: entry.lastViewedAt ? new Date(entry.lastViewedAt) : null,
    }));
  } catch {
    return [];
  }
}

export function serializeDemoStates(states: UserItemStateRecord[]) {
  return JSON.stringify(states);
}

export function upsertDemoState(
  states: UserItemStateRecord[],
  state: UserItemStateRecord,
) {
  const existingIndex = states.findIndex((entry) => entry.feedItemId === state.feedItemId);

  if (existingIndex === -1) {
    return [...states, state];
  }

  return states.map((entry, index) => (index === existingIndex ? state : entry));
}
