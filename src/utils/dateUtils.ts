import { format } from "date-fns";
import { toZonedTime, formatInTimeZone } from "date-fns-tz";

// East Africa Time (EAT) timezone
const EAT_TIMEZONE = "Africa/Nairobi";

/**
 * Format a date to EAT timezone
 */
export const formatToEAT = (date: Date | string, formatStr: string = "PPpp"): string => {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return formatInTimeZone(dateObj, EAT_TIMEZONE, formatStr);
};

/**
 * Convert a date to EAT timezone
 */
export const toEAT = (date: Date | string): Date => {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return toZonedTime(dateObj, EAT_TIMEZONE);
};

/**
 * Format consultation date for display
 */
export const formatConsultationDate = (date: Date | string): string => {
  return formatToEAT(date, "EEEE, MMMM d, yyyy");
};

/**
 * Format consultation time for display
 */
export const formatConsultationTime = (date: Date | string): string => {
  return formatToEAT(date, "h:mm a");
};

/**
 * Format full date and time
 */
export const formatFullDateTime = (date: Date | string): string => {
  return formatToEAT(date, "EEEE, MMMM d, yyyy 'at' h:mm a 'EAT'");
};
