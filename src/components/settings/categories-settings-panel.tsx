"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SettingsModalShell } from "@/components/settings/settings-modal-shell";
import {
  createCategoryMutationState,
  createEmptyCategoryFormValues,
  type CategoryFormValues,
  type CategoryMutationState,
} from "@/lib/category-forms";
import { entityKinds, type AdminSnapshot, type CategoryRecord, type ThemeTone } from "@/lib/domain";
import { toSentenceCase } from "@/lib/utils";

type CategoryMutationAction = (
  previousState: CategoryMutationState,
  formData: FormData,
) => Promise<CategoryMutationState>;

const toneOptions: Array<{ value: ThemeTone; label: string }> = [
  { value: "sand", label: "Sand" },
  { value: "mint", label: "Mint" },
  { value: "amber", label: "Amber" },
  { value: "ink", label: "Ink" },
];

function getNextCategoryPosition(categories: CategoryRecord[]) {
  return String(categories.reduce((max, category) => Math.max(max, category.position), 0) + 10);
}

function getCategoryFormValues(category: CategoryRecord | null, categories: CategoryRecord[]): CategoryFormValues {
  if (!category) {
    return createEmptyCategoryFormValues({ position: getNextCategoryPosition(categories) });
  }

  return {
    id: category.id,
    name: category.name,
    description: category.description,
    tone: category.tone,
    position: String(category.position),
    isActive: category.isActive,
    tagIds: category.tagIds,
    entityIds: category.entityIds,
    entityKinds: category.entityKinds,
  };
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{children}</span>;
}

function FormStatusMessage({ state }: { state: CategoryMutationState }) {
  if (!state.message) {
    return null;
  }

  const tone =
    state.status === "error"
      ? "border-[#fecaca] bg-[#fff5f5] text-[#991b1b]"
      : "border-[color:var(--accent-soft)] bg-[color:var(--accent-soft)]/45 text-[color:var(--accent-strong)]";

  return <div className={`rounded-2xl border px-4 py-3 text-sm ${tone}`}>{state.message}</div>;
}

