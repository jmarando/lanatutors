import { supabase } from "@/integrations/supabase/client";

export const SUPPORTED_CURRENCIES = {
  KES: { symbol: 'KES ', name: 'Kenyan Shilling', flag: '🇰🇪' },
  USD: { symbol: '$', name: 'US Dollar', flag: '🇺🇸' },
  EUR: { symbol: '€', name: 'Euro', flag: '🇪🇺' },
  GBP: { symbol: '£', name: 'British Pound', flag: '🇬🇧' },
  CAD: { symbol: 'C$', name: 'Canadian Dollar', flag: '🇨🇦' },
  AUD: { symbol: 'A$', name: 'Australian Dollar', flag: '🇦🇺' },
  UGX: { symbol: 'USh', name: 'Ugandan Shilling', flag: '🇺🇬' },
  TZS: { symbol: 'TSh', name: 'Tanzanian Shilling', flag: '🇹🇿' },
} as const;

export type Currency = keyof typeof SUPPORTED_CURRENCIES;

interface ExchangeRate {
  rate: number;
  updated_at: string;
}

let ratesCache: Map<string, ExchangeRate> = new Map();
let lastFetch: Date | null = null;
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

/**
 * Fetch exchange rates from database
 */
async function fetchExchangeRates(): Promise<Map<string, ExchangeRate>> {
  const { data, error } = await supabase
    .from('exchange_rates')
    .select('target_currency, rate, updated_at');

  if (error) {
    console.error('Error fetching exchange rates:', error);
    return ratesCache; // Return cached rates on error
  }

  const rates = new Map<string, ExchangeRate>();
  data?.forEach((rate) => {
    rates.set(rate.target_currency, {
      rate: Number(rate.rate),
      updated_at: rate.updated_at
    });
  });

  return rates;
}

/**
 * Get exchange rates (with caching)
 */
async function getExchangeRates(): Promise<Map<string, ExchangeRate>> {
  const now = new Date();
  
  // Return cached rates if fresh
  if (lastFetch && (now.getTime() - lastFetch.getTime()) < CACHE_DURATION) {
    return ratesCache;
  }

  // Fetch fresh rates
  ratesCache = await fetchExchangeRates();
  lastFetch = now;
  
  return ratesCache;
}

/**
 * Convert amount from KES to target currency
 */
export async function convertFromKES(
  amountKES: number,
  targetCurrency: Currency
): Promise<{ amount: number; rate: number }> {
  if (targetCurrency === 'KES') {
    return { amount: amountKES, rate: 1.0 };
  }

  const rates = await getExchangeRates();
  const rateData = rates.get(targetCurrency);
  
  if (!rateData) {
    console.warn(`No rate found for ${targetCurrency}, using 1:1`);
    return { amount: amountKES, rate: 1.0 };
  }

  const convertedAmount = amountKES * rateData.rate;
  
  return {
    amount: Math.round(convertedAmount * 100) / 100, // Round to 2 decimals
    rate: rateData.rate
  };
}

/**
 * Convert amount from any currency to KES
 */
export async function convertToKES(
  amount: number,
  fromCurrency: Currency
): Promise<{ amount: number; rate: number }> {
  if (fromCurrency === 'KES') {
    return { amount, rate: 1.0 };
  }

  const rates = await getExchangeRates();
  const rateData = rates.get(fromCurrency);
  
  if (!rateData) {
    console.warn(`No rate found for ${fromCurrency}, using 1:1`);
    return { amount, rate: 1.0 };
  }

  const amountKES = amount / rateData.rate;
  
  return {
    amount: Math.round(amountKES * 100) / 100,
    rate: rateData.rate
  };
}

/**
 * Format amount with currency symbol
 */
export function formatCurrency(amount: number, currency: Currency): string {
  const currencyInfo = SUPPORTED_CURRENCIES[currency];
  // KES doesn't use decimal places
  const decimals = currency === 'KES' ? 0 : 2;
  return `${currencyInfo.symbol}${amount.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })}`;
}

/**
 * Refresh exchange rates from API
 */
export async function refreshExchangeRates(): Promise<void> {
  try {
    await supabase.functions.invoke('fetch-exchange-rates');
    // Clear cache to force fresh fetch
    lastFetch = null;
  } catch (error) {
    console.error('Error refreshing exchange rates:', error);
  }
}
