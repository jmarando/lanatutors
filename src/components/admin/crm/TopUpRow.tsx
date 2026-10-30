import { useNavigate } from "react-router-dom";
import { MessageCircle, Phone } from "lucide-react";
import type { EnrolmentBalance } from "./crmTypes";
import { formatPhone, telLink, waLink } from "./crmMeta";
import { formatKes } from "./lessonsLogic";

/** A family down to its last prepaid session: the whole row opens the family; the buttons call. */
export function TopUpRow({ balance }: { balance: EnrolmentBalance }) {
  const navigate = useNavigate();
  const name = balance.family_name || formatPhone(balance.family_phone) || "Family";
  const left = balance.sessions_left;
  const label = left < 0 ? `${-left} over` : left === 0 ? "No sessions left" : "1 session left";
  const open = () => navigate(`/admin/families/${balance.family_id}`);

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
      className="flex cursor-pointer items-start gap-3 rounded-lg border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-accent/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="truncate text-sm font-semibold">{name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {[balance.student_name, balance.subject].filter(Boolean).join(" · ")}
        </p>
        <p className="text-[11px] text-amber-700">
          {label}
          {Number(balance.balance) < 0
            ? ` · owes ${formatKes(-Number(balance.balance))}`
            : ` · ${formatKes(balance.balance)} credit`}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {telLink(balance.family_phone) && (
          <a
            href={telLink(balance.family_phone) ?? undefined}
            onClick={(e) => e.stopPropagation()}
            className="rounded-md border p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label={`Call ${name}`}
          >
            <Phone className="h-4 w-4" />
          </a>
        )}
        {waLink(balance.family_phone) && (
          <a
            href={waLink(balance.family_phone) ?? undefined}
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