function CategoryEditorForm({
  snapshot,
  initialValues,
  canManageCategories,
  action,
  submitLabel,
  pendingLabel,
  onSuccess,
  onCancel,
}: {
  snapshot: AdminSnapshot;
  initialValues: CategoryFormValues;
  canManageCategories: boolean;
  action: CategoryMutationAction;
  submitLabel: string;
  pendingLabel: string;
  onSuccess: (message: string) => void;
  onCancel?: () => void;
}) {
  const [state, formAction, isPending] = useActionState(action, createCategoryMutationState(initialValues));
  const resolvedValues = state.status === "error" ? state.values : initialValues;

  useEffect(() => {
    if (state.status === "success" && state.message) {
      onSuccess(state.message);
    }
  }, [onSuccess, state.message, state.status]);

  return (
    <form
      key={`${initialValues.id || "new"}-${state.nonce}-${state.status}`}
      action={formAction}
      className="grid gap-4"
    >
      <input type="hidden" name="id" value={resolvedValues.id} />

      <label className="grid gap-1.5">
        <FieldLabel>Name</FieldLabel>
        <Input name="name" placeholder="Competitor Watch" defaultValue={resolvedValues.name} disabled={!canManageCategories} required />
        {state.fieldErrors.name ? <p className="text-xs text-[#991b1b]">{state.fieldErrors.name}</p> : null}
      </label>

      <label className="grid gap-1.5">
        <FieldLabel>Description</FieldLabel>
        <Textarea
          name="description"
          placeholder="Signals across the entities and themes you care about."
          defaultValue={resolvedValues.description}
          disabled={!canManageCategories}
        />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1.5">
          <FieldLabel>Tone</FieldLabel>
          <Select name="tone" defaultValue={resolvedValues.tone} disabled={!canManageCategories}>
            {toneOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </label>

        <label className="grid gap-1.5">
          <FieldLabel>Order</FieldLabel>
          <Input name="position" type="number" defaultValue={resolvedValues.position} disabled={!canManageCategories} />
          {state.fieldErrors.position ? <p className="text-xs text-[#991b1b]">{state.fieldErrors.position}</p> : null}
        </label>
      </div>

      <div className="grid gap-2">
        <FieldLabel>Tags</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {snapshot.tags.map((tag) => (
            <label key={tag.id} className="flex items-center gap-2 rounded-full bg-black/[0.04] px-3 py-2 text-xs text-slate-700">
              <input
                type="checkbox"
                name="tagIds"
                value={tag.id}
                defaultChecked={resolvedValues.tagIds.includes(tag.id)}
                disabled={!canManageCategories}
              />
              {tag.name}
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-2">
        <FieldLabel>Entities</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {snapshot.entities.map((entity) => (
            <label key={entity.id} className="flex items-center gap-2 rounded-full bg-black/[0.04] px-3 py-2 text-xs text-slate-700">
              <input
                type="checkbox"
                name="entityIds"
                value={entity.id}
                defaultChecked={resolvedValues.entityIds.includes(entity.id)}
                disabled={!canManageCategories}
              />
              {entity.name}
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-2">
        <FieldLabel>Entity Kinds</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {entityKinds.map((kind) => (
            <label key={kind} className="flex items-center gap-2 rounded-full bg-black/[0.04] px-3 py-2 text-xs text-slate-700">
              <input
                type="checkbox"
                name="entityKinds"
                value={kind}
                defaultChecked={resolvedValues.entityKinds.includes(kind)}
                disabled={!canManageCategories}
              />
              {toSentenceCase(kind)}
            </label>
          ))}
        </div>
        {state.fieldErrors.conditions ? <p className="text-xs text-[#991b1b]">{state.fieldErrors.conditions}</p> : null}
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" name="isActive" defaultChecked={resolvedValues.isActive} disabled={!canManageCategories} />
        Show on homepage
      </label>

      <FormStatusMessage state={state} />

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={!canManageCategories || isPending}>
          {isPending ? pendingLabel : submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function DeleteCategoryForm({
  categoryId,
  categoryName,
  canManageCategories,
  deleteAction,
  onClose,
  onSuccess,
}: {
  categoryId: string;
  categoryName: string;
  canManageCategories: boolean;
  deleteAction: (formData: FormData) => Promise<void>;
  onClose: () => void;
  onSuccess: (categoryId: string, categoryName: string) => void;
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
              onSuccess(categoryId, categoryName);
            } catch (error) {
              setErrorMessage(error instanceof Error ? error.message : "Could not delete category.");
            }
          });
        }}
        className="flex flex-wrap justify-end gap-2"
      >
        <input type="hidden" name="id" value={categoryId} />
        <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" variant="danger" disabled={!canManageCategories || isPending}>
          {isPending ? "Deleting..." : "Delete category"}
        </Button>
      </form>
    </div>
  );
}

function CategoryModal({
  mode,
  category,
  snapshot,
  categories,
  canManageCategories,
  createAction,
  updateAction,
  onClose,
  onSuccess,
}: {
  mode: "create" | "edit" | null;
  category: CategoryRecord | null;
  snapshot: AdminSnapshot;
  categories: CategoryRecord[];
  canManageCategories: boolean;
  createAction: CategoryMutationAction;
  updateAction: CategoryMutationAction;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  if (!mode) {
    return null;
  }

  const isEditMode = mode === "edit";

  if (isEditMode && !category) {
    return null;
  }

  const initialValues = getCategoryFormValues(category, categories);

  return (
    <SettingsModalShell
      open
      title={isEditMode ? "Edit category" : "Add category"}
      description="Build homepage groupings from tags, entities, and entity kinds."
      onClose={onClose}
      widthClassName="md:max-w-[860px]"
    >
      <CategoryEditorForm
        key={`${mode}-${initialValues.id || "new"}`}
        snapshot={snapshot}
        initialValues={initialValues}
        canManageCategories={canManageCategories}
        action={isEditMode ? updateAction : createAction}
        submitLabel={isEditMode ? "Save category" : "Add category"}
        pendingLabel={isEditMode ? "Saving..." : "Adding..."}
        onSuccess={onSuccess}
        onCancel={onClose}
      />
    </SettingsModalShell>
  );
}

function DeleteCategoryModal({
  category,
  canManageCategories,
  deleteAction,
  snapshot,
  onClose,
  onSuccess,
}: {
  category: CategoryRecord | null;
  canManageCategories: boolean;
  deleteAction: (formData: FormData) => Promise<void>;
  snapshot: AdminSnapshot;
  onClose: () => void;
  onSuccess: (categoryId: string, categoryName: string) => void;
}) {
  return (
    <SettingsModalShell
      open={Boolean(category)}
      title="Delete category"
      description="This removes the homepage grouping permanently."
      onClose={onClose}
      widthClassName="md:max-w-[560px]"
    >
      {category ? (
        <div className="grid gap-5">
          <div className="rounded-[22px] border border-[#fecaca] bg-[#fff1f2] px-4 py-4 text-sm leading-6 text-[#991b1b]">
            <p className="font-semibold text-[#7f1d1d]">Delete {category.name}?</p>
            <p className="mt-1">This action cannot be undone. Items will stop appearing under this homepage grouping.</p>
          </div>

          <div className="rounded-[22px] border border-black/8 bg-white px-4 py-4">
            <p className="text-sm font-semibold text-slate-950">{category.name}</p>
            <p className="mt-1 text-sm text-slate-500">{category.description || "No description"}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {category.tagIds.map((tagId) => {
                const tag = snapshot.tags.find((entry) => entry.id === tagId);
                return tag ? (
                  <Badge key={tag.id} tone="muted">
                    #{tag.name}
                  </Badge>
                ) : null;
              })}
              {category.entityIds.map((entityId) => {
                const entity = snapshot.entities.find((entry) => entry.id === entityId);
                return entity ? (
                  <Badge key={entity.id} tone="muted">
                    {entity.name}
                  </Badge>
                ) : null;
              })}
              {category.entityKinds.map((kind) => (
                <Badge key={kind} tone="muted">
                  {toSentenceCase(kind)}
                </Badge>
              ))}
            </div>
          </div>

          <DeleteCategoryForm
            categoryId={category.id}
            categoryName={category.name}
            canManageCategories={canManageCategories}
            deleteAction={deleteAction}
            onClose={onClose}
            onSuccess={onSuccess}
          />
        </div>
      ) : null}
    </SettingsModalShell>
  );
}

function CategoryCard({
  category,
  snapshot,
  canManageCategories,
  onEdit,
  onDelete,
  toggleAction,
}: {
  category: CategoryRecord;
  snapshot: AdminSnapshot;
  canManageCategories: boolean;
  onEdit: () => void;
  onDelete: () => void;
  toggleAction: (formData: FormData) => Promise<void>;
}) {
  const matchedTags = category.tagIds
    .map((tagId) => snapshot.tags.find((tag) => tag.id === tagId)?.name)
    .filter((name): name is string => Boolean(name));
  const matchedEntities = category.entityIds
    .map((entityId) => snapshot.entities.find((entity) => entity.id === entityId)?.name)
    .filter((name): name is string => Boolean(name));

  return (
    <Card className="rounded-[24px] border-black/8 bg-white p-5 shadow-[0_12px_34px_-30px_rgba(12,23,32,0.3)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={category.isActive ? "accent" : "muted"}>{category.isActive ? "active" : "paused"}</Badge>
            <Badge tone="muted">{toSentenceCase(category.tone)}</Badge>
            <Badge tone="muted">order {category.position}</Badge>
          </div>
          <h3 className="mt-3 text-lg font-semibold tracking-tight text-slate-950">{category.name}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">{category.description}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {matchedTags.map((name) => (
              <Badge key={`tag-${name}`} tone="muted">
                #{name}
              </Badge>
            ))}
            {matchedEntities.map((name) => (
              <Badge key={`entity-${name}`} tone="muted">
                {name}
              </Badge>
            ))}
            {category.entityKinds.map((kind) => (
              <Badge key={`kind-${kind}`} tone="muted">
                {toSentenceCase(kind)}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Button type="button" variant="ghost" onClick={onEdit} disabled={!canManageCategories}>
            Edit
          </Button>
          <form action={toggleAction}>
            <input type="hidden" name="id" value={category.id} />
            <input type="hidden" name="isActive" value={String(!category.isActive)} />
            <Button type="submit" variant="secondary" disabled={!canManageCategories}>
              {category.isActive ? "Pause" : "Enable"}
            </Button>
          </form>
          <Button type="button" variant="danger" onClick={onDelete} disabled={!canManageCategories}>
            Delete
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function CategoriesSettingsPanel({
  snapshot,
  canManageCategories,
  createAction,
  updateAction,
  toggleAction,
  deleteAction,
}: {
  snapshot: AdminSnapshot;
  canManageCategories: boolean;
  createAction: CategoryMutationAction;
  updateAction: CategoryMutationAction;
  toggleAction: (formData: FormData) => Promise<void>;
  deleteAction: (formData: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null);
  const [deletedCategoryIds, setDeletedCategoryIds] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [, startRefreshTransition] = useTransition();

  const sortedCategories = useMemo(
    () =>
      [...snapshot.categories]
        .filter((category) => !deletedCategoryIds.includes(category.id))
        .sort((left, right) => {
          if (left.position !== right.position) {
            return left.position - right.position;
          }

          return left.name.localeCompare(right.name);
        }),
    [deletedCategoryIds, snapshot.categories],
  );

  const activeCategory = activeCategoryId
    ? sortedCategories.find((category) => category.id === activeCategoryId) ?? null
    : null;
  const deleteCandidate = deleteCandidateId
    ? sortedCategories.find((category) => category.id === deleteCandidateId) ?? null
    : null;

  function openCreateModal() {
    setActiveCategoryId(null);
    setModalMode("create");
  }

  function openEditModal(categoryId: string) {
    setActiveCategoryId(categoryId);
    setModalMode("edit");
  }

  function closeCategoryModal() {
    setModalMode(null);
    setActiveCategoryId(null);
  }

  function handleCategorySaveSuccess(message: string) {
    closeCategoryModal();
    setStatusMessage(message);
    startRefreshTransition(() => {
      router.refresh();
    });
  }

  function handleCategoryDeleteSuccess(categoryId: string, categoryName: string) {
    setDeleteCandidateId(null);
    setDeletedCategoryIds((currentIds) => (currentIds.includes(categoryId) ? currentIds : [...currentIds, categoryId]));
    setStatusMessage(`Category deleted: ${categoryName}.`);
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
          <p className="text-sm text-slate-500">
            {sortedCategories.length} {sortedCategories.length === 1 ? "category" : "categories"}
          </p>
          <Button type="button" variant="primary" disabled={!canManageCategories} onClick={openCreateModal}>
            Add category
          </Button>
        </div>

        <div className="grid gap-3">
          {sortedCategories.length === 0 ? (
            <Card className="rounded-[24px] border border-dashed border-black/10 bg-black/[0.015] p-6 text-sm text-slate-500 shadow-none">
              No business categories yet.
            </Card>
          ) : (
            sortedCategories.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                snapshot={snapshot}
                canManageCategories={canManageCategories}
                onEdit={() => openEditModal(category.id)}
                onDelete={() => setDeleteCandidateId(category.id)}
                toggleAction={toggleAction}
              />
            ))
          )}
        </div>
      </div>

      <CategoryModal
        mode={modalMode}
        category={modalMode === "edit" ? activeCategory : null}
        snapshot={snapshot}
        categories={sortedCategories}
        canManageCategories={canManageCategories}
        createAction={createAction}
        updateAction={updateAction}
        onClose={closeCategoryModal}
        onSuccess={handleCategorySaveSuccess}
      />
      <DeleteCategoryModal
        category={deleteCandidate}
        snapshot={snapshot}
        canManageCategories={canManageCategories}
        deleteAction={deleteAction}
        onClose={() => setDeleteCandidateId(null)}
        onSuccess={handleCategoryDeleteSuccess}
      />
    </>
  );
}
