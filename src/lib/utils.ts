import { clsx, type ClassValue } from "clsx";
import { formatDistanceToNowStrict, formatISO } from "date-fns";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatRelativeTime(date: Date | string) {
  return formatDistanceToNowStrict(new Date(date), { addSuffix: true });
}

export function formatDateTime(date: Date | string) {
  return formatISO(new Date(date), { representation: "complete" });
}

export function compactNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function toSentenceCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function splitCommaList(value: string | null | undefined) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function unique<T>(items: T[]) {
  return [...new Set(items)];
}
