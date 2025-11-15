import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Gift, Sparkles, Calendar } from "lucide-react";

interface HolidayPackageBannerProps {
  onViewPackages?: () => void;
}

export const HolidayPackageBanner = ({ onViewPackages }: HolidayPackageBannerProps) => {
  return (
    <Alert className="border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-background">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/20 mt-1">
          <Gift className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 space-y-2">
          <AlertTitle className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            December Holiday Revision Packages Available!
          </AlertTitle>
          <AlertDescription className="space-y-2">
            <p className="text-sm">
              Get ready for your exams with our intensive December revision packages designed for candidate years. 
              Save up to 25% on bundles with expert tutors.
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Valid Dec 1 - Jan 15
              </span>
              <span>•</span>
              <span>8-4-4 Form 4</span>
              <span>•</span>
              <span>CBC Grades 6 & 9</span>
              <span>•</span>
              <span>IGCSE & A-Levels</span>
              <span>•</span>
              <span>IB Years 11-13</span>
            </div>
            {onViewPackages && (
              <Button 
                onClick={onViewPackages}
                className="mt-3"
                size="sm"
              >
                View Holiday Packages
              </Button>
            )}
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
};
