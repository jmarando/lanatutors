import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSchool, useSchoolMember, useSchoolStudents } from "@/hooks/useSchool";
import { useAuth } from "@/contexts/AuthContext";
import SchoolLayout from "@/components/school/SchoolLayout";
import AnnouncementFeed from "@/components/school/AnnouncementFeed";
import HomeworkList from "@/components/school/HomeworkList";
import ReportCard from "@/components/school/ReportCard";

const SchoolParentDashboard: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, initialized } = useAuth();
  const { school, loading: schoolLoading } = useSchool(slug);
  const { member, loading: memberLoading } = useSchoolMember(school?.id);
  const { students } = useSchoolStudents(school?.id);
  const [tab, setTab] = useState("announcements");

  // Filter students to only show this parent's children
  const myStudents = students.filter(s => s.parent_member_id === member?.id);

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

  // Get the class names of the parent's children for homework filtering
  const childClasses = [...new Set(myStudents.map(s => s.class_name))];

  return (
    <SchoolLayout school={school} member={member} activeTab={tab}>
      {tab === "announcements" && (
        <div>
          <h2 className="text-xl font-bold mb-4" style={{ color: school.primary_color }}>School Announcements</h2>
          <AnnouncementFeed schoolId={school.id} />
        </div>
      )}
      {tab === "homework" && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold" style={{ color: school.primary_color }}>Homework & Assignments</h2>
          {childClasses.length > 0 ? (
            childClasses.map(cls => (
              <div key={cls}>
                <h3 className="font-semibold mb-2 text-muted-foreground">{cls}</h3>
                <HomeworkList schoolId={school.id} filterClass={cls} />
              </div>
            ))
          ) : (
            <HomeworkList schoolId={school.id} />
          )}
        </div>
      )}
      {tab === "reports" && (
        <div>
          <h2 className="text-xl font-bold mb-4" style={{ color: school.primary_color }}>Report Cards</h2>
          <ReportCard school={school} students={myStudents.length > 0 ? myStudents : students} />
        </div>
      )}
    </SchoolLayout>
  );
};

export default SchoolParentDashboard;
