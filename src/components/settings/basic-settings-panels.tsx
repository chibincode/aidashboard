"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { DeleteConfirmModal } from "@/components/settings/delete-confirm-modal";
import { SettingsModalShell } from "@/components/settings/settings-modal-shell";
import { Badge } from "@/components/ui/badge";
import { Button, FormSubmitButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AdminSnapshot, EntityRecord, TagRecord, TagRuleRecord } from "@/lib/domain";

type FormAction = (formData: FormData) => Promise<void>;
type DataChangeHandler = () => void | Promise<void>;

type EntityFormValues = {
  id: string;
  name: string;
  kind: EntityRecord["kind"];
  description: string;
  color: string;
};

type TagFormValues = {
  id: string;
  name: string;
  parentId: string;
  color: string;
  isActive: boolean;
};

function createEmptyEntityFormValues(): EntityFormValues {
  return {
    id: "",
    name: "",
    kind: "competitor",
    description: "",
    color: "#197d71",
  };
}

function getEntityFormValues(entity: EntityRecord | null): EntityFormValues {
  if (!entity) {
    return createEmptyEntityFormValues();
  }

  return {
    id: entity.id,
    name: entity.name,
    kind: entity.kind,
    description: entity.description,
    color: entity.color,
  };
}

function createEmptyTagFormValues(): TagFormValues {
  return {
    id: "",
    name: "",
    parentId: "",
    color: "#197d71",
    isActive: true,
  };
}

function getTagFormValues(tag: TagRecord | null): TagFormValues {
  if (!tag) {
    return createEmptyTagFormValues();
  }

  return {
    id: tag.id,
    name: tag.name,
    parentId: tag.parentId ?? "",
    color: tag.color,
    isActive: tag.isActive,
  };
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

function FieldLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <span className={`text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 ${className ?? ""}`}>{children}</span>;
}

function StatusMessage({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }

  return (
    <div className="rounded-[20px] border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-700">
      {message}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <Card className="rounded-[24px] border border-dashed border-black/10 bg-black/[0.015] p-6 text-sm text-slate-500 shadow-none">
      {message}
    </Card>
  );
}

function useSettingsFeedback(onDataChange?: DataChangeHandler) {
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [, startRefreshTransition] = useTransition();

  useEffect(() => {
    if (!statusMessage) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setStatusMessage((currentMessage) => (currentMessage === statusMessage ? null : currentMessage));
    }, 4000);

    return () => window.clearTimeout(timeout);
  }, [statusMessage]);

  function reportStatus(message: string) {
    setStatusMessage(message);
    if (onDataChange) {
      startRefreshTransition(() => {
        void onDataChange();
      });
    }
  }

  return {
    statusMessage,
    reportStatus,
  };
}

function EntitySummary({ entity }: { entity: EntityRecord }) {
  return (
    <>
      <div className="flex items-center gap-2">
        <Badge tone="muted">{entity.kind}</Badge>
        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: entity.color }} />
      </div>
      <p className="mt-3 text-sm font-semibold text-slate-950">{entity.name}</p>
      <p className="mt-1 text-sm text-slate-500">{entity.description || "No description"}</p>
      <p className="mt-3 text-xs uppercase tracking-[0.16em] text-slate-400">{entity.slug}</p>
    </>
  );
}

function TagSummary({ tag, parent }: { tag: TagRecord; parent: TagRecord | null }) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={tag.isActive ? "accent" : "muted"}>{tag.isActive ? "active" : "paused"}</Badge>
        {parent ? <Badge tone="muted">{parent.name}</Badge> : null}
      </div>
      <p className="mt-3 text-sm font-semibold text-slate-950">{tag.name}</p>
      <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: tag.color }} />
        {tag.slug}
      </div>
    </>
  );
}

