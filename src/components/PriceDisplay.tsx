import { useEffect, useState } from "react";
import { convertFromKES, formatCurrency, Currency } from "@/utils/currencyUtils";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface PriceDisplayProps {
  amountKES: number;
  className?: string;
  showOriginal?: boolean;
}

export const PriceDisplay = ({ amountKES, className = "", showOriginal = false }: PriceDisplayProps) => {
  const { user } = useAuth();
  const [preferredCurrency, setPreferredCurrency] = useState<Currency>('KES');
  const [convertedAmount, setConvertedAmount] = useState<number>(amountKES);
  const [isLoading, setIsLoading] = useState(true);

  const userId = user?.id;

  useEffect(() => {
    let cancelled = false;

    const applyCurrency = async (currency: Currency) => {
      if (cancelled) return;
      setPreferredCurrency(currency);
      if (currency !== 'KES') {
        const { amount } = await convertFromKES(amountKES, currency);
        if (!cancelled) setConvertedAmount(amount);
      } else {
        setConvertedAmount(amountKES);
      }
    };

    const fetchCurrency = async () => {
      if (!userId) {
        setIsLoading(false);
        return;
      }

      const { data } = await supabase
        .from('profiles')
        .select('preferred_currency')
        .eq('id', userId)
        .single();

      if (data?.preferred_currency) {
        await applyCurrency(data.preferred_currency as Currency);
      }

      if (!cancelled) setIsLoading(false);
    };

    fetchCurrency();

    const onCurrencyChanged = (e: Event) => {
      const next = (e as CustomEvent).detail as Currency;
      if (next) applyCurrency(next);
    };
    window.addEventListener('lana-currency-changed', onCurrencyChanged);

    return () => {
      cancelled = true;
      window.removeEventListener('lana-currency-changed', onCurrencyChanged);
    };
  }, [userId, amountKES]);

  if (isLoading) {
    return <Skeleton className="h-6 w-20" />;
  }

  return (
    <span className={className}>
      {formatCurrency(convertedAmount, preferredCurrency)}
      {showOriginal && preferredCurrency !== 'KES' && (
        <span className="text-xs text-muted-foreground ml-1">
          ({formatCurrency(amountKES, 'KES')})
        </span>
      )}
    </span>
  );
};
