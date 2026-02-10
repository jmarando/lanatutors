import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Megaphone } from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  content: string;
  category: string;
  published: boolean;
  created_at: string;
  author_id: string;
}

interface Props {
  schoolId: string;
  refreshKey?: number;
}

const categoryColors: Record<string, string> = {
  general: "bg-blue-100 text-blue-800",
  academic: "bg-purple-100 text-purple-800",
  sports: "bg-green-100 text-green-800",
  events: "bg-amber-100 text-amber-800",
};

const categoryIcons: Record<string, string> = {
  general: "📢", academic: "📚", sports: "⚽", events: "🎉",
};

const AnnouncementFeed: React.FC<Props> = ({ schoolId, refreshKey }) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = () => {
    (supabase as any).from("school_announcements").select("*")
      .eq("school_id", schoolId).eq("published", true)
      .order("created_at", { ascending: false })
      .then(({ data }: any) => { setAnnouncements(data || []); setLoading(false); });
  };

  useEffect(() => { fetch(); }, [schoolId, refreshKey]);

  if (loading) return <div className="text-center py-8 text-muted-foreground">Loading announcements...</div>;
  if (!announcements.length) return (
    <div className="text-center py-12 text-muted-foreground">
      <Megaphone className="h-12 w-12 mx-auto mb-3 opacity-30" />
      <p>No announcements yet</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {announcements.map(a => (
        <Card key={a.id} className="hover:shadow-md transition-shadow">
          <CardContent className="pt-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className={categoryColors[a.category] || ""}>
                    {categoryIcons[a.category]} {a.category}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{format(new Date(a.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
                </div>
                <h3 className="font-semibold text-lg mb-1">{a.title}</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{a.content}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AnnouncementFeed;
