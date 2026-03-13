"use client";

import { X } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { createPortal } from "react-dom";
import { sourceTypes, type AdminSnapshot, type SourceRecord, type SourceType } from "@/lib/domain";
import type { SourceMutationState } from "@/lib/source-forms";
import { createEmptySourceFormValues, createSourceMutationState, type SourceFormValues } from "@/lib/source-forms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
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

function SourceSubmitButton({
  idleLabel,
  pendingLabel,
  variant,
  disabled,
}: {
  idleLabel: string;
  pendingLabel: string;
  variant: "primary" | "secondary";
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant={variant} disabled={pending || disabled}>
      {pending ? pendingLabel : idleLabel}
    </Button>
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

function ModalShell({
  open,
  title,
  description,
  onClose,
  children,
  widthClassName = "md:max-w-[720px]",
}: {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
  children: React.ReactNode;
  widthClassName?: string;
}) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      onClose();
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [onClose, open]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[70] overflow-y-auto" aria-hidden={!open}>
      <div className="fixed inset-0 bg-[rgba(15,23,42,0.2)] backdrop-blur-sm" onClick={onClose} />

      <div className="relative flex min-h-full w-full items-end justify-center p-0 md:items-start md:p-8">
        <section
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className={`flex w-full flex-col overflow-hidden rounded-t-[30px] bg-[#f8f9fb] shadow-[0_36px_90px_-48px_rgba(15,23,42,0.55)] md:my-8 md:max-h-[calc(100vh-64px)] md:rounded-[30px] md:border md:border-black/8 ${widthClassName}`}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4 border-b border-black/6 px-5 py-4">
            <div>
              <h3 className="text-lg font-semibold tracking-tight text-slate-950">{title}</h3>
              <p className="mt-1 text-sm text-slate-500">{description}</p>
            </div>
            <Button type="button" variant="ghost" size="sm" aria-label={`Close ${title}`} onClick={onClose}>
              <X className="size-4" />
            </Button>
          </div>
          <div className="overflow-y-auto p-5">{children}</div>
        </section>
      </div>
    </div>,
    document.body,
  );
}

