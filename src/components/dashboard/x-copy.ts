import type { DashboardItem } from "@/lib/domain";

function compactText(value?: string | null) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function stripTrailingEllipsis(value: string) {
  return value.replace(/(?:\.\.\.|…)+\s*$/u, "").trim();
}

function textsAreEquivalent(left: string, right: string) {
  if (!left || !right) {
    return false;
  }

  if (left === right) {
    return true;
  }

  const normalizedLeft = stripTrailingEllipsis(left);
  const normalizedRight = stripTrailingEllipsis(right);

  if (!normalizedLeft || !normalizedRight) {
    return false;
  }

  return (
    normalizedLeft === normalizedRight ||
    normalizedLeft.startsWith(normalizedRight) ||
    normalizedRight.startsWith(normalizedLeft)
  );
}

export function resolveXDisplayText(item: Pick<DashboardItem, "title" | "excerpt">) {
  const title = compactText(item.title);
  const excerpt = compactText(item.excerpt);
  const primaryText = excerpt || title;
  const secondaryText = excerpt && title && !textsAreEquivalent(excerpt, title) ? title : "";

  return {
    primaryText,
    secondaryText,
  };
}
