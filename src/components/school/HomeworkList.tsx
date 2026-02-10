import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, isPast, isToday } from "date-fns";
import { BookOpen, AlertCircle, CheckCircle } from "lucide-react";

interface Homework {
  id: string;
  class_name: string;
  subject: string;
  title: string;
  description: string | null;
  due_date: string;
  created_at: string;
}

interface Props {
  schoolId: string;
  filterClass?: string;
  refreshKey?: number;
}

const HomeworkList: React.FC<Props> = ({ schoolId, filterClass, refreshKey }) => {
  const [homework, setHomework] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let query = (supabase as any).from("school_homework").select("*").eq("school_id", schoolId).order("due_date", { ascending: true });
    if (filterClass) query = query.eq("class_name", filterClass);
    query.then(({ data }: any) => { setHomework(data || []); setLoading(false); });
  }, [schoolId, filterClass, refreshKey]);

  if (loading) return <div className="text-center py-8 text-muted-foreground">Loading homework...</div>;
  if (!homework.length) return (
    <div className="text-center py-12 text-muted-foreground">
      <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
      <p>No homework assigned</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {homework.map(hw => {
        const overdue = isPast(new Date(hw.due_date)) && !isToday(new Date(hw.due_date));
        const dueToday = isToday(new Date(hw.due_date));
        return (
          <Card key={hw.id} className={`${overdue ? "border-red-200 bg-red-50/50" : dueToday ? "border-amber-200 bg-amber-50/50" : ""}`}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline">{hw.subject}</Badge>
                    <Badge variant="secondary">{hw.class_name}</Badge>
                    {overdue && <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" />Overdue</Badge>}
                    {dueToday && <Badge className="bg-amber-500 gap-1"><AlertCircle className="h-3 w-3" />Due Today</Badge>}
                    {!overdue && !dueToday && <Badge variant="secondary" className="gap-1"><CheckCircle className="h-3 w-3" />Upcoming</Badge>}
                  </div>
                  <h4 className="font-semibold">{hw.title}</h4>
                  {hw.description && <p className="text-sm text-muted-foreground mt-1">{hw.description}</p>}
                </div>
                <div className="text-right text-sm text-muted-foreground whitespace-nowrap">
                  <div>Due: {format(new Date(hw.due_date), "MMM d, yyyy")}</div>
                  <div className="text-xs">Posted: {format(new Date(hw.created_at), "MMM d")}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default HomeworkList;
