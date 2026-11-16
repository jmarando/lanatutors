import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { sendCrmEvent, splitName } from "@/utils/metaCrm";
import type { ChildFields } from "./ChildDetails";
import { metaStageFor, stageLabel } from "./crmMeta";
import type { Lead, LeadUpdate, Stage } from "./crmTypes";
import { crmConsultations, crmDb } from "./crmTypes";
import { useFamily } from "./useCrmData";

/**
 * One family, and what the team does with it: the lead that is open (else the newest), the latest meeting link, saving the
 * lead (with the Meta event a stage change sends), the child's details, and the Log call and Won/Lost dialogs' state. The
 * family page and the CRM list's panel both use it, so the two behave the same.
 */
export function useFamilyActions(familyId: string | undefined) {
  const { data, loading, error, reload } = useFamily(familyId);
  const [logging, setLogging] = useState(false);
  const [closing, setClosing] = useState<"won" | "lost" | null>(null);
  const [savingLead, setSavingLead] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [meetingLink, setMeetingLink] = useState<string | null>(null);

  const family = data.family;
  const activeLead: Lead | null = useMemo(() => {
    const open = data.leads.find(
      (l) => l.stage !== "won" && l.stage !== "lost",
    );
    return open ?? data.leads[0] ?? null;
  }, [data.leads]);

  const earlierLeads = data.leads.filter((l) => l.id !== activeLead?.id);

  useEffect(() => {
    if (!familyId) return;
    let active = true;
    void (async () => {
      const { data: booking } = await crmConsultations
        .from("consultation_bookings")
        .select("meeting_link")
        .eq("family_id", familyId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (active) setMeetingLink(booking?.meeting_link ?? null);
    })();
    return () => {
      active = false;
    };
  }, [familyId, data.leads.length]);

  const fireMeta = (stage: Stage) => {
    if (!activeLead) return;
    const meta = metaStageFor(stage);
    if (!meta) return;
    const name = splitName(family?.parent_name);
    void sendCrmEvent(meta, {
      recordId: activeLead.id,
      phone: family?.phone,
      firstName: name.firstName,
      lastName: name.lastName,
      value: activeLead.quoted_rate_kes ?? undefined,
    });
  };

  const patchLead = async (patch: LeadUpdate, successMessage?: string) => {
    if (!activeLead) return false;
    setSavingLead(true);
    const { error: err } = await crmDb.from("leads").update(patch).eq("id", activeLead.id);
    setSavingLead(false);
    if (err) {
      toast.error(err.message);
      return false;
    }
    if (successMessage) toast.success(successMessage);
    await reload();
    return true;
  };

  const changeStage = async (value: string) => {
    if (value === "won" || value === "lost") {
      setClosing(value);
      return;
    }
    const saved = await patchLead({ stage: value as Stage }, `Moved to ${stageLabel(value)}`);
    if (saved) fireMeta(value as Stage);
  };

  // A family that has paid is a customer: offer the one-tap move to Won while the lead is still open.
  const suggestWon = () => {
    if (activeLead && activeLead.stage !== "won" && activeLead.stage !== "lost") {
      toast("This family has paid, but its lead is still open.", {
        action: { label: "Mark won", onClick: () => setClosing("won") },
        duration: 12000,
      });
    }
  };

  const saveDetails = async (fields: ChildFields) => {
    setSavingDetails(true);
    await patchLead(fields, "Child details saved");
    setSavingDetails(false);
  };

  return {
    data,
    loading,
    error,
    reload,
    family,
    activeLead,
    earlierLeads,
    meetingLink,
    savingLead,
    patchLead,
    changeStage,
    suggestWon,
    logging,
    setLogging,
    closing,
    setClosing,
    savingDetails,
    saveDetails,
  };
}
