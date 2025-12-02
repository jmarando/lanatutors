import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Clock, Users } from "lucide-react";

interface DecemberIntensiveBannerProps {
  onViewProgram: () => void;
}

export const DecemberIntensiveBanner = ({ onViewProgram }: DecemberIntensiveBannerProps) => {
  return (
    <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border-primary/20 overflow-hidden">
      <CardContent className="p-8">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-6 w-6 text-primary" />
              <span className="text-sm font-semibold text-primary uppercase tracking-wide">
                December 8-19, 2025
              </span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold">
              December Holiday Bootcamp
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Comprehensive 2-week revision program with 10 lessons per subject. Choose from Mathematics, Physics, Chemistry, Biology, English, and Kiswahili/TOK.
            </p>
            <div className="flex flex-wrap gap-6 pt-2">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">75-minute sessions</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">Max 20 students</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-primary">KES 4,000 per subject</span>
              </div>
            </div>
          </div>
          <div className="flex-shrink-0">
            <Button 
              size="lg" 
              onClick={onViewProgram}
              className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all"
            >
              View Program
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};