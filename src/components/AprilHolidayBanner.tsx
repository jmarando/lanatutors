import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users, GraduationCap, ArrowRight } from "lucide-react";

interface AprilHolidayBannerProps {
  onViewCampaign: () => void;
}

export const AprilHolidayBanner = ({ onViewCampaign }: AprilHolidayBannerProps) => {
  return (
    <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border-primary/20 overflow-hidden">
      <CardContent className="p-8">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-6 w-6 text-primary" />
              <span className="text-sm font-semibold text-primary uppercase tracking-wide">
                April Holiday 2026
              </span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold">
              April Holiday Revision Packages
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Don't let the holiday slip by. Give your child a head start for Term 2 with personalised 1-on-1 revision sessions from expert tutors.
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              <div className="flex items-center gap-2 mr-2">
                <GraduationCap className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Curricula:</span>
              </div>
              {["CBC", "8-4-4", "IGCSE", "IB"].map((curriculum) => (
                <Badge key={curriculum} variant="secondary" className="text-xs">
                  {curriculum}
                </Badge>
              ))}
            </div>

            <div className="flex flex-wrap gap-4 md:gap-6 pt-2">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">1-on-1 sessions</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">Flexible scheduling</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-primary">From KES 1,500/hr</span>
              </div>
            </div>
          </div>
          <div className="flex-shrink-0">
            <Button
              size="lg"
              onClick={onViewCampaign}
              className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all"
            >
              View Packages
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
