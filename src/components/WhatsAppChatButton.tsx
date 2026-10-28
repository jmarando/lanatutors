import { useEffect, useRef, useState } from "react";
import { analytics } from "@/utils/analytics";
import { CalendarCheck, ClipboardList, Users, GraduationCap, X } from "lucide-react";

const PHONE_NUMBER = "254117512316";

const options = [
  {
    icon: CalendarCheck,
    label: "Book an assessment call",
    message: "Hi Lana Tutors! I'd like to book a 20-minute assessment call.",
  },
  {
    icon: ClipboardList,
    label: "Get a custom learning plan",
    message: "Hi Lana Tutors! I'd like a custom learning plan for my child.",
  },
  {
    icon: Users,
    label: "Talk to a learning coordinator",
    message: "Hi Lana Tutors! Please have a learning coordinator call me back.",
  },
  {
    icon: GraduationCap,
    label: "Apply to teach with us",
    message: "Hi Lana Tutors! I'd like to apply to become a tutor.",
  },
];

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const WhatsAppChatButton = () => {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const startChat = (message: string) => {
    analytics.whatsappChatClick();
    window.open(`https://wa.me/${PHONE_NUMBER}?text=${encodeURIComponent(message)}`, "_blank");
    setOpen(false);
  };

  return (
    <div ref={panelRef} className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="w-[min(20rem,calc(100vw-3rem))] overflow-hidden rounded-2xl bg-card shadow-[0_18px_50px_-12px_rgba(0,0,0,0.35)] animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="bg-primary px-5 py-4 text-primary-foreground">
            <p className="text-lg font-semibold leading-tight">Chat with Lana Tutors</p>
            <p className="text-sm opacity-85">Typically replies within minutes</p>
          </div>
          <ul className="divide-y divide-border">
            {options.map(({ icon: Icon, label, message }) => (
              <li key={label}>
                <button
                  onClick={() => startChat(message)}
                  className="flex w-full items-center gap-3 px-5 py-4 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted active:scale-[0.99]"
                >
                  <Icon className="h-5 w-5 shrink-0 text-primary" strokeWidth={1.75} />
                  <span className="text-pretty">{label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Close chat menu" : "Chat with us on WhatsApp"}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform duration-200 hover:scale-105 active:scale-[0.96] hover:bg-[#1eb85a]"
      >
        <span className="relative flex h-7 w-7 items-center justify-center">
          <WhatsAppIcon
            className={`absolute h-7 w-7 fill-current transition-[opacity,transform,filter] duration-200 ease-[cubic-bezier(0.2,0,0,1)] ${
              open ? "scale-[0.25] opacity-0 blur-[4px]" : "scale-100 opacity-100 blur-0"
            }`}
          />
          <X
            className={`absolute h-6 w-6 transition-[opacity,transform,filter] duration-200 ease-[cubic-bezier(0.2,0,0,1)] ${
              open ? "scale-100 opacity-100 blur-0" : "scale-[0.25] opacity-0 blur-[4px]"
            }`}
          />
        </span>
      </button>
    </div>
  );
};

export default WhatsAppChatButton;
