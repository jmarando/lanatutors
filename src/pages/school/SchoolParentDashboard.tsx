import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSchool, useSchoolMember, useSchoolStudents } from "@/hooks/useSchool";
import { useAuth } from "@/contexts/AuthContext";
import SchoolLayout from "@/components/school/SchoolLayout";
import AnnouncementFeed from "@/components/school/AnnouncementFeed";
import HomeworkList from "@/components/school/HomeworkList";
import ReportCard from "@/components/school/ReportCard";
import ParentTeacherBooking from "@/components/school/ParentTeacherBooking";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { User } from "lucide-react";

const SchoolParentDashboard: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, initialized } = useAuth();
  const { school, loading: schoolLoading } = useSchool(slug);
  const { member, loading: memberLoading } = useSchoolMember(school?.id);
  const { students } = useSchoolStudents(school?.id);
  const [tab, setTab] = useState("announcements");

  const myStudents = students.filter(s => s.parent_member_id === member?.id);
  const childClasses = [...new Set(myStudents.map(s => s.class_name))];

  useEffect(() => {
    const handler = (e: CustomEvent) => setTab(e.detail);
    window.addEventListener("school-tab-change", handler as EventListener);
    return () => window.removeEventListener("school-tab-change", handler as EventListener);
  }, []);

  useEffect(() => {
    if (initialized && !user) navigate(`/school/${slug}`);
    if (member && member.role !== "parent") navigate(`/school/${slug}/${member.role}`);
  }, [initialized, user, member]);

  if (schoolLoading || memberLoading || !school || !member) return (
    <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-800"></div></div>
  );

  return (
    <SchoolLayout school={school} member={member} activeTab={tab}>
      {tab === "announcements" && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold" style={{ color: school.primary_color }}>Announcements</h2>

          {/* Child badges */}
          {myStudents.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm text-muted-foreground mr-1">My Children:</span>
              {myStudents.map(s => (
                <Badge key={s.id} variant="outline" className="gap-1.5 py-1">
                  <User className="h-3 w-3" /> {s.student_name} <span className="opacity-60">({s.class_name})</span>
                </Badge>
              ))}
            </div>
          )}

          <Tabs defaultValue="school-wide">
            <TabsList>
              <TabsTrigger value="school-wide">🏫 School-Wide</TabsTrigger>
              <TabsTrigger value="my-classes">🎓 My Children's Classes</TabsTrigger>
            </TabsList>
            <TabsContent value="school-wide">
              <AnnouncementFeed schoolId={school.id} />
            </TabsContent>
            <TabsContent value="my-classes">
              {childClasses.length > 0 ? (
                <AnnouncementFeed schoolId={school.id} filterClasses={childClasses} showOnlyTargeted />
              ) : (
                <p className="text-muted-foreground py-8 text-center">No children linked to your account yet.</p>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}

      {tab === "homework" && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold" style={{ color: school.primary_color }}>Homework & Assignments</h2>
          {myStudents.length > 1 ? (
            <Tabs defaultValue={childClasses[0] || "all"}>
              <TabsList>
                {childClasses.map(cls => (
                  <TabsTrigger key={cls} value={cls}>{cls}</TabsTrigger>
                ))}
              </TabsList>
              {childClasses.map(cls => (
                <TabsContent key={cls} value={cls}>
                  <HomeworkList schoolId={school.id} filterClass={cls} />
                </TabsContent>
              ))}
            </Tabs>
          ) : childClasses.length === 1 ? (
            <HomeworkList schoolId={school.id} filterClass={childClasses[0]} />
          ) : (
            <HomeworkList schoolId={school.id} />
          )}
        </div>
      )}

      {tab === "reports" && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold" style={{ color: school.primary_color }}>Report Cards</h2>
          {myStudents.length > 1 ? (
            <Tabs defaultValue={myStudents[0]?.id}>
              <TabsList>
                {myStudents.map(s => (
                  <TabsTrigger key={s.id} value={s.id}>{s.student_name}</TabsTrigger>
                ))}
              </TabsList>
              {myStudents.map(s => (
                <TabsContent key={s.id} value={s.id}>
                  <ReportCard school={school} students={[s]} />
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            <ReportCard school={school} students={myStudents.length > 0 ? myStudents : students} />
          )}
        </div>
      )}

      {tab === "meetings" && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold" style={{ color: school.primary_color }}>Book Teacher Meeting</h2>
          <ParentTeacherBooking
            schoolId={school.id}
            parentMemberId={member.id}
            myStudents={myStudents}
          />
        </div>
      )}
    </SchoolLayout>
  );
};

export default SchoolParentDashboard;
