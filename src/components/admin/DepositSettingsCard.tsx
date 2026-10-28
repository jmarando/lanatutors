import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Percent, Loader2 } from "lucide-react";

/**
 * Admin control for the platform-wide default deposit percentage.
 * Individual learning plans can override this value.
 */
export const DepositSettingsCard = () => {
  const { toast } = useToast();
  const [value, setValue] = useState<string>("30");
  const [saved, setSaved] = useState<number>(30);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("deposit_percentage")
        .eq("id", "global")
        .maybeSingle();
      if (data?.deposit_percentage) {
        setValue(String(data.deposit_percentage));
        setSaved(data.deposit_percentage);
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async () => {
    const pct = Number(value);
    if (!Number.isFinite(pct) || pct < 1 || pct > 100) {
      toast({
        title: "Invalid percentage",
        description: "Enter a number between 1 and 100.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("platform_settings")
      .upsert({ id: "global", deposit_percentage: Math.round(pct) });
    setSaving(false);

    if (error) {
      toast({
        title: "Could not save",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setSaved(Math.round(pct));
    toast({
      title: "Deposit updated",
      description: `New bookings, packages and invoices will use a ${Math.round(pct)}% deposit.`,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Percent className="h-4 w-4 text-primary" />
          Deposit percentage
        </CardTitle>
        <CardDescription>
          Used everywhere a deposit option is offered — invoices, bookings, packages and learning
          plans. Individual learning plans can still use their own percentage.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-2">
            <Label htmlFor="deposit-pct">Default deposit (%)</Label>
            <Input
              id="deposit-pct"
              type="number"
              min={1}
              max={100}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-32"
              disabled={loading}
            />
          </div>
          <Button onClick={handleSave} disabled={saving || loading || Number(value) === saved}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
          <p className="text-sm text-muted-foreground pb-2">
            Currently {saved}% deposit, {100 - saved}% balance.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default DepositSettingsCard;
