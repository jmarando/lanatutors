import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COMMON_TIMEZONES } from "@/utils/timezoneUtils";

interface TimezoneSelectorProps {
  value: string;
  onChange: (timezone: string) => void;
  className?: string;
}

export const TimezoneSelector = ({ value, onChange, className }: TimezoneSelectorProps) => {
  // Group timezones by region
  const groupedTimezones = COMMON_TIMEZONES.reduce((acc, tz) => {
    if (!acc[tz.region]) {
      acc[tz.region] = [];
    }
    acc[tz.region].push(tz);
    return acc;
  }, {} as Record<string, typeof COMMON_TIMEZONES>);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className}>
        <SelectValue>
          {COMMON_TIMEZONES.find(tz => tz.value === value)?.label || value}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {Object.entries(groupedTimezones).map(([region, timezones]) => (
          <SelectGroup key={region}>
            <SelectLabel>{region}</SelectLabel>
            {timezones.map((tz) => (
              <SelectItem key={tz.value} value={tz.value}>
                {tz.label}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
};
