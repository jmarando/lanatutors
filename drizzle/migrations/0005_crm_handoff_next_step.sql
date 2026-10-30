-- CRM follow-up: the automatic "Reply to the WhatsApp hand-off" next step clears once the family
-- is no longer waiting, instead of sitting on Today as overdue after the team has answered.
-- Safe to run more than once.

-- Lead stage bookkeeping. Set crm.quiet = on to skip the timeline entry (used by the backfill).
-- The hand-off step only stands while the lead needs a reply: a team reply, a call that reached
-- the family, resuming the assistant or closing the lead all clear needs_reply, and with it this
-- step, even when the Log call form writes it back. A step the team typed is left alone.
CREATE OR REPLACE FUNCTION public.crm_leads_before_update()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.stage IS DISTINCT FROM OLD.stage THEN
    IF NEW.stage = 'won' THEN NEW.won_at := coalesce(NEW.won_at, now()); END IF;
    IF NEW.stage = 'lost' THEN NEW.lost_at := coalesce(NEW.lost_at, now()); END IF;
    IF NEW.stage IN ('won', 'lost') THEN NEW.needs_reply := false; END IF;
    IF NEW.stage NOT IN ('won', 'lost') THEN
      NEW.won_at := NULL; NEW.lost_at := NULL; NEW.lost_reason := NULL;
    END IF;
  END IF;
  IF NOT NEW.needs_reply AND NEW.next_step = 'Reply to the WhatsApp hand-off' THEN
    NEW.next_step := NULL;
    NEW.next_step_at := NULL;
  END IF;
  RETURN NEW;
END $$;

-- Leads the old rule left with a hand-off step after the family had been answered.
UPDATE public.leads SET next_step = NULL, next_step_at = NULL
WHERE NOT needs_reply AND next_step = 'Reply to the WhatsApp hand-off';
