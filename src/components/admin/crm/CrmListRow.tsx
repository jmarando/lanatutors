import type { KeyboardEvent, MouseEvent } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { MessagesSquare, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { familyName, type PillTone } from "./crmListRules";
import { channelLabel, stageClass, stageLabel, telLink, waLink } from "./crmMeta";
import type { LeadWithFamily } from "./crmTypes";

const TONE: Record<PillTone, string> = {
  red: "bg-red-100 text-red-700",
  amber: "bg-orange-100 text-orange-800",
  neutral: "bg-slate-100 text-slate-700",
};

interface CrmListRowProps {
  lead: LeadWithFamily;
  pill: { text: string; tone: PillTone } | null;
  ownerName: string | null;
  onOpen: () => void;
}

const stop = (e: MouseEvent) => e.stopPropagation();

/** Call and WhatsApp for a row, usable without opening the panel; disabled when the family has no number. */
function ReachOut({ phone, name }: { phone: string | null | undefined; name: string }) {
  const tel = telLink(phone);
  const wa = waLink(phone);
  const base = "flex h-8 w-8 items-center justify-center rounded-full border bg-background text-teal-700";
  const off = cn(base, "cursor-not-allowed opacity-40");
  return (
    <div className="flex shrink-0 gap-1.5">
      {tel ? (
        <a href={tel} onClick={stop} aria-label={`Call ${name}`} className={cn(base, "hover:bg-teal-50")}>
          <Phone className="h-3.5 w-3.5" />
        </a>
      ) : (
        <span role="link" aria-disabled="true" aria-label={`Call ${name}`} title="No phone number" className={off}>
          <Phone className="h-3.5 w-3.5" />
        </span>
      )}
      {wa ? (
        <a href={wa} onClick={stop} target="_blank" rel="noreferrer" aria-label={`WhatsApp ${name}`} className={cn(base, "hover:bg-teal-50")}>
          <MessagesSquare className="h-3.5 w-3.5" />
        </a>
      ) : (
        <span role="link" aria-disabled="true" aria-label={`WhatsApp ${name}`} title="No phone number" className={off}>
          <MessagesSquare className="h-3.5 w-3.5" />
        </span>
      )}
    </div>
  );
}

/** One family in the CRM list: a table row from md up, a card below it. Clicking it opens the family's panel. */
export function CrmListRow({ lead, pill, ownerName, onOpen }: CrmListRowProps) {
  const name = familyName(lead);
  const child = [lead.student_name, (lead.subjects ?? []).join(", "), lead.grade_level].filter(Boolean).join(" · ");
  const cameIn = formatDistanceToNowStrict(new Date(lead.created_at), { addSuffix: true });
  const phone = lead.families?.phone;
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen();
    }
  };
  const stagePill = (
    <span className={cn("inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold", stageClass(lead.stage))}>
      {stageLabel(lead.stage)}
    </span>
  );
  const nextPill = pill ? (
    <span className={cn("inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold", TONE[pill.tone])}>{pill.text}</span>
  ) : (
    <span className="text-xs text-muted-foreground">—</span>
  );

  return (
    <li
      role="button"
      tabIndex={0}
      aria-label={`Open ${name}`}
      data-family-id={lead.family_id}
      onClick={onOpen}
      onKeyDown={onKey}
      className="cursor-pointer border-b last:border-b-0 hover:bg-muted/40 focus:bg-muted/40 focus:outline-none"
    >
      <div className="hidden items-center gap-3 px-4 py-3 text-sm md:grid md:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1.7fr)_minmax(0,1.1fr)_minmax(0,0.8fr)_auto]">
        <div className="min-w-0">
          <p className="truncate font-semibold">{name}</p>
          <p className="truncate text-xs text-muted-foreground">{child || "No child details yet"}</p>
        </div>
        <div>{stagePill}</div>
        <div className="min-w-0">{nextPill}</div>
        <div className="min-w-0">
          <p className="truncate">{cameIn}</p>
          <p className="truncate text-xs text-muted-foreground">{channelLabel(lead.channel)}</p>
        </div>
        <div className="truncate text-muted-foreground">{ownerName ?? "—"}</div>
        <ReachOut phone={phone} name={name} />
      </div>

      <div className="space-y-2 px-4 py-3 md:hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-semibold">{name}</p>
            <p className="truncate text-xs text-muted-foreground">{child || "No child details yet"}</p>
          </div>
          <ReachOut phone={phone} name={name} />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {stagePill}
          {nextPill}
        </div>
        <p className="text-xs text-muted-foreground">
          {cameIn} · {channelLabel(lead.channel)}
          {ownerName ? ` · ${ownerName}` : ""}
        </p>
      </div>
    </li>
  );
}
