import type { SourceExtractorProfile, SourceType } from "@/lib/domain";

export interface SourceFormValues {
  id: string;
  name: string;
  type: SourceType;
  extractorProfile: SourceExtractorProfile | "";
  url: string;
  entityId: string;
  priority: string;
  refreshMinutes: string;
  isActive: boolean;
  defaultTagIds: string[];
}

export interface SourceMutationState {
  status: "idle" | "success" | "error";
  message: string | null;
  fieldErrors: Partial<Record<"name" | "url" | "extractorProfile", string>>;
  values: SourceFormValues;
  nonce: number;
}

export function createEmptySourceFormValues(): SourceFormValues {
  return {
    id: "",
    name: "",
    type: "website",
    extractorProfile: "",
    url: "",
    entityId: "",
    priority: "70",
    refreshMinutes: "30",
    isActive: true,
    defaultTagIds: [],
  };
}

export function createSourceMutationState(
  values: SourceFormValues,
  overrides?: Partial<Omit<SourceMutationState, "values">>,
): SourceMutationState {
  return {
    status: "idle",
    message: null,
    fieldErrors: {},
    nonce: 0,
    ...overrides,
    values,
  };
}
