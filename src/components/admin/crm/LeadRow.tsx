import { useNavigate } from "react-router-dom";
import { Phone, MessageCircle, AlertCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { LeadWithFamily } from "./crmTypes";
import {
  ageLabel,
  channelLabel,
  dueState,
  formatDue,
  formatPhone,
  stageClass,
  stageLabel,
  telLink,
  waLink,
} from "./crmMeta";

interface LeadRowProps {
  lead: LeadWithFamily;
  ownerName?: string;
  showStage?: boolean;
  showChannel?: boolean;
  /** A narrower card, for the desktop board. */
  compact?: boolean;
}

/**
 * One lead in a list. Phone first: the whole row opens the family, and the two
 * buttons beside it start a call or a WhatsApp chat without leaving the list.
 */
export function LeadRow({
  lead,
  ownerName,
  showStage = true,
  showChannel = true,
  compact = false,
}: LeadRowProps) {
  const navigate = useNavigate();
  const family = lead.families;
  const name = family?.parent_name || lead.student_name || formatPhone(family?.phone) || "Unnamed lead";
  const open = () => navigate(`/admin/families/${lead.family_id}`);
  const due = dueState(lead.next_step_at);

  const details = [
    lead.student_name,
    lead.grade_level,
    lead.subjects?.length ? lead.subjects.join(", ") : null,
  ].filter(Boolean);

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      }}
      className="group flex cursor-pointer items-start gap-3 rounded-lg border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-accent/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="truncate text-sm font-semibold text-foreground">{name}</span>
          {showStage && (
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                stageClass(lead.stage),
              )}
            >
              {stageLabel(lead.stage)}
            </span>
          )}
          {lead.needs_reply && (
            <Badge variant="destructive" className="h-4 px-1.5 text-[10px]">
              Needs reply
            </Badge>
          )}
          {showChannel && (
            <span className="text-[11px] text-muted-foreground">{channelLabel(lead.channel)}</span>
          )}
        </div>

        {details.length > 0 && (
          <p className="truncate text-xs text-muted-foreground">{details.join(" · ")}</p>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
          {lead.next_step ? (
            <span
              className={cn(
                "inline-flex items-start gap-1",
                due === "overdue" && "text-destructive",
                due === "today" && "text-amber-700",
                due === "later" && "text-muted-foreground",
                due === "none" && "text-muted-foreground",
              )}
            >
              <Clock className="mt-0.5 h-3 w-3 shrink-0" />
              <span className="min-w-0 break-words">
                {lead.next_step}
                {lead.next_step_at && (
                  <span className={compact ? "block text-[11px] opacity-80" : ""}>
                    {compact ? "" : "· "}
                    {formatDue(lead.next_step_at)}
                  </span>
                )}
              </span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-amber-700">
              <AlertCircle className="h-3 w-3" /> No next step
            </span>
          )}
          {lead.stage === "new" && (
            <span className="text-muted-foreground">{ageLabel(lead.created_at)}</span>
          )}
          {ownerName && !compact && <span className="text-muted-foreground">{ownerName}</span>}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {telLink(family?.phone) && (
          <a
            href={telLink(family?.phone) ?? undefined}
            onClick={(e) => e.stopPropagation()}
            className="rounded-md border p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label={`Call ${name}`}
          >
            <Phone className="h-4 w-4" />
          </a>
        )}
        {waLink(family?.phone) && (
          <a
            href={waLink(family?.phone) ?? undefined}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="rounded-md border p-2 text-emerald-700 hover:bg-emerald-50"
            aria-label={`WhatsApp ${name}`}
          >
            <MessageCircle className="h-4 w-4" />
          </a>
        )}
      </div>
    </div>
  );
}
