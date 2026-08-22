import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const DEFAULT_DEPOSIT_PERCENTAGE = 30;

/**
 * Reads the platform-wide default deposit percentage.
 * Pass an override (e.g. a learning plan's own deposit_percentage) to prefer it.
 */
export const useDepositPercentage = (override?: number | null) => {
  const [percentage, setPercentage] = useState<number>(DEFAULT_DEPOSIT_PERCENTAGE);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("deposit_percentage")
        .eq("id", "global")
        .maybeSingle();

      if (!active) return;
      if (data?.deposit_percentage) setPercentage(data.deposit_percentage);
      setIsLoading(false);
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const effective =
    override && override > 0 && override <= 100 ? override : percentage;

  return {
    depositPercentage: effective,
    depositRate: effective / 100,
    isLoading,
  };
};
