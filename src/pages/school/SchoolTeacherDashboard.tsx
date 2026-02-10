import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSchool, useSchoolMember, useSchoolStudents } from "@/hooks/useSchool";
import { useAuth } from "@/contexts/AuthContext";
import SchoolLayout from "@/components/school/SchoolLayout";
import HomeworkForm from "@/components/school/HomeworkForm";
import HomeworkList from "@/components/school/HomeworkList";
import ResultsEntry from "@/components/school/ResultsEntry";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

const SchoolTeacherDashboard: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, initialized } = useAuth();
  const { school, loading: schoolLoading } = useSchool(slug);
  const { member, loading: memberLoading } = useSchoolMember(school?.id);
  const { students } = useSchoolStudents(school?.id);
  const [tab, setTab] = useState("homework");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const handler = (e: CustomEvent) => setTab(e.detail);
    window.addEventListener("school-tab-change", handler as EventListener);
    return () => window.removeEventListener("school-tab-change", handler as EventListener);
  }, []);

  useEffect(() => {
    if (initialized && !user) navigate(`/school/${slug}`);
    if (member && member.role !== "teacher") navigate(`/school/${slug}/${member.role}`);
  }, [initialized, user, member]);

  if (schoolLoading || memberLoading || !school || !member) return (
    <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-800"></div></div>
  );

  return (
    <SchoolLayout school={school} member={member} activeTab={tab}>
      {tab === "homework" && (
        <div className="space-y-6">
          <HomeworkForm schoolId={school.id} teacherId={member.id} onCreated={() => setRefreshKey(k => k + 1)} />
          <h3 className="font-semibold">Posted Homework</h3>
          <HomeworkList schoolId={school.id} refreshKey={refreshKey} />
        </div>
      )}
      {tab === "results" && <ResultsEntry schoolId={school.id} teacherId={member.id} students={students} />}
      {tab === "students" && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Class Roster</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Grade Level</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.student_name}</TableCell>
                    <TableCell>{s.class_name}</TableCell>
                    <TableCell>{s.grade_level}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </SchoolLayout>
  );
};

export default SchoolTeacherDashboard;
