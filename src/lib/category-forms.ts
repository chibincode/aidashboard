import type { EntityKind, ThemeTone } from "@/lib/domain";

export interface CategoryFormValues {
  id: string;
  name: string;
  description: string;
  tone: ThemeTone;
  position: string;
  isActive: boolean;
  tagIds: string[];
  entityIds: string[];
  entityKinds: EntityKind[];
}

export interface CategoryMutationState {
  status: "idle" | "success" | "error";
  message: string | null;
  fieldErrors: Partial<Record<"name" | "conditions" | "position", string>>;
  values: CategoryFormValues;
  nonce: number;
}

export function createEmptyCategoryFormValues(overrides?: Partial<CategoryFormValues>): CategoryFormValues {
  return {
    id: "",
    name: "",
    description: "",
    tone: "sand",
    position: "10",
    isActive: true,
    tagIds: [],
    entityIds: [],
    entityKinds: [],
    ...overrides,
  };
}

export function createCategoryMutationState(
  values: CategoryFormValues,
  overrides?: Partial<Omit<CategoryMutationState, "values">>,
): CategoryMutationState {
  return {
    status: "idle",
    message: null,
    fieldErrors: {},
    nonce: 0,
    ...overrides,
    values,
  };
}