function RuleSummary({
  rule,
  snapshot,
}: {
  rule: TagRuleRecord;
  snapshot: AdminSnapshot;
}) {
  const sourceName = snapshot.sources.find((source) => source.id === rule.sourceId)?.name;
  const tagNames = rule.actions.tagIds
    .map((tagId) => snapshot.tags.find((tag) => tag.id === tagId)?.name)
    .filter((name): name is string => Boolean(name));

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={rule.isActive ? "accent" : "muted"}>{rule.isActive ? "active" : "paused"}</Badge>
        <Badge tone="muted">priority {rule.priority}</Badge>
        {sourceName ? <Badge tone="muted">{sourceName}</Badge> : null}
      </div>
      <p className="mt-3 text-sm font-semibold text-slate-950">{rule.name}</p>
      <p className="mt-1 text-sm text-slate-500">
        Keywords: {(rule.conditions.keywords ?? []).join(", ") || "none"} · URL: {(rule.conditions.urlContains ?? []).join(", ") || "none"}
      </p>
      {tagNames.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {tagNames.map((name) => (
            <Badge key={name} tone="muted">
              {name}
            </Badge>
          ))}
        </div>
      ) : null}
    </>
  );
}

function EntityEditorForm({
  action,
  initialValues,
  canManageEntities,
  submitLabel,
  pendingLabel,
  onCancel,
  onSuccess,
}: {
  action: FormAction;
  initialValues: EntityFormValues;
  canManageEntities: boolean;
  submitLabel: string;
  pendingLabel: string;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setErrorMessage(null);

        const formData = new FormData(event.currentTarget);

        startTransition(async () => {
          try {
            await action(formData);
            onSuccess();
          } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : "Could not save entity.");
          }
        });
      }}
      className="grid gap-4"
    >
      <input type="hidden" name="id" value={initialValues.id} />

      <div className="grid gap-1.5">
        <FieldLabel>Name</FieldLabel>
        <Input
          name="name"
          aria-label="Name"
          placeholder="Company or topic name"
          defaultValue={initialValues.name}
          disabled={!canManageEntities || isPending}
          required
        />
      </div>

      <label className="grid gap-1.5">
        <FieldLabel>Kind</FieldLabel>
        <Select name="kind" aria-label="Kind" defaultValue={initialValues.kind} disabled={!canManageEntities || isPending}>
          <option value="topic">Topic</option>
          <option value="competitor">Competitor</option>
          <option value="product">Product</option>
        </Select>
      </label>

      <label className="grid gap-1.5">
        <FieldLabel>Description</FieldLabel>
        <Textarea
          name="description"
          aria-label="Description"
          placeholder="What do you want to track here?"
          defaultValue={initialValues.description}
          disabled={!canManageEntities || isPending}
        />
      </label>

      <label className="grid gap-1.5">
        <FieldLabel>Accent</FieldLabel>
        <Input
          name="color"
          aria-label="Accent"
          type="color"
          defaultValue={initialValues.color}
          disabled={!canManageEntities || isPending}
        />
      </label>

      {errorMessage ? (
        <div className="rounded-2xl border border-[#fecaca] bg-[#fff1f2] px-4 py-3 text-sm text-[#991b1b]">{errorMessage}</div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={!canManageEntities} loading={isPending} loadingLabel={pendingLabel}>
          {submitLabel}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function EntityModal({
  mode,
  entity,
  canManageEntities,
  createAction,
  updateAction,
  onClose,
  onSuccess,
}: {
  mode: "create" | "edit" | null;
  entity: EntityRecord | null;
  canManageEntities: boolean;
  createAction: FormAction;
  updateAction: FormAction;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  if (!mode) {
    return null;
  }

  const isEditMode = mode === "edit";

  if (isEditMode && !entity) {
    return null;
  }

  const initialValues = getEntityFormValues(entity);

  return (
    <SettingsModalShell
      open
      title={isEditMode ? "Edit entity" : "Add entity"}
      description="Track companies, products, and topics from one place."
      onClose={onClose}
      widthClassName="md:max-w-[720px]"
    >
      <EntityEditorForm
        key={`${mode}-${initialValues.id || "new"}`}
        action={isEditMode ? updateAction : createAction}
        initialValues={initialValues}
        canManageEntities={canManageEntities}
        submitLabel={isEditMode ? "Save entity" : "Add entity"}
        pendingLabel={isEditMode ? "Saving..." : "Adding..."}
        onCancel={onClose}
        onSuccess={() => onSuccess(isEditMode ? "Entity updated." : "Entity created.")}
      />
    </SettingsModalShell>
  );
}

function TagEditorForm({
  action,
  initialValues,
  snapshot,
  canManageTags,
  submitLabel,
  pendingLabel,
  onCancel,
  onSuccess,
}: {
  action: FormAction;
  initialValues: TagFormValues;
  snapshot: AdminSnapshot;
  canManageTags: boolean;
  submitLabel: string;
  pendingLabel: string;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setErrorMessage(null);

        const formData = new FormData(event.currentTarget);

        startTransition(async () => {
          try {
            await action(formData);
            onSuccess();
          } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : "Could not save tag.");
          }
        });
      }}
      className="grid gap-4"
    >
      <input type="hidden" name="id" value={initialValues.id} />

      <label className="grid gap-1.5">
        <FieldLabel>Name</FieldLabel>
        <Input
          name="name"
          aria-label="Name"
          placeholder="Feature launch"
          defaultValue={initialValues.name}
          disabled={!canManageTags || isPending}
          required
        />
      </label>

      <label className="grid gap-1.5">
        <FieldLabel>Parent</FieldLabel>
        <Select name="parentId" aria-label="Parent" defaultValue={initialValues.parentId} disabled={!canManageTags || isPending}>
          <option value="">No parent</option>
          {snapshot.tags
            .filter((tag) => !tag.parentId && tag.id !== initialValues.id)
            .map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
        </Select>
      </label>

      <label className="grid gap-1.5">
        <FieldLabel>Color</FieldLabel>
        <Input
          name="color"
          aria-label="Color"
          type="color"
          defaultValue={initialValues.color}
          disabled={!canManageTags || isPending}
        />
      </label>

      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" name="isActive" defaultChecked={initialValues.isActive} disabled={!canManageTags || isPending} />
        Active
      </label>

      {errorMessage ? (
        <div className="rounded-2xl border border-[#fecaca] bg-[#fff1f2] px-4 py-3 text-sm text-[#991b1b]">{errorMessage}</div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={!canManageTags} loading={isPending} loadingLabel={pendingLabel}>
          {submitLabel}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function TagModal({
  mode,
  tag,
  snapshot,
  canManageTags,
  createAction,
  updateAction,
  onClose,
  onSuccess,
}: {
  mode: "create" | "edit" | null;
  tag: TagRecord | null;
  snapshot: AdminSnapshot;
  canManageTags: boolean;
  createAction: FormAction;
  updateAction: FormAction;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  if (!mode) {
    return null;
  }

  const isEditMode = mode === "edit";

  if (isEditMode && !tag) {
    return null;
  }

  const initialValues = getTagFormValues(tag);

  return (
    <SettingsModalShell
      open
      title={isEditMode ? "Edit tag" : "Add tag"}
      description="Manage taxonomy labels for slicing and automation."
      onClose={onClose}
      widthClassName="md:max-w-[720px]"
    >
      <TagEditorForm
        key={`${mode}-${initialValues.id || "new"}`}
        action={isEditMode ? updateAction : createAction}
        initialValues={initialValues}
        snapshot={snapshot}
        canManageTags={canManageTags}
        submitLabel={isEditMode ? "Save tag" : "Add tag"}
        pendingLabel={isEditMode ? "Saving..." : "Adding..."}
        onCancel={onClose}
        onSuccess={() => onSuccess(isEditMode ? "Tag updated." : "Tag created.")}
      />
    </SettingsModalShell>
  );
}

function TagListItem({
  tag,
  parent,
  canManageTags,
  toggleAction,
  onDataChange,
  onEdit,
  onDelete,
}: {
  tag: TagRecord;
  parent?: TagRecord;
  canManageTags: boolean;
  toggleAction: FormAction;
  onDataChange?: DataChangeHandler;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [pendingAction, setPendingAction] = useState<"toggle" | null>(null);
  const [isPending, startTransition] = useTransition();
  const rowDisabled = !canManageTags || isPending;

  return (
    <SettingsColumnCard>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={tag.isActive ? "accent" : "muted"}>{tag.isActive ? "active" : "paused"}</Badge>
            {parent ? <Badge tone="muted">{parent.name}</Badge> : null}
          </div>
          <h3 className="mt-3 text-lg font-semibold tracking-tight text-slate-950">{tag.name}</h3>
          <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: tag.color }} />
            {tag.slug}
          </div>
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
                  await onDataChange?.();
                } finally {
                  setPendingAction(null);
                }
              });
            }}
          >
            <input type="hidden" name="id" value={tag.id} />
            <input type="hidden" name="isActive" value={String(!tag.isActive)} />
            <Button
              type="submit"
              variant="secondary"
              disabled={rowDisabled}
              loading={pendingAction === "toggle"}
              loadingLabel={tag.isActive ? "Pausing..." : "Enabling..."}
            >
              {tag.isActive ? "Pause" : "Enable"}
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

function RuleCreateForm({
  snapshot,
  canManageRules,
  createAction,
  onSuccess,
}: {
  snapshot: AdminSnapshot;
  canManageRules: boolean;
  createAction: FormAction;
  onSuccess: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setErrorMessage(null);

        const formData = new FormData(event.currentTarget);

        startTransition(async () => {
          try {
            await createAction(formData);
            onSuccess();
          } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : "Could not create rule.");
          }
        });
      }}
      className="grid gap-4"
    >
      <label className="grid gap-1.5">
        <FieldLabel>Name</FieldLabel>
        <Input name="name" placeholder="Pricing motion" disabled={!canManageRules || isPending} required />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1.5">
          <FieldLabel>Scope</FieldLabel>
          <Select name="sourceId" defaultValue="" disabled={!canManageRules || isPending}>
            <option value="">All sources</option>
            {snapshot.sources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.name}
              </option>
            ))}
          </Select>
        </label>
        <label className="grid gap-1.5">
          <FieldLabel>Priority</FieldLabel>
          <Input name="priority" type="number" defaultValue={50} disabled={!canManageRules || isPending} />
        </label>
      </div>

      <label className="grid gap-1.5">
        <FieldLabel>Keywords</FieldLabel>
        <Input name="keywords" placeholder="pricing, subscription, plan" disabled={!canManageRules || isPending} />
      </label>

      <label className="grid gap-1.5">
        <FieldLabel>URL Contains</FieldLabel>
        <Input name="urlContains" placeholder="/pricing, /release" disabled={!canManageRules || isPending} />
      </label>

      <div className="grid gap-2">
        <FieldLabel>Output Tags</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {snapshot.tags.map((tag) => (
            <label key={tag.id} className="flex items-center gap-2 rounded-full bg-black/[0.04] px-3 py-2 text-xs text-slate-700">
              <input type="checkbox" name="tagIds" value={tag.id} disabled={!canManageRules || isPending} />
              {tag.name}
            </label>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" name="isActive" defaultChecked disabled={!canManageRules || isPending} />
        Enable immediately
      </label>

      {errorMessage ? (
        <div className="rounded-2xl border border-[#fecaca] bg-[#fff1f2] px-4 py-3 text-sm text-[#991b1b]">{errorMessage}</div>
      ) : null}

      <FormSubmitButton type="submit" disabled={!canManageRules} loading={isPending} loadingLabel="Adding...">
        Add rule
      </FormSubmitButton>
    </form>
  );
}

function RuleListItem({
  rule,
  snapshot,
  canManageRules,
  toggleAction,
  onDataChange,
  onDelete,
}: {
  rule: TagRuleRecord;
  snapshot: AdminSnapshot;
  canManageRules: boolean;
  toggleAction: FormAction;
  onDataChange?: DataChangeHandler;
  onDelete: () => void;
}) {
  const [pendingAction, setPendingAction] = useState<"toggle" | null>(null);
  const [isPending, startTransition] = useTransition();
  const rowDisabled = !canManageRules || isPending;
  const tagNames = rule.actions.tagIds
    .map((tagId) => snapshot.tags.find((tag) => tag.id === tagId)?.name)
    .filter((name): name is string => Boolean(name));

  return (
    <SettingsColumnCard>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={rule.isActive ? "accent" : "muted"}>{rule.isActive ? "active" : "paused"}</Badge>
            <Badge tone="muted">priority {rule.priority}</Badge>
          </div>
          <h3 className="mt-3 text-lg font-semibold tracking-tight text-slate-950">{rule.name}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Keywords: {(rule.conditions.keywords ?? []).join(", ") || "none"} · URL:{" "}
            {(rule.conditions.urlContains ?? []).join(", ") || "none"}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {tagNames.map((name) => (
              <Badge key={name} tone="muted">
                {name}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <form
            action={toggleAction}
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              setPendingAction("toggle");
              startTransition(async () => {
                try {
                  await toggleAction(formData);
                  await onDataChange?.();
                } finally {
                  setPendingAction(null);
                }
              });
            }}
          >
            <input type="hidden" name="id" value={rule.id} />
            <input type="hidden" name="isActive" value={String(!rule.isActive)} />
            <Button
              type="submit"
              variant="secondary"
              disabled={rowDisabled}
              loading={pendingAction === "toggle"}
              loadingLabel={rule.isActive ? "Pausing..." : "Enabling..."}
            >
              {rule.isActive ? "Pause" : "Enable"}
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

export function EntitiesSettingsPanel({
  snapshot,
  canManageEntities,
  createAction,
  updateAction,
  deleteAction,
  onDataChange,
}: {
  snapshot: AdminSnapshot;
  canManageEntities: boolean;
  createAction: FormAction;
  updateAction: FormAction;
  deleteAction: FormAction;
  onDataChange?: DataChangeHandler;
}) {
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [activeEntityId, setActiveEntityId] = useState<string | null>(null);
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null);
  const [deletedEntityIds, setDeletedEntityIds] = useState<string[]>([]);
  const { statusMessage, reportStatus } = useSettingsFeedback(onDataChange);
  const visibleEntities = useMemo(
    () => snapshot.entities.filter((entity) => !deletedEntityIds.includes(entity.id)),
    [deletedEntityIds, snapshot.entities],
  );
  const activeEntity = activeEntityId ? visibleEntities.find((entity) => entity.id === activeEntityId) ?? null : null;
  const deleteCandidate = deleteCandidateId ? visibleEntities.find((entity) => entity.id === deleteCandidateId) ?? null : null;

  function openCreateModal() {
    setActiveEntityId(null);
    setModalMode("create");
  }

  function openEditModal(entityId: string) {
    setActiveEntityId(entityId);
    setModalMode("edit");
  }

  function closeEntityModal() {
    setModalMode(null);
    setActiveEntityId(null);
  }

  function handleSaveSuccess(message: string) {
    closeEntityModal();
    reportStatus(message);
  }

  function handleDeleteSuccess(entityId: string, entityName: string) {
    setDeleteCandidateId(null);
    setDeletedEntityIds((currentIds) => (currentIds.includes(entityId) ? currentIds : [...currentIds, entityId]));
    reportStatus(`Entity deleted: ${entityName}.`);
  }

  return (
    <>
      <div className="grid gap-4">
        <StatusMessage message={statusMessage} />

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-slate-500">
            {visibleEntities.length} {visibleEntities.length === 1 ? "entity" : "entities"}
          </p>
          <Button type="button" disabled={!canManageEntities} onClick={openCreateModal}>
            Add entity
          </Button>
        </div>

        <div className="grid gap-3">
          {visibleEntities.length === 0 ? (
            <EmptyState message="No entities yet." />
          ) : (
            visibleEntities.map((entity) => (
              <SettingsColumnCard key={entity.id}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge tone="muted">{entity.kind}</Badge>
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: entity.color }} />
                    </div>
                    <h3 className="mt-3 text-lg font-semibold tracking-tight text-slate-950">{entity.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-500">{entity.description}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button type="button" variant="ghost" disabled={!canManageEntities} onClick={() => openEditModal(entity.id)}>
                      Edit
                    </Button>
                    <Button type="button" variant="danger" disabled={!canManageEntities} onClick={() => setDeleteCandidateId(entity.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
              </SettingsColumnCard>
            ))
          )}
        </div>
      </div>

      <EntityModal
        mode={modalMode}
        entity={modalMode === "edit" ? activeEntity : null}
        canManageEntities={canManageEntities}
        createAction={createAction}
        updateAction={updateAction}
        onClose={closeEntityModal}
        onSuccess={handleSaveSuccess}
      />

      {deleteCandidate ? (
        <DeleteConfirmModal
          open
          title="Delete entity"
          description="This removes the entity permanently."
          warningTitle={`Delete ${deleteCandidate.name}?`}
          warningDescription="This action cannot be undone. Existing references will lose this entity association."
          itemId={deleteCandidate.id}
          deleteAction={deleteAction}
          confirmLabel="Delete entity"
          pendingLabel="Deleting..."
          disabled={!canManageEntities}
          onClose={() => setDeleteCandidateId(null)}
          onSuccess={() => handleDeleteSuccess(deleteCandidate.id, deleteCandidate.name)}
        >
          <EntitySummary entity={deleteCandidate} />
        </DeleteConfirmModal>
      ) : null}
    </>
  );
}

export function TagsSettingsPanel({
  snapshot,
  canManageTags,
  createAction,
  updateAction,
  toggleAction,
  deleteAction,
  onDataChange,
}: {
  snapshot: AdminSnapshot;
  canManageTags: boolean;
  createAction: FormAction;
  updateAction: FormAction;
  toggleAction: FormAction;
  deleteAction: FormAction;
  onDataChange?: DataChangeHandler;
}) {
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [activeTagId, setActiveTagId] = useState<string | null>(null);
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null);
  const [deletedTagIds, setDeletedTagIds] = useState<string[]>([]);
  const { statusMessage, reportStatus } = useSettingsFeedback(onDataChange);
  const visibleTags = useMemo(() => snapshot.tags.filter((tag) => !deletedTagIds.includes(tag.id)), [deletedTagIds, snapshot.tags]);
  const activeTag = activeTagId ? visibleTags.find((tag) => tag.id === activeTagId) ?? null : null;
  const deleteCandidate = deleteCandidateId ? visibleTags.find((tag) => tag.id === deleteCandidateId) ?? null : null;
  const deleteCandidateParent = deleteCandidate
    ? snapshot.tags.find((entry) => entry.id === deleteCandidate.parentId) ?? null
    : null;

  function openCreateModal() {
    setActiveTagId(null);
    setModalMode("create");
  }

  function openEditModal(tagId: string) {
    setActiveTagId(tagId);
    setModalMode("edit");
  }

  function closeTagModal() {
    setModalMode(null);
    setActiveTagId(null);
  }

  function handleSaveSuccess(message: string) {
    closeTagModal();
    reportStatus(message);
  }

  function handleDeleteSuccess(tagId: string, tagName: string) {
    setDeleteCandidateId(null);
    setDeletedTagIds((currentIds) => (currentIds.includes(tagId) ? currentIds : [...currentIds, tagId]));
    reportStatus(`Tag deleted: ${tagName}.`);
  }

  return (
    <>
      <div className="grid gap-4">
        <StatusMessage message={statusMessage} />

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-slate-500">
            {visibleTags.length} {visibleTags.length === 1 ? "tag" : "tags"}
          </p>
          <Button type="button" disabled={!canManageTags} onClick={openCreateModal}>
            Add tag
          </Button>
        </div>

        <div className="grid gap-3">
          {visibleTags.length === 0 ? (
            <EmptyState message="No tags yet." />
          ) : (
            visibleTags.map((tag) => {
              const parent = snapshot.tags.find((entry) => entry.id === tag.parentId);
              return (
                <TagListItem
                  key={tag.id}
                  tag={tag}
                  parent={parent ?? undefined}
                  canManageTags={canManageTags}
                  toggleAction={toggleAction}
                  onDataChange={onDataChange}
                  onEdit={() => openEditModal(tag.id)}
                  onDelete={() => setDeleteCandidateId(tag.id)}
                />
              );
            })
          )}
        </div>
      </div>

      <TagModal
        mode={modalMode}
        tag={modalMode === "edit" ? activeTag : null}
        snapshot={snapshot}
        canManageTags={canManageTags}
        createAction={createAction}
        updateAction={updateAction}
        onClose={closeTagModal}
        onSuccess={handleSaveSuccess}
      />

      {deleteCandidate ? (
        <DeleteConfirmModal
          open
          title="Delete tag"
          description="This removes the tag permanently."
          warningTitle={`Delete ${deleteCandidate.name}?`}
          warningDescription="This action cannot be undone. Existing feed items and rules will no longer use this tag."
          itemId={deleteCandidate.id}
          deleteAction={deleteAction}
          confirmLabel="Delete tag"
          pendingLabel="Deleting..."
          disabled={!canManageTags}
          onClose={() => setDeleteCandidateId(null)}
          onSuccess={() => handleDeleteSuccess(deleteCandidate.id, deleteCandidate.name)}
        >
          <TagSummary tag={deleteCandidate} parent={deleteCandidateParent} />
        </DeleteConfirmModal>
      ) : null}
    </>
  );
}

export function RulesSettingsPanel({
  snapshot,
  canManageRules,
  createAction,
  toggleAction,
  deleteAction,
  onDataChange,
}: {
  snapshot: AdminSnapshot;
  canManageRules: boolean;
  createAction: FormAction;
  toggleAction: FormAction;
  deleteAction: FormAction;
  onDataChange?: DataChangeHandler;
}) {
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null);
  const [deletedRuleIds, setDeletedRuleIds] = useState<string[]>([]);
  const { statusMessage, reportStatus } = useSettingsFeedback(onDataChange);
  const visibleRules = useMemo(() => snapshot.rules.filter((rule) => !deletedRuleIds.includes(rule.id)), [deletedRuleIds, snapshot.rules]);
  const deleteCandidate = deleteCandidateId ? visibleRules.find((rule) => rule.id === deleteCandidateId) ?? null : null;

  function handleRuleCreateSuccess() {
    reportStatus("Rule created.");
  }

  function handleDeleteSuccess(ruleId: string, ruleName: string) {
    setDeleteCandidateId(null);
    setDeletedRuleIds((currentIds) => (currentIds.includes(ruleId) ? currentIds : [...currentIds, ruleId]));
    reportStatus(`Rule deleted: ${ruleName}.`);
  }

  return (
    <>
      <div className="grid gap-4">
        <StatusMessage message={statusMessage} />

        <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
          <SettingsColumnCard>
            <RuleCreateForm
              snapshot={snapshot}
              canManageRules={canManageRules}
              createAction={createAction}
              onSuccess={handleRuleCreateSuccess}
            />
          </SettingsColumnCard>

          <div className="grid gap-3">
            {visibleRules.map((rule) => (
              <RuleListItem
                key={rule.id}
                rule={rule}
                snapshot={snapshot}
                canManageRules={canManageRules}
                toggleAction={toggleAction}
                onDataChange={onDataChange}
                onDelete={() => setDeleteCandidateId(rule.id)}
              />
            ))}
          </div>
        </div>
      </div>

      {deleteCandidate ? (
        <DeleteConfirmModal
          open
          title="Delete rule"
          description="This removes the automation rule permanently."
          warningTitle={`Delete ${deleteCandidate.name}?`}
          warningDescription="This action cannot be undone. Matching items will stop receiving tags from this rule."
          itemId={deleteCandidate.id}
          deleteAction={deleteAction}
          confirmLabel="Delete rule"
          pendingLabel="Deleting..."
          disabled={!canManageRules}
          onClose={() => setDeleteCandidateId(null)}
          onSuccess={() => handleDeleteSuccess(deleteCandidate.id, deleteCandidate.name)}
        >
          <RuleSummary rule={deleteCandidate} snapshot={snapshot} />
        </DeleteConfirmModal>
      ) : null}
    </>
  );
}
