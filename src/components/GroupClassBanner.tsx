import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Users, Sparkles, Clock } from "lucide-react";

interface GroupClassBannerProps {
  onViewClasses?: () => void;
}

export const GroupClassBanner = ({ onViewClasses }: GroupClassBannerProps) => {
  return (
    <Alert className="border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-background">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/20 mt-1">
          <Users className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 space-y-2">
          <AlertTitle className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Affordable Group Classes Now Available!
          </AlertTitle>
          <AlertDescription className="space-y-2">
            <p className="text-sm">
              Join small group learning sessions from just KES 400/hr. 
              Learn collaboratively with peers while keeping costs low. Perfect for students who thrive in group settings.
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Weekly sessions
              </span>
              <span>•</span>
              <span>Small class sizes</span>
              <span>•</span>
              <span>All curricula</span>
              <span>•</span>
              <span>Multiple subjects</span>
              <span>•</span>
              <span>Expert tutors</span>
            </div>
            {onViewClasses && (
              <Button 
                onClick={onViewClasses}
                className="mt-3"
                size="sm"
              >
                Browse Group Classes
              </Button>
            )}
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
};
