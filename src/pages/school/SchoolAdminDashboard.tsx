import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSchool, useSchoolMember, useSchoolStudents } from "@/hooks/useSchool";
import { useAuth } from "@/contexts/AuthContext";
import SchoolLayout from "@/components/school/SchoolLayout";
import AnnouncementComposer from "@/components/school/AnnouncementComposer";
import AnnouncementFeed from "@/components/school/AnnouncementFeed";
import EventCalendar from "@/components/school/EventCalendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Users, Megaphone, BookOpen, Calendar } from "lucide-react";

const SchoolAdminDashboard: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, initialized } = useAuth();
  const { school, loading: schoolLoading } = useSchool(slug);
  const { member, loading: memberLoading } = useSchoolMember(school?.id);
  const { students } = useSchoolStudents(school?.id);
  const [tab, setTab] = useState("overview");
  const [refreshKey, setRefreshKey] = useState(0);
  const [stats, setStats] = useState({ announcements: 0, homework: 0, events: 0 });

  useEffect(() => {
    const handler = (e: CustomEvent) => setTab(e.detail);
    window.addEventListener("school-tab-change", handler as EventListener);
    return () => window.removeEventListener("school-tab-change", handler as EventListener);
  }, []);

  useEffect(() => {
    if (!school?.id) return;
    Promise.all([
      (supabase as any).from("school_announcements").select("id", { count: "exact", head: true }).eq("school_id", school.id),
      (supabase as any).from("school_homework").select("id", { count: "exact", head: true }).eq("school_id", school.id),
      (supabase as any).from("school_events").select("id", { count: "exact", head: true }).eq("school_id", school.id),
    ]).then(([a, h, e]: any) => setStats({
      announcements: a.count || 0, homework: h.count || 0, events: e.count || 0,
    }));
  }, [school?.id, refreshKey]);

  useEffect(() => {
    if (initialized && !user) navigate(`/school/${slug}`);
    if (member && member.role !== "admin") navigate(`/school/${slug}/${member.role}`);
  }, [initialized, user, member]);

  if (schoolLoading || memberLoading || !school || !member) return (
    <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-800"></div></div>
  );

  return (
    <SchoolLayout school={school} member={member} activeTab={tab}>
      {tab === "overview" && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold" style={{ color: school.primary_color }}>Welcome back, {member.full_name}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Students", value: students.length, icon: Users, color: "#3b82f6" },
              { label: "Announcements", value: stats.announcements, icon: Megaphone, color: "#8b5cf6" },
              { label: "Homework Assigned", value: stats.homework, icon: BookOpen, color: "#f59e0b" },
              { label: "Upcoming Events", value: stats.events, icon: Calendar, color: "#10b981" },
            ].map(s => (
              <Card key={s.label}>
                <CardContent className="pt-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{s.label}</p>
                      <p className="text-3xl font-bold">{s.value}</p>
                    </div>
                    <s.icon className="h-8 w-8 opacity-20" style={{ color: s.color }} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div><h3 className="font-semibold mb-3">Recent Announcements</h3><AnnouncementFeed schoolId={school.id} refreshKey={refreshKey} /></div>
            <div><h3 className="font-semibold mb-3">Upcoming Events</h3><EventCalendar schoolId={school.id} /></div>
          </div>
        </div>
      )}
      {tab === "announcements" && (
        <div className="space-y-6">
          <AnnouncementComposer schoolId={school.id} authorId={member.id} onCreated={() => setRefreshKey(k => k + 1)} />
          <AnnouncementFeed schoolId={school.id} refreshKey={refreshKey} />
        </div>
      )}
      {tab === "events" && <EventCalendar schoolId={school.id} canManage />}
    </SchoolLayout>
  );
};

export default SchoolAdminDashboard;
