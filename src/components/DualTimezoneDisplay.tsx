import { useEffect, useState } from "react";
import { formatDualTimezone, EAT_TIMEZONE, isUserInEAT } from "@/utils/timezoneUtils";
import { Clock, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface DualTimezoneDisplayProps {
  date: Date;
  format?: string;
  showIcon?: boolean;
  className?: string;
}

export const DualTimezoneDisplay = ({ 
  date, 
  format = 'h:mm a',
  showIcon = true,
  className = ""
}: DualTimezoneDisplayProps) => {
  const { user } = useAuth();
  const [userTimezone, setUserTimezone] = useState<string>(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );

  useEffect(() => {
    const fetchTimezone = async () => {
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('timezone')
        .eq('id', user.id)
        .single();

      if (data?.timezone) {
        setUserTimezone(data.timezone);
      }
    };

    fetchTimezone();
  }, [user]);

  const isEAT = userTimezone === EAT_TIMEZONE || isUserInEAT();
  const times = formatDualTimezone(date, userTimezone, format);

  // If user is in EAT, just show one timezone
  if (isEAT) {
    return (
      <span className={className}>
        {showIcon && <Clock className="w-4 h-4 inline mr-1" />}
        {times.eatTime} EAT
      </span>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showIcon && <Globe className="w-4 h-4 text-primary" />}
      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
        <Badge variant="secondary" className="text-xs">
          {times.userTime} {times.userTz}
        </Badge>
        <span className="text-xs text-muted-foreground hidden sm:inline">•</span>
        <span className="text-xs text-muted-foreground">
          {times.eatTime} EAT
        </span>
      </div>
    </div>
  );
};
