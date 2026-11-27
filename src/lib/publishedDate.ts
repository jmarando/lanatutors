import { format, parseISO } from "date-fns";

// Formats a timestamp by its calendar date alone, so the build-time prerender (UTC) and a visitor's browser (any time
// zone) print the same day and hydration matches.
export const formatPublishedDate = (value: string, pattern: string) => format(parseISO(value.slice(0, 10)), pattern);
