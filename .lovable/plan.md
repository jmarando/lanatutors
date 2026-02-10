

# Lana for Schools: Kirawa School Demo

Build a working demo at `kirawa.lanatutors.africa` (routed via `/school/kirawa`) featuring three modules: School Communications, Homework & Assignments, and Digital Report Cards -- all branded with Kirawa School's identity (logo from their website, their red/gold color scheme).

---

## What You'll See in the Demo

### 1. School Landing/Login Page (`/school/kirawa`)
- Kirawa School branded page with their logo and colors
- Login for three roles: School Admin, Teacher, Parent
- Demo accounts pre-seeded for tomorrow's meeting

### 2. School Admin Dashboard (`/school/kirawa/admin`)
- **Announcements**: Create/publish announcements and circulars (with category tags: General, Academic, Sports, Events)
- **Event Calendar**: Visual calendar showing upcoming school events (sports day, parent evenings, term dates)
- **Overview stats**: Total students, teachers, announcements sent, homework pending

### 3. Teacher Portal (`/school/kirawa/teacher`)
- **Post Homework**: Create assignments with subject, class, due date, description, and optional file attachments
- **Enter Results**: Input student scores per subject per term, with grade auto-calculation
- **View class roster**: See students in their assigned classes

### 4. Parent Portal (`/school/kirawa/parent`)
- **Announcements Feed**: See all school communications in a clean timeline
- **Homework View**: See pending and past homework for their children, with due dates and status
- **Report Cards**: View term-by-term results with subject scores, grades, teacher comments, and PDF download

---

## Database Schema (New Tables)

```text
schools
  id, name, slug, logo_url, primary_color, secondary_color, 
  tagline, website, created_at

school_members
  id, school_id, user_id, role (admin/teacher/parent), 
  full_name, created_at

school_students  
  id, school_id, student_name, class_name, grade_level,
  parent_member_id (FK to school_members), created_at

school_announcements
  id, school_id, title, content, category (general/academic/sports/events),
  author_id (FK to school_members), published, created_at

school_events
  id, school_id, title, description, event_date, event_time,
  location, category, created_at

school_homework
  id, school_id, teacher_id (FK to school_members), 
  class_name, subject, title, description, due_date,
  created_at

school_results
  id, school_student_id, school_id, subject, term, year,
  score, max_score, grade, teacher_comments,
  teacher_id (FK to school_members), created_at
```

RLS policies will scope all data by school_id and role-based access.

---

## New Files to Create

### Pages
- `src/pages/school/SchoolLogin.tsx` -- Branded login for Kirawa
- `src/pages/school/SchoolAdminDashboard.tsx` -- Admin: announcements, events, overview
- `src/pages/school/SchoolTeacherDashboard.tsx` -- Teacher: homework, results entry
- `src/pages/school/SchoolParentDashboard.tsx` -- Parent: announcements, homework, report cards

### Components
- `src/components/school/SchoolLayout.tsx` -- Branded wrapper with Kirawa header/sidebar
- `src/components/school/AnnouncementComposer.tsx` -- Create/edit announcements
- `src/components/school/AnnouncementFeed.tsx` -- Timeline of announcements
- `src/components/school/EventCalendar.tsx` -- Monthly calendar with events
- `src/components/school/HomeworkForm.tsx` -- Teacher creates homework
- `src/components/school/HomeworkList.tsx` -- View homework (parent/teacher)
- `src/components/school/ResultsEntry.tsx` -- Teacher enters scores per student
- `src/components/school/ReportCard.tsx` -- Parent views results + PDF export (using jsPDF, already installed)

### Routes (added to App.tsx)
- `/school/:slug` -- School login
- `/school/:slug/admin` -- Admin dashboard
- `/school/:slug/teacher` -- Teacher dashboard  
- `/school/:slug/parent` -- Parent portal

---

## Demo Data (Pre-seeded for Kirawa)

- **School**: Kirawa Road School, slug: `kirawa`
- **3 demo classes**: Grade 4, Grade 5, Grade 6
- **Sample announcements**: Term dates, sports day, parents' evening
- **Sample homework**: Math worksheet, English essay, Science project
- **Sample results**: Term 1 scores for a few students across subjects
- **Sample events**: Swimming gala, music recital, end of term

---

## Technical Approach

- **Authentication**: Reuse existing Supabase auth -- school members log in with the same auth system, their `school_members` entry determines which school and role they see
- **PDF Report Cards**: Use jsPDF (already installed) to generate branded report cards with Kirawa logo, student details, term results table, and teacher comments
- **Multi-tenant**: All queries filtered by `school_id` from the slug, making this immediately extensible to other schools
- **Branding**: School logo, colors, and name pulled from `schools` table and applied via CSS variables

---

## Sequence of Implementation

1. Create database tables with migration (schools, school_members, school_students, school_announcements, school_events, school_homework, school_results) + RLS policies
2. Seed Kirawa School demo data
3. Build SchoolLayout component with Kirawa branding
4. Build School Login page
5. Build Admin Dashboard (announcements + events)
6. Build Teacher Dashboard (homework + results entry)
7. Build Parent Portal (announcements feed + homework view + report card with PDF)
8. Add routes to App.tsx

