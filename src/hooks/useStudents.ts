import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Student {
  id: string;
  parent_id: string;
  full_name: string;
  age: number | null;
  curriculum: string;
  grade_level: string;
  email: string | null;
  subjects_of_interest: string[] | null;
  learning_goals: string | null;
  created_at: string;
}

export function useStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStudents = async () => {
    setLoading(true);
    setError(null);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error: fetchError } = await supabase
      .from("students")
      .select("*")
      .eq("parent_id", user.id)
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setStudents(data || []);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const addStudent = async (studentData: {
    full_name: string;
    age?: number;
    curriculum: string;
    grade_level: string;
    email?: string;
    subjects_of_interest?: string[];
    learning_goals?: string;
  }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("students")
      .insert({
        parent_id: user.id,
        full_name: studentData.full_name,
        age: studentData.age || null,
        curriculum: studentData.curriculum,
        grade_level: studentData.grade_level,
        email: studentData.email || null,
        subjects_of_interest: studentData.subjects_of_interest || null,
        learning_goals: studentData.learning_goals || null,
      })
      .select()
      .single();

    if (error) throw error;
    
    setStudents(prev => [data, ...prev]);
    return data;
  };

  const updateStudent = async (id: string, updates: Partial<Student>) => {
    const { data, error } = await supabase
      .from("students")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    
    setStudents(prev => prev.map(s => s.id === id ? data : s));
    return data;
  };

  const deleteStudent = async (id: string) => {
    const { error } = await supabase
      .from("students")
      .delete()
      .eq("id", id);

    if (error) throw error;
    
    setStudents(prev => prev.filter(s => s.id !== id));
  };

  return {
    students,
    loading,
    error,
    fetchStudents,
    addStudent,
    updateStudent,
    deleteStudent,
  };
}
