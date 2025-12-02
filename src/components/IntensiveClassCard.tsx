import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Check } from "lucide-react";
import { useState } from "react";

interface IntensiveClass {
  id: string;
  subject: string;
  curriculum: string;
  grade_levels: string[];
  time_slot: string;
  current_enrollment: number;
  max_students: number;
  focus_topics: string | null;
  tutor_id: string | null;
  tutor_name: string | null;
  tutor_avatar: string | null;
  session_topics: Record<string, string> | null;
}

interface IntensiveClassCardProps {
  subject: string;
  icon: string;
  classes: IntensiveClass[];
  isInCart: boolean;
  onAddToCart: () => void;
  weekDates: Array<{ day: string; date: string }>;
}

export const IntensiveClassCard = ({ 
  subject, 
  icon, 
  classes, 
  isInCart, 
  onAddToCart,
  weekDates 
}: IntensiveClassCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const firstClass = classes[0];
  const sessionTopics = firstClass.session_topics || {};
  const hasTopics = Object.keys(sessionTopics).length > 0;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-muted/30 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">{icon}</span>
              <h3 className="text-xl font-bold">{subject}</h3>
            </div>

            {/* Tutor Info */}
            <div className="flex items-center gap-2 mb-3">
              {firstClass.tutor_name ? (
                <>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={firstClass.tutor_avatar || undefined} />
                    <AvatarFallback className="text-xs">
                      {firstClass.tutor_name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-muted-foreground">
                    Taught by <span className="font-medium text-foreground">{firstClass.tutor_name}</span>
                  </span>
                </>
              ) : (
                <span className="text-sm text-muted-foreground italic">
                  Tutor: To be announced
                </span>
              )}
            </div>

          </div>

          {/* Add to cart button */}
          <Button
            variant={isInCart ? "secondary" : "default"}
            size="lg"
            onClick={onAddToCart}
            disabled={firstClass.current_enrollment >= firstClass.max_students}
            className="ml-4"
          >
            {isInCart ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Added
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Add to Cart
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {/* Focus topics display */}
        {firstClass.focus_topics && (
          <div className="mb-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(() => {
                const topics = firstClass.focus_topics;
                const week1Match = topics.match(/Week 1:([^|]+)/);
                const week2Match = topics.match(/Week 2:([^|]+)/);
                const week1Topics = week1Match ? week1Match[1].trim() : '';
                const week2Topics = week2Match ? week2Match[1].trim() : '';

                return (
                  <>
                    {week1Topics && (
                      <div className="p-3 rounded-lg bg-muted/50">
                        <h4 className="font-semibold text-sm mb-2">Week 1 (Dec 8-12)</h4>
                        <p className="text-sm text-muted-foreground">{week1Topics}</p>
                      </div>
                    )}
                    {week2Topics && (
                      <div className="p-3 rounded-lg bg-muted/50">
                        <h4 className="font-semibold text-sm mb-2">Week 2 (Dec 15-19)</h4>
                        <p className="text-sm text-muted-foreground">{week2Topics}</p>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* Day-by-day breakdown */}
        {hasTopics && (
          <div className="space-y-3">
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-sm font-semibold text-primary hover:underline"
            >
              {expanded ? "Hide" : "Show"} 10-Session Breakdown
            </button>

            {expanded && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Week 1 */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Week 1</h4>
                  {weekDates.slice(0, 5).map((wd, idx) => (
                    <div key={`w1-${idx}`} className="text-sm">
                      <span className="text-muted-foreground">{wd.day} {wd.date}:</span>{" "}
                      <span>{sessionTopics[`day_${idx + 1}`] || "Topic TBA"}</span>
                    </div>
                  ))}
                </div>

                {/* Week 2 */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Week 2</h4>
                  {weekDates.slice(5, 10).map((wd, idx) => (
                    <div key={`w2-${idx}`} className="text-sm">
                      <span className="text-muted-foreground">{wd.day} {wd.date}:</span>{" "}
                      <span>{sessionTopics[`day_${idx + 6}`] || "Topic TBA"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-4 pt-4 border-t">
          <p className="text-lg font-semibold">KES 4,000</p>
          <p className="text-xs text-muted-foreground">10 sessions • 75 minutes each</p>
        </div>
      </CardContent>
    </Card>
  );
};
