/**
 * Meta (Facebook) Pixel helper.
 *
 * Paste your Pixel ID below (Meta Events Manager -> Data sources -> your pixel).
 * Leaving it empty disables tracking safely.
 */
export const META_PIXEL_ID = "1806197037029344";

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & { queue?: unknown[] };
    _fbq?: unknown;
  }
}

let initialized = false;

export function initMetaPixel() {
  if (!META_PIXEL_ID || initialized || typeof window === "undefined") return;
  initialized = true;

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const w = window as any;
  if (!w.fbq) {
    const n: any = (w.fbq = function (...args: unknown[]) {
      n.callMethod ? n.callMethod.apply(n, args) : n.queue.push(args);
    });
    if (!w._fbq) w._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */

  window.fbq?.("init", META_PIXEL_ID);
  window.fbq?.("track", "PageView");
}

/** Track a standard or custom Meta event. */
export function trackMetaEvent(event: string, params?: Record<string, unknown>) {
  if (!META_PIXEL_ID) return;
  window.fbq?.("track", event, params);
}

/** Read a browser cookie (used for Meta's _fbp / _fbc de-duplication IDs). */
function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

/**
 * Server-side (Conversions API) copy of a browser event.
 * Same event_id as the pixel event so Meta de-duplicates them.
 */
export async function sendServerEvent(
  eventName: string,
  opts: {
    eventId: string;
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    customData?: Record<string, unknown>;
  },
) {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    await supabase.functions.invoke("meta-capi", {
      body: {
        event_name: eventName,
        event_id: opts.eventId,
        event_source_url: typeof window !== "undefined" ? window.location.href : undefined,
        email: opts.email,
        phone: opts.phone,
        first_name: opts.firstName,
        last_name: opts.lastName,
        fbp: getCookie("_fbp"),
        fbc: getCookie("_fbc"),
        custom_data: opts.customData ?? {},
      },
    });
  } catch (e) {
    console.error("Meta CAPI send failed:", e);
  }
}

const firedOnce = new Set<string>();

/** Fired when a parent completes an assessment-call booking. */
export function trackConsultationBooked(
  params?: Record<string, unknown>,
  contact?: { email?: string; phone?: string; firstName?: string; lastName?: string },
) {
  const key = `schedule:${JSON.stringify(params ?? {})}`;
  if (firedOnce.has(key)) return;
  firedOnce.add(key);

  const base = { content_name: "Assessment Call", ...params };
  const scheduleId = `schedule-${key}`;
  const leadId = `lead-${key}`;

  // Browser pixel (with explicit eventID so the server copy de-duplicates)
  window.fbq?.("track", "Schedule", base, { eventID: scheduleId });
  window.fbq?.("track", "Lead", base, { eventID: leadId });

  // Server-side Conversions API copies
  void sendServerEvent("Schedule", { eventId: scheduleId, ...contact, customData: base });
  void sendServerEvent("Lead", { eventId: leadId, ...contact, customData: base });
}

