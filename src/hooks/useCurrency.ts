import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Currency, SUPPORTED_CURRENCIES, convertFromKES } from "@/utils/currencyUtils";
import { useAuth } from "@/contexts/AuthContext";

interface UseCurrencyReturn {
  currency: Currency;
  isLoading: boolean;
  formatPrice: (amountKES: number) => string;
  convertPrice: (amountKES: number) => Promise<number>;
  symbol: string;
}

export const useCurrency = (): UseCurrencyReturn => {
  const { user } = useAuth();
  const [currency, setCurrency] = useState<Currency>('KES');
  const [isLoading, setIsLoading] = useState(true);
  const [conversionCache, setConversionCache] = useState<Map<number, number>>(new Map());

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
        setCurrency(data.preferred_currency as Currency);
      }
      
      setIsLoading(false);
    };

    fetchCurrency();
  }, [user]);

  const convertPrice = async (amountKES: number): Promise<number> => {
    if (currency === 'KES') return amountKES;
    
    // Check cache first
    const cacheKey = amountKES * 1000 + currency.charCodeAt(0);
    if (conversionCache.has(cacheKey)) {
      return conversionCache.get(cacheKey)!;
    }
    
    const { amount } = await convertFromKES(amountKES, currency);
    
    // Update cache
    setConversionCache(prev => new Map(prev).set(cacheKey, amount));
    
    return amount;
  };

  const formatPrice = (amountKES: number): string => {
    // For synchronous formatting, we show KES amount with currency symbol
    // Real conversion happens async - use PriceDisplay component for converted prices
    const currencyInfo = SUPPORTED_CURRENCIES[currency];
    
    if (currency === 'KES') {
      return `${currencyInfo.symbol}${amountKES.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      })}`;
    }
    
    // For non-KES, show KES with note that it will be converted
    return `KES ${amountKES.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}`;
  };

  return {
    currency,
    isLoading,
    formatPrice,
    convertPrice,
    symbol: SUPPORTED_CURRENCIES[currency].symbol,
  };
};