function SourceModal({
  mode,
  source,
  snapshot,
  canManageSources,
  createAction,
  updateAction,
  onClose,
}: {
  mode: "create" | "edit" | null;
  source: SourceRecord | null;
  snapshot: AdminSnapshot;
  canManageSources: boolean;
  createAction: SourceAction;
  updateAction: SourceAction;
  onClose: () => void;
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
    <ModalShell
      open
      title={isEditMode ? "Edit source" : "Add source"}
      description={
        isEditMode
          ? "Update the source details, validation rules, and refresh cadence."
          : "Create a new source and validate it immediately."
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
        onSuccess={onClose}
      />
    </ModalShell>
  );
}

function DeleteSourceModal({
  source,
  canManageSources,
  deleteAction,
  onClose,
}: {
  source: SourceRecord | null;
  canManageSources: boolean;
  deleteAction: (formData: FormData) => Promise<void>;
  onClose: () => void;
}) {
  return (
    <ModalShell
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
            <p className="mt-1 break-all text-sm text-slate-500">{source.url}</p>
          </div>

          <form action={deleteAction} onSubmit={onClose} className="flex flex-wrap justify-end gap-2">
            <input type="hidden" name="id" value={source.id} />
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" disabled={!canManageSources}>
              Delete source
            </Button>
          </form>
        </div>
      ) : null}
    </ModalShell>
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
  onSuccess?: () => void;
}) {
  const [state, formAction] = useActionState(action, createSourceMutationState(initialValues));
  const resolvedValues = state.status === "error" ? state.values : initialValues;
  const [selectedType, setSelectedType] = useState<SourceFormValues["type"]>(resolvedValues.type);
  const [selectedExtractorProfile, setSelectedExtractorProfile] = useState<SourceFormValues["extractorProfile"]>(
    resolvedValues.extractorProfile,
  );

  useEffect(() => {
    if (state.status === "success") {
      onSuccess?.();
    }
  }, [onSuccess, state.status]);

  return (
    <form
      key={`${initialValues.id || "new"}-${state.nonce}-${state.status}`}
      action={formAction}
      className="grid gap-4"
    >
      <input type="hidden" name="id" value={resolvedValues.id} />

      <div className="grid gap-1.5">
        <FieldLabel>Name</FieldLabel>
        <Input name="name" placeholder="NavPro release notes" defaultValue={resolvedValues.name} disabled={!canManageSources} required />
        {state.fieldErrors.name ? <p className="text-xs text-[#991b1b]">{state.fieldErrors.name}</p> : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1.5">
          <FieldLabel>Type</FieldLabel>
          <Select
            name="type"
            defaultValue={resolvedValues.type}
            disabled={!canManageSources}
            onChange={(event) => {
              const nextType = event.currentTarget.value as SourceFormValues["type"];
              setSelectedType(nextType);
              setSelectedExtractorProfile(nextType === "rss" ? "generic-rss" : "");
            }}
          >
            <option value="website">Website</option>
            <option value="rss">RSS / Atom</option>
            <option value="youtube">YouTube</option>
            <option value="x">X</option>
          </Select>
        </label>
        <label className="grid gap-1.5">
          <FieldLabel>Entity</FieldLabel>
          <Select name="entityId" defaultValue={resolvedValues.entityId} disabled={!canManageSources}>
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
            name="extractorProfile"
            value={selectedExtractorProfile}
            disabled={!canManageSources}
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

      <div className="grid gap-1.5">
        <FieldLabel>URL</FieldLabel>
        <Input name="url" placeholder="https://..." defaultValue={resolvedValues.url} disabled={!canManageSources} required />
        <SourceTypeHint type={selectedType} />
        {state.fieldErrors.url ? <p className="text-xs text-[#991b1b]">{state.fieldErrors.url}</p> : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1.5">
          <FieldLabel>Priority</FieldLabel>
          <Input name="priority" type="number" min={0} max={100} defaultValue={resolvedValues.priority} disabled={!canManageSources} />
        </label>
        <label className="grid gap-1.5">
          <FieldLabel>Refresh</FieldLabel>
          <Input
            name="refreshMinutes"
            type="number"
            min={15}
            max={240}
            defaultValue={resolvedValues.refreshMinutes}
            disabled={!canManageSources}
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
                defaultChecked={resolvedValues.defaultTagIds.includes(tag.id)}
                disabled={!canManageSources}
              />
              {tag.name}
            </label>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" name="isActive" defaultChecked={resolvedValues.isActive} disabled={!canManageSources} />
        Enable immediately
      </label>

      <FormStatusMessage state={state} />

      <div className="flex flex-wrap gap-2">
        <SourceSubmitButton
          idleLabel={submitLabel}
          pendingLabel={pendingLabel}
          variant={submitVariant}
          disabled={!canManageSources}
        />
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
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
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [activeSourceId, setActiveSourceId] = useState<string | null>(null);
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTypeFilter, setActiveTypeFilter] = useState<SourceType | "all">("all");
  const activeSource = activeSourceId ? snapshot.sources.find((source) => source.id === activeSourceId) ?? null : null;
  const deleteCandidate = deleteCandidateId
    ? snapshot.sources.find((source) => source.id === deleteCandidateId) ?? null
    : null;
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredSources = snapshot.sources.filter((source) => {
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

  return (
    <>
      <div className="grid gap-4">
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
            {filteredSources.length} of {snapshot.sources.length} sources
          </p>
        </div>

        <div className="grid gap-3">
          {filteredSources.length > 0 ? (
            filteredSources.map((source) => (
              <SettingsColumnCard key={source.id}>
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
                    <p className="mt-1 break-all text-sm text-slate-500">{source.url}</p>
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
                      Priority {source.priority} · every {source.refreshMinutes} min ·{" "}
                      {source.lastFetchedAt ? `validated ${formatRelativeTime(source.lastFetchedAt)}` : "not validated yet"}
                    </p>
                    {source.lastErrorMessage ? <p className="mt-2 text-sm text-[#991b1b]">{source.lastErrorMessage}</p> : null}
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button type="button" variant="ghost" disabled={!canManageSources} onClick={() => openEditModal(source.id)}>
                      Edit
                    </Button>
                    <form action={toggleAction}>
                      <input type="hidden" name="id" value={source.id} />
                      <input type="hidden" name="isActive" value={String(!source.isActive)} />
                      <Button type="submit" variant="secondary" disabled={!canManageSources}>
                        {source.isActive ? "Pause" : "Enable"}
                      </Button>
                    </form>
                    <Button
                      type="button"
                      variant="danger"
                      disabled={!canManageSources}
                      onClick={() => setDeleteCandidateId(source.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </SettingsColumnCard>
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
      />
      <DeleteSourceModal
        source={deleteCandidate}
        canManageSources={canManageSources}
        deleteAction={deleteAction}
        onClose={() => setDeleteCandidateId(null)}
      />
    </>
  );
}
