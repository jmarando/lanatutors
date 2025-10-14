import { Badge } from "@/components/ui/badge";
import { Award, Crown, Medal } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type TutorTier = "bronze" | "silver" | "gold";

interface TutorTierBadgeProps {
  tier: TutorTier;
  showRate?: boolean;
  showTooltip?: boolean;
  size?: "sm" | "md" | "lg";
}

const tierConfig = {
  gold: {
    label: "Gold Tier",
    rate: "KES 2,000/hr",
    icon: Crown,
    className: "bg-gradient-to-r from-yellow-500 to-yellow-600 text-white border-yellow-400",
    iconColor: "text-yellow-200",
    description: "Elite tutors with 5+ years experience, exceptional ratings (4.8+), and expertise in advanced curricula (IGCSE, IB, A-Level)",
  },
  silver: {
    label: "Silver Tier",
    rate: "KES 1,750/hr",
    icon: Award,
    className: "bg-gradient-to-r from-gray-400 to-gray-500 text-white border-gray-300",
    iconColor: "text-gray-100",
    description: "Experienced tutors with 3-5 years, strong ratings (4.5+), and solid credentials",
  },
  bronze: {
    label: "Bronze Tier",
    rate: "KES 1,500/hr",
    icon: Medal,
    className: "bg-gradient-to-r from-orange-600 to-orange-700 text-white border-orange-500",
    iconColor: "text-orange-200",
    description: "Qualified tutors building their experience, perfect for foundational learning",
  },
};

export const TutorTierBadge = ({ tier, showRate = false, showTooltip = true, size = "md" }: TutorTierBadgeProps) => {
  const config = tierConfig[tier];
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-3 py-1",
    lg: "text-base px-4 py-1.5",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  const badge = (
    <Badge className={`${config.className} ${sizeClasses[size]} font-semibold flex items-center gap-1.5`}>
      <Icon className={`${iconSizes[size]} ${config.iconColor}`} />
      <span>{config.label}</span>
      {showRate && <span className="ml-1 opacity-90">• {config.rate}</span>}
    </Badge>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="text-sm">{config.description}</p>
          <p className="text-xs mt-1 font-semibold">{config.rate} per hour</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export const TierExplainer = () => {
  return (
    <div className="bg-muted/30 rounded-lg p-6 space-y-4">
      <h3 className="text-lg font-bold flex items-center gap-2">
        <Award className="w-5 h-5 text-primary" />
        Our Tutor Tiers
      </h3>
      <p className="text-sm text-muted-foreground">
        All tutors are verified and qualified. Tiers reflect experience, ratings, and curriculum expertise to help you find the right match.
      </p>
      <div className="space-y-3">
        {(Object.entries(tierConfig) as [TutorTier, typeof tierConfig.gold][]).map(([tierKey, tierInfo]) => {
          const Icon = tierInfo.icon;
          return (
            <div key={tierKey} className="flex items-start gap-3 p-3 bg-background rounded-md">
              <Icon className={`w-5 h-5 mt-0.5 ${tierInfo.iconColor.replace('text-', 'text-opacity-100 ')}`} />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-semibold text-sm">{tierInfo.label}</h4>
                  <span className="text-sm font-bold text-primary">{tierInfo.rate}</span>
                </div>
                <p className="text-xs text-muted-foreground">{tierInfo.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
