import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Plus, MapPin, Clock } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface SchoolEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string | null;
  location: string | null;
  category: string;
}

interface Props {
  schoolId: string;
  canManage?: boolean;
}

const EventCalendar: React.FC<Props> = ({ schoolId, canManage }) => {
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", event_date: "", event_time: "", location: "", category: "general" });

  const fetchEvents = () => {
    (supabase as any).from("school_events").select("*").eq("school_id", schoolId)
      .order("event_date", { ascending: true })
      .then(({ data }: any) => setEvents(data || []));
  };

  useEffect(() => { fetchEvents(); }, [schoolId]);

  const handleCreate = async () => {
    const { error } = await (supabase as any).from("school_events").insert({ ...form, school_id: schoolId });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Event created!" });
    setOpen(false);
    setForm({ title: "", description: "", event_date: "", event_time: "", location: "", category: "general" });
    fetchEvents();
  };

  const upcoming = events.filter(e => new Date(e.event_date) >= new Date());
  const past = events.filter(e => new Date(e.event_date) < new Date());

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" style={{ backgroundColor: "var(--school-primary)" }}>
                <Plus className="h-4 w-4" /> Add Event
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Event</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Event title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                <Textarea placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                <div className="grid grid-cols-2 gap-3">
                  <Input type="date" value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} />
                  <Input type="time" value={form.event_time} onChange={e => setForm(f => ({ ...f, event_time: e.target.value }))} />
                </div>
                <Input placeholder="Location" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
                <Button onClick={handleCreate} className="w-full" style={{ backgroundColor: "var(--school-primary)" }}>Create Event</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {upcoming.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Calendar className="h-5 w-5" /> Upcoming Events</h3>
          <div className="space-y-3">
            {upcoming.map(e => (
              <Card key={e.id}>
                <CardContent className="pt-4 flex items-start gap-4">
                  <div className="bg-red-50 rounded-lg p-3 text-center min-w-[60px]" style={{ backgroundColor: `${e.category === 'sports' ? '#f0fdf4' : '#fef2f2'}` }}>
                    <div className="text-2xl font-bold" style={{ color: "var(--school-primary)" }}>{format(new Date(e.event_date), "d")}</div>
                    <div className="text-xs text-muted-foreground">{format(new Date(e.event_date), "MMM")}</div>
                  </div>
                  <div>
                    <h4 className="font-semibold">{e.title}</h4>
                    {e.description && <p className="text-sm text-muted-foreground mt-1">{e.description}</p>}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      {e.event_time && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{e.event_time}</span>}
                      {e.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{e.location}</span>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {!upcoming.length && !past.length && (
        <div className="text-center py-12 text-muted-foreground">
          <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No events scheduled</p>
        </div>
      )}
    </div>
  );
};

export default EventCalendar;
