import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface School {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  tagline: string | null;
  website: string | null;
}

export interface SchoolMember {
  id: string;
  school_id: string;
  user_id: string;
  role: "admin" | "teacher" | "parent";
  full_name: string;
  class_name: string | null;
}

export interface SchoolStudent {
  id: string;
  school_id: string;
  student_name: string;
  class_name: string;
  grade_level: string;
  parent_member_id: string | null;
}

export function useSchool(slug: string | undefined) {
  const [school, setSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    (supabase as any).from("schools").select("*").eq("slug", slug).single()
      .then(({ data, error }: any) => {
        if (!error) setSchool(data);
        setLoading(false);
      });
  }, [slug]);

  return { school, loading };
}

export function useSchoolMember(schoolId: string | undefined) {
  const { user } = useAuth();
  const [member, setMember] = useState<SchoolMember | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!schoolId || !user) { setLoading(false); return; }
    (supabase as any).from("school_members").select("*")
      .eq("school_id", schoolId).eq("user_id", user.id).single()
      .then(({ data, error }: any) => {
        if (!error) setMember(data);
        setLoading(false);
      });
  }, [schoolId, user]);

  return { member, loading };
}

export function useSchoolStudents(schoolId: string | undefined) {
  const [students, setStudents] = useState<SchoolStudent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!schoolId) return;
    (supabase as any).from("school_students").select("*").eq("school_id", schoolId)
      .then(({ data, error }: any) => {
        if (!error) setStudents(data || []);
        setLoading(false);
      });
  }, [schoolId]);

  return { students, loading, refetch: () => {
    (supabase as any).from("school_students").select("*").eq("school_id", schoolId)
      .then(({ data }: any) => setStudents(data || []));
  }};
}
