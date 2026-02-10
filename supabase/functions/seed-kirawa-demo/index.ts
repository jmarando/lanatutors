import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const schoolId = "11111111-1111-1111-1111-111111111111";

  // Create demo users
  const demoUsers = [
    { email: "admin@kirawa.demo", password: "demo1234", full_name: "Mrs. Sarah Kamau", role: "admin" },
    { email: "teacher@kirawa.demo", password: "demo1234", full_name: "Mr. James Ochieng", role: "teacher" },
    { email: "parent@kirawa.demo", password: "demo1234", full_name: "Mrs. Grace Wanjiku", role: "parent" },
  ];

  const memberIds: Record<string, string> = {};
  const userIds: Record<string, string> = {};

  for (const u of demoUsers) {
    // Check if user exists
    const { data: existing } = await admin.auth.admin.listUsers();
    const existingUser = existing?.users?.find((eu: any) => eu.email === u.email);

    let userId: string;
    if (existingUser) {
      userId = existingUser.id;
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: { full_name: u.full_name },
      });
      if (error) return new Response(JSON.stringify({ error: error.message, step: "create_user", user: u.email }), { status: 500, headers: corsHeaders });
      userId = data.user.id;
    }
    userIds[u.role] = userId;

    // Create profile if not exists
    await admin.from("profiles").upsert({
      id: userId,
      full_name: u.full_name,
      account_type: u.role === "parent" ? "parent" : "tutor",
    }, { onConflict: "id" });

    // Create school member
    const memberId = crypto.randomUUID();
    const { error: memberError } = await admin.from("school_members").upsert({
      id: memberId,
      school_id: schoolId,
      user_id: userId,
      role: u.role,
      full_name: u.full_name,
      class_name: u.role === "teacher" ? "Grade 5" : null,
    }, { onConflict: "id" });

    // Check if member already exists
    const { data: existingMember } = await admin.from("school_members")
      .select("id").eq("school_id", schoolId).eq("user_id", userId).single();
    memberIds[u.role] = existingMember?.id || memberId;
  }

  // Create students
  const students = [
    { student_name: "Amani Wanjiku", class_name: "Grade 4", grade_level: "4", parent_member_id: memberIds.parent },
    { student_name: "Baraka Wanjiku", class_name: "Grade 6", grade_level: "6", parent_member_id: memberIds.parent },
    { student_name: "Chege Kamau", class_name: "Grade 4", grade_level: "4", parent_member_id: null },
    { student_name: "Diana Njeri", class_name: "Grade 5", grade_level: "5", parent_member_id: null },
    { student_name: "Ethan Omondi", class_name: "Grade 5", grade_level: "5", parent_member_id: null },
    { student_name: "Faith Achieng", class_name: "Grade 6", grade_level: "6", parent_member_id: null },
    { student_name: "George Mwangi", class_name: "Grade 4", grade_level: "4", parent_member_id: null },
    { student_name: "Hannah Wairimu", class_name: "Grade 5", grade_level: "5", parent_member_id: null },
    { student_name: "Ian Kipchoge", class_name: "Grade 6", grade_level: "6", parent_member_id: null },
  ];

  const { data: insertedStudents, error: studentsError } = await admin.from("school_students")
    .upsert(students.map(s => ({ ...s, school_id: schoolId })), { onConflict: "id" })
    .select();

  // Create announcements
  const announcements = [
    { title: "Term 1 Dates 2026", content: "Dear Parents,\n\nTerm 1 begins on Monday, 12th January 2026 and ends on Friday, 27th March 2026. Please ensure your child reports by 7:30 AM on the first day.\n\nWarm regards,\nThe Administration", category: "academic" },
    { title: "Annual Sports Day — Saturday 15th February", content: "We are excited to announce our Annual Sports Day! All students will participate in track and field events, swimming, and team sports.\n\nVenue: Kirawa School Sports Ground\nTime: 8:00 AM - 4:00 PM\n\nParents are welcome to attend and cheer!", category: "sports" },
    { title: "Parents' Evening — 20th February", content: "You are invited to our termly Parents' Evening to discuss your child's progress with their class teacher.\n\nDate: Thursday, 20th February 2026\nTime: 3:30 PM - 6:00 PM\n\nPlease sign up for a slot at the school office.", category: "events" },
    { title: "School Bus Route Changes", content: "Please note the following changes to bus routes effective February 2026:\n\n• Route 3 (Lavington) now departs at 6:45 AM\n• Route 5 (Karen) has an additional stop at Hardy Junction\n\nContact the transport office for queries.", category: "general" },
  ];

  for (const a of announcements) {
    await admin.from("school_announcements").insert({
      ...a, school_id: schoolId, author_id: memberIds.admin, published: true,
    });
  }

  // Create events
  const events = [
    { title: "Swimming Gala", event_date: "2026-02-18", event_time: "09:00", location: "School Pool", category: "sports" },
    { title: "Music Recital", event_date: "2026-02-22", event_time: "14:00", location: "Main Hall", category: "events" },
    { title: "Parents' Evening", event_date: "2026-02-20", event_time: "15:30", location: "Classrooms", category: "academic" },
    { title: "End of Term Assembly", event_date: "2026-03-27", event_time: "10:00", location: "Assembly Hall", category: "general" },
    { title: "Inter-House Quiz", event_date: "2026-02-25", event_time: "11:00", location: "Library", category: "academic" },
  ];

  for (const e of events) {
    await admin.from("school_events").insert({ ...e, school_id: schoolId });
  }

  // Create homework
  const homeworks = [
    { class_name: "Grade 4", subject: "Mathematics", title: "Fractions Worksheet", description: "Complete exercises 1-15 on page 42 of your textbook. Show all working.", due_date: "2026-02-14" },
    { class_name: "Grade 5", subject: "English", title: "Creative Writing Essay", description: "Write a 300-word essay on 'My Favourite Place in Kenya'. Include descriptive language and at least 3 paragraphs.", due_date: "2026-02-17" },
    { class_name: "Grade 6", subject: "Science", title: "Plant Growth Experiment Report", description: "Document your bean seed experiment observations over the past 2 weeks. Include diagrams and measurements.", due_date: "2026-02-15" },
    { class_name: "Grade 5", subject: "Kiswahili", title: "Insha: Siku Yangu Bora", description: "Andika insha ya maneno 200 kuhusu siku yako bora zaidi. Tumia lugha ya kisanaa.", due_date: "2026-02-18" },
    { class_name: "Grade 4", subject: "Social Studies", title: "Map of Kenya Counties", description: "Draw and label a map of Kenya showing at least 15 counties. Color-code by region.", due_date: "2026-02-19" },
  ];

  for (const hw of homeworks) {
    await admin.from("school_homework").insert({ ...hw, school_id: schoolId, teacher_id: memberIds.teacher });
  }

  // Create results for students
  if (insertedStudents && insertedStudents.length > 0) {
    const subjects = ["Mathematics", "English", "Science", "Social Studies", "Kiswahili", "Creative Arts"];
    const resultRows = [];

    for (const student of insertedStudents) {
      for (const subj of subjects) {
        const score = Math.floor(Math.random() * 35) + 55; // 55-90
        const grade = score >= 80 ? "A" : score >= 70 ? "B" : score >= 60 ? "C" : "D";
        const comments = [
          "Excellent work this term!", "Good progress, keep it up.", "Shows great potential.",
          "Needs more practice in problem-solving.", "Very attentive in class.", "Consistent performer.",
        ];
        resultRows.push({
          school_student_id: student.id,
          school_id: schoolId,
          subject: subj,
          term: "Term 1",
          year: 2026,
          score,
          max_score: 100,
          grade,
          teacher_comments: comments[Math.floor(Math.random() * comments.length)],
          teacher_id: memberIds.teacher,
        });
      }
    }

    await admin.from("school_results").insert(resultRows);
  }

  return new Response(JSON.stringify({
    success: true,
    message: "Kirawa demo data seeded",
    users: Object.entries(userIds).map(([role, id]) => ({ role, id })),
    members: Object.entries(memberIds).map(([role, id]) => ({ role, id })),
    students_count: insertedStudents?.length || 0,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
