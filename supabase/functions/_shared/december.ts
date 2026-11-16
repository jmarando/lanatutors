// Rules for enrol-december-family that need neither Deno nor the database, kept apart so the tests can load them directly.

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// create-parent-profile gives a family without an email a login on an address like this one.
export const PLACEHOLDER_DOMAIN = "@lana-placeholder.local";
export const MAX_FEE_PER_SUBJECT = 100000;

export type EnrolInput = {
  familyId: string;
  childName: string;
  classIds: string[];
  feePerSubject: number;
  parentName?: string;
  phone?: string;
  email?: string;
};

const text = (value: unknown): string => (typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "");

/** Reads the request body, or says what is wrong with it. */
export function readEnrolInput(body: unknown): { ok: true; value: EnrolInput } | { ok: false; error: string } {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;

  const familyId = text(b.familyId);
  if (!UUID.test(familyId)) return { ok: false, error: "Choose the family to enrol" };

  const childName = text(b.childName);
  if (childName.length < 2 || childName.length > 80) return { ok: false, error: "Enter the child's name: 2 to 80 characters" };

  const classIds = [...new Set((Array.isArray(b.classIds) ? b.classIds : []).map((id) => text(id)))];
  if (classIds.length < 1 || classIds.length > 6 || !classIds.every((id) => UUID.test(id))) {
    return { ok: false, error: "Choose between 1 and 6 classes" };
  }

  const fee = Number(b.feePerSubject);
  if (typeof b.feePerSubject === "boolean" || !Number.isFinite(fee) || fee <= 0 || fee > MAX_FEE_PER_SUBJECT) {
    return { ok: false, error: `Enter the fee per subject: more than 0 and at most ${MAX_FEE_PER_SUBJECT}` };
  }

  const email = text(b.email).toLowerCase();
  if (email && (email.length > 254 || !EMAIL.test(email) || email.endsWith(PLACEHOLDER_DOMAIN))) {
    return { ok: false, error: "That email address does not look right" };
  }

  const value: EnrolInput = { familyId, childName, classIds, feePerSubject: Math.round(fee * 100) / 100 };
  const parentName = text(b.parentName);
  const phone = text(b.phone);
  if (parentName) value.parentName = parentName.slice(0, 120);
  if (phone) value.phone = phone.slice(0, 40);
  if (email) value.email = email;
  return { ok: true, value };
}

/** The last 9 digits of a phone number, so +254 712 345 678, 0712 345 678 and 712345678 are the same number. Fewer than 9 digits: null. */
export function lastNineDigits(phone: unknown): string | null {
  const digits = typeof phone === "string" ? phone.replace(/\D/g, "") : "";
  return digits.length >= 9 ? digits.slice(-9) : null;
}

/** The ids of the profiles whose phone number is the same as `phone`. */
export function loginsWithPhone(profiles: { id: string; phone_number: string | null }[], phone: unknown): string[] {
  const wanted = lastNineDigits(phone);
  if (!wanted) return [];
  return profiles.filter((p) => lastNineDigits(p.phone_number) === wanted).map((p) => p.id);
}

/** Today in Nairobi as YYYY-MM-DD. */
export function nairobiToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export const sameSet = (a: string[], b: string[]): boolean => a.length === b.length && a.every((x) => b.includes(x));
