import { format, formatDistanceToNowStrict, isToday, parseISO } from "date-fns";

export function getLocalDateInputValue(value: Date = new Date()) {
  return format(value, "yyyy-MM-dd");
}

export function formatShortDate(value: string | Date) {
  const date = typeof value === "string" ? parseISO(value) : value;
  return format(date, "MMM d");
}

export function formatLongDate(value: string | Date) {
  const date = typeof value === "string" ? parseISO(value) : value;
  return format(date, "MMMM d, yyyy");
}

export function relativeToNow(value: string | Date) {
  const date = typeof value === "string" ? parseISO(value) : value;
  return isToday(date) ? "today" : formatDistanceToNowStrict(date, { addSuffix: true });
}
