import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SUPPORTED_CURRENCIES, Currency } from "@/utils/currencyUtils";

interface CurrencySelectorProps {
  value: Currency;
  onChange: (currency: Currency) => void;
  className?: string;
}

export const CurrencySelector = ({ value, onChange, className }: CurrencySelectorProps) => {
  return (
    <Select value={value} onValueChange={(val) => onChange(val as Currency)}>
      <SelectTrigger className={className}>
        <SelectValue>
          {SUPPORTED_CURRENCIES[value].flag} {value} - {SUPPORTED_CURRENCIES[value].name}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {Object.entries(SUPPORTED_CURRENCIES).map(([code, info]) => (
          <SelectItem key={code} value={code}>
            <span className="flex items-center gap-2">
              <span>{info.flag}</span>
              <span className="font-semibold">{code}</span>
              <span className="text-muted-foreground">- {info.name}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
