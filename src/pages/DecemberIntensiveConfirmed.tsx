import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle, Calendar, Clock, BookOpen, Users, ArrowRight, Plus, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/SEO";

interface SessionTopic {
  day: number;
  topic: string;
  date?: string;
}

interface EnrolledClass {
  id: string;
  subject: string;
  curriculum: string;
  grade_levels: string[];
  time_slot: string;
  session_topics?: unknown;
  meeting_link?: string | null;
  tutor_id?: string | null;
  tutor_name?: string | null;
}

const DecemberIntensiveConfirmed = () => {
  const [searchParams] = useSearchParams();
  const enrollmentId = searchParams.get("enrollment_id");
  const [enrolledClasses, setEnrolledClasses] = useState<EnrolledClass[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEnrollmentDetails = async () => {
      if (!enrollmentId) {
        setLoading(false);
        return;
      }

      try {
        const { data: enrollment, error: enrollmentError } = await supabase
          .from("intensive_enrollments")
          .select("enrolled_class_ids")
          .eq("id", enrollmentId)
          .single();

        if (enrollmentError || !enrollment) {
          console.error("Error fetching enrollment:", enrollmentError);
          setLoading(false);
          return;
        }

        const { data: classes, error: classesError } = await supabase
          .from("intensive_classes")
          .select("id, subject, curriculum, grade_levels, time_slot, session_topics, meeting_link, tutor_id")
          .in("id", enrollment.enrolled_class_ids);

        if (classesError) {
          console.error("Error fetching classes:", classesError);
        } else {
          // Fetch tutor names
          const tutorIds = classes?.map(c => c.tutor_id).filter(Boolean) as string[];
          const tutorInfo: Record<string, string> = {};
          
          if (tutorIds.length > 0) {
            const { data: tutorProfiles } = await supabase
              .from("tutor_profiles")
              .select("id, user_id")
              .in("id", tutorIds);
            
            if (tutorProfiles) {
              const userIds = tutorProfiles.map(tp => tp.user_id);
              const { data: profiles } = await supabase
                .from("profiles")
                .select("id, full_name")
                .in("id", userIds);
              
              if (profiles) {
                tutorProfiles.forEach(tp => {
                  const p = profiles.find(pr => pr.id === tp.user_id);
                  if (p) tutorInfo[tp.id] = p.full_name || "TBA";
                });
              }
            }
          }

          const enrichedClasses = classes?.map(cls => ({
            ...cls,
            tutor_name: cls.tutor_id ? tutorInfo[cls.tutor_id] || null : null
          })) || [];
          
          setEnrolledClasses(enrichedClasses);
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEnrollmentDetails();
  }, [enrollmentId]);

  const programDates = "December 8-19, 2025";
  const dailySchedule = "8:00 AM - 5:15 PM EAT";

  return (
    <>
      <SEO
        title="Enrollment Confirmed | December Holiday Bootcamp"
        description="Your enrollment in the December Holiday Bootcamp has been confirmed."
      />
      <div className="min-h-screen bg-background py-12 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-6">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Enrollment Confirmed!
            </h1>
            <p className="text-muted-foreground text-lg">
              Your child is now enrolled in the December Holiday Bootcamp
            </p>
          </div>

          {/* Enrolled Classes */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                Enrolled Classes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : enrolledClasses.length > 0 ? (
                <div className="space-y-4">
                  {enrolledClasses.map((cls) => (
                    <div key={cls.id} className="border rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between p-4 bg-muted/50">
                        <div>
                          <p className="font-medium text-foreground">{cls.subject}</p>
                          <p className="text-sm text-muted-foreground">
                            {cls.curriculum} • {cls.grade_levels.join(", ")}
                          </p>
                          {cls.tutor_name && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Tutor: <span className="font-medium">{cls.tutor_name}</span>
                            </p>
                          )}
                        </div>
                        <div className="text-right space-y-2">
                          <p className="text-sm font-medium text-primary">{cls.time_slot}</p>
                          <p className="text-xs text-muted-foreground">10 sessions</p>
                          {cls.meeting_link && (
                            <a
                              href={cls.meeting_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-xs font-medium hover:bg-primary/90 transition-colors"
                            >
                              <Video className="w-3 h-3" />
                              Join Class
                            </a>
                          )}
                        </div>
                      </div>
                      
                      {/* Session Schedule */}
                      {cls.session_topics && Array.isArray(cls.session_topics) && cls.session_topics.length > 0 && (
                        <div className="p-4 border-t">
                          <p className="text-sm font-medium text-foreground mb-3">10-Session Schedule</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {(cls.session_topics as SessionTopic[]).map((session, idx) => (
                              <div key={idx} className="flex items-start gap-2 text-sm">
                                <span className="bg-primary/10 text-primary font-medium rounded px-2 py-0.5 text-xs whitespace-nowrap">
                                  Day {session.day || idx + 1}
                                </span>
                                <span className="text-muted-foreground">{session.topic}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  Your enrollment details will be sent to your email.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Program Details */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Program Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-foreground">Program Dates</p>
                  <p className="text-sm text-muted-foreground">{programDates}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-foreground">Daily Schedule</p>
                  <p className="text-sm text-muted-foreground">{dailySchedule}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-muted-foreground" />
              <div>
                  <p className="font-medium text-foreground">Class Size</p>
                  <p className="text-sm text-muted-foreground">Maximum 15 students per class</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enroll Another Student */}
          <Card className="mb-6 bg-primary/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="bg-primary/10 rounded-full p-3">
                  <Plus className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">Have another child to enroll?</h3>
                  <p className="text-sm text-muted-foreground">
                    You can enroll additional students in the same or different classes
                  </p>
                </div>
                <Button asChild>
                  <Link to="/december-intensive">
                    Enroll Another Student
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRight className="w-5 h-5 text-primary" />
                What's Next?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-4">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                    1
                  </span>
                  <div>
                    <p className="font-medium text-foreground">Check Your Email</p>
                    <p className="text-sm text-muted-foreground">
                      You'll receive a confirmation email with full program details and class schedules.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                    2
                  </span>
                  <div>
                    <p className="font-medium text-foreground">Meeting Links</p>
                    <p className="text-sm text-muted-foreground">
                      Google Meet links for each class will be shared before the program starts on December 8th.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                    3
                  </span>
                  <div>
                    <p className="font-medium text-foreground">Prepare Your Student</p>
                    <p className="text-sm text-muted-foreground">
                      Ensure your child has a quiet study space, stable internet, and their study materials ready.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                    4
                  </span>
                  <div>
                    <p className="font-medium text-foreground">Questions?</p>
                    <p className="text-sm text-muted-foreground">
                      Contact us at{" "}
                      <a href="mailto:info@lanatutors.africa" className="text-primary hover:underline">
                        info@lanatutors.africa
                      </a>{" "}
                      for any inquiries.
                    </p>
                  </div>
                </li>
              </ol>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild>
              <Link to="/student/dashboard">
                Go to Dashboard
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/december-intensive">
                View Program Details
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default DecemberIntensiveConfirmed;
