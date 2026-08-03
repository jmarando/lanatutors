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

/** Fired when a parent completes an assessment-call booking. */
export function trackConsultationBooked(params?: Record<string, unknown>) {
  trackMetaEvent("Schedule", { content_name: "Assessment Call", ...params });
  trackMetaEvent("Lead", { content_name: "Assessment Call", ...params });
}
