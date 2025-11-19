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

  useEffect(() => {
    const fetchCurrency = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data } = await supabase
        .from('profiles')
        .select('preferred_currency')
        .eq('id', user.id)
        .single();

      if (data?.preferred_currency) {
        setPreferredCurrency(data.preferred_currency as Currency);
        
        if (data.preferred_currency !== 'KES') {
          const { amount } = await convertFromKES(amountKES, data.preferred_currency as Currency);
          setConvertedAmount(amount);
        }
      }
      
      setIsLoading(false);
    };

    fetchCurrency();
  }, [user, amountKES]);

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
