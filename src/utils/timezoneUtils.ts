import { format, toZonedTime, fromZonedTime } from 'date-fns-tz';

export const EAT_TIMEZONE = 'Africa/Nairobi';

/**
 * Get user's detected timezone
 */
export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Check if user is in East Africa timezone
 */
export function isUserInEAT(): boolean {
  const userTz = getUserTimezone();
  return userTz === EAT_TIMEZONE || userTz === 'Africa/Kampala' || userTz === 'Africa/Dar_es_Salaam';
}

/**
 * Convert EAT time to user's timezone
 */
export function eatToUserTimezone(eatDate: Date, userTimezone: string): Date {
  // EAT date is stored as if it's in EAT timezone
  // Convert it to user's timezone
  const eatTime = fromZonedTime(eatDate, EAT_TIMEZONE);
  return toZonedTime(eatTime, userTimezone);
}

/**
 * Convert user's timezone to EAT
 */
export function userTimezoneToEAT(userDate: Date, userTimezone: string): Date {
  const userTime = fromZonedTime(userDate, userTimezone);
  return toZonedTime(userTime, EAT_TIMEZONE);
}

/**
 * Format time showing both user timezone and EAT
 */
export function formatDualTimezone(
  date: Date,
  userTimezone: string,
  timeFormat: string = 'h:mm a'
): { userTime: string; eatTime: string; userTz: string; eatTz: string } {
  const userDate = toZonedTime(date, userTimezone);
  const eatDate = toZonedTime(date, EAT_TIMEZONE);
  
  return {
    userTime: format(userDate, timeFormat, { timeZone: userTimezone }),
    eatTime: format(eatDate, timeFormat, { timeZone: EAT_TIMEZONE }),
    userTz: getTimezoneAbbreviation(userTimezone),
    eatTz: 'EAT'
  };
}

/**
 * Get timezone abbreviation (e.g., EST, PST, EAT)
 */
export function getTimezoneAbbreviation(timezone: string): string {
  const date = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'short'
  });
  
  const parts = formatter.formatToParts(date);
  const tzPart = parts.find(part => part.type === 'timeZoneName');
  
  return tzPart?.value || timezone;
}

/**
 * Get timezone offset in hours from UTC
 */
export function getTimezoneOffset(timezone: string): number {
  const date = new Date();
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  
  return (tzDate.getTime() - utcDate.getTime()) / (1000 * 60 * 60);
}

/**
 * Format timezone display name
 */
export function getTimezoneDisplayName(timezone: string): string {
  const offset = getTimezoneOffset(timezone);
  const sign = offset >= 0 ? '+' : '-';
  const hours = Math.abs(Math.floor(offset));
  const minutes = Math.abs((offset % 1) * 60);
  
  const offsetStr = `UTC${sign}${hours.toString().padStart(2, '0')}${minutes > 0 ? `:${minutes.toString().padStart(2, '0')}` : ''}`;
  
  return `${timezone.replace('_', ' ')} (${offsetStr})`;
}

/**
 * Common timezones for diaspora
 */
export const COMMON_TIMEZONES = [
  { value: 'Africa/Nairobi', label: 'East Africa Time (EAT)', region: 'Africa' },
  { value: 'America/New_York', label: 'Eastern Time (ET)', region: 'Americas' },
  { value: 'America/Chicago', label: 'Central Time (CT)', region: 'Americas' },
  { value: 'America/Denver', label: 'Mountain Time (MT)', region: 'Americas' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)', region: 'Americas' },
  { value: 'America/Toronto', label: 'Toronto (ET)', region: 'Americas' },
  { value: 'Europe/London', label: 'British Time (GMT/BST)', region: 'Europe' },
  { value: 'Europe/Paris', label: 'Central European Time (CET)', region: 'Europe' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)', region: 'Europe' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (AEDT)', region: 'Oceania' },
  { value: 'Australia/Melbourne', label: 'Melbourne (AEDT)', region: 'Oceania' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)', region: 'Middle East' },
];
