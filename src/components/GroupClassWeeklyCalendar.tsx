import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface GroupClass {
  id: string;
  title: string;
  subject: string;
  curriculum: string;
  grade_level: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  description?: string;
  tutor_name: string;
  tutor_profile_slug?: string;
  tutor_profile_id?: string;
  current_enrollment: number;
  max_students: number;
}

interface GroupClassWeeklyCalendarProps {
  groupClasses: GroupClass[];
}

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const GroupClassWeeklyCalendar = ({ groupClasses }: GroupClassWeeklyCalendarProps) => {
  const navigate = useNavigate();

  // Group classes by day
  const classesByDay = daysOfWeek.reduce((acc, day) => {
    acc[day] = groupClasses
      .filter((c) => c.day_of_week === day)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
    return acc;
  }, {} as Record<string, GroupClass[]>);

  const handleEnroll = (classId: string) => {
    navigate(`/group-classes/${classId}/enroll`);
  };

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[1200px]">
        {/* Header with days */}
        <div className="grid grid-cols-6 gap-4 mb-4">
          {daysOfWeek.map((day) => (
            <div
              key={day}
              className="text-center py-3 bg-primary/10 rounded-lg font-semibold"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-6 gap-4">
          {daysOfWeek.map((day) => (
            <div key={day} className="space-y-3">
              {classesByDay[day].length === 0 ? (
                <Card className="bg-muted/50">
                  <CardContent className="p-6 text-center">
                    <p className="text-sm text-muted-foreground">No classes</p>
                  </CardContent>
                </Card>
              ) : (
                classesByDay[day].map((classItem) => (
                  <Card
                    key={classItem.id}
                    className="hover:shadow-md transition-all hover:border-primary/50"
                  >
                    <CardContent className="p-4 space-y-3">
                      {/* Time */}
                      <div className="flex items-center gap-2 text-sm font-medium text-primary">
                        <Clock className="w-4 h-4" />
                        <span>
                          {classItem.start_time} - {classItem.end_time}
                        </span>
                      </div>

                      {/* Subject and Grade */}
                      <div>
                        <h3 className="font-bold text-lg mb-1">
                          {classItem.subject}
                        </h3>
                        <div className="flex gap-2 flex-wrap">
                          <Badge variant="secondary" className="text-xs">
                            {classItem.curriculum}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {classItem.grade_level}
                          </Badge>
                        </div>
                      </div>

                      {/* Tutor */}
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {classItem.tutor_profile_slug || classItem.tutor_profile_id ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(
                                  `/tutors/${classItem.tutor_profile_slug || classItem.tutor_profile_id}`
                                );
                              }}
                              className="text-primary hover:underline"
                            >
                              {classItem.tutor_name}
                            </button>
                          ) : (
                            classItem.tutor_name
                          )}
                        </span>
                      </div>

                      {/* Enrollment */}
                      <div className="text-xs text-muted-foreground">
                        {classItem.current_enrollment}/{classItem.max_students} enrolled
                      </div>

                      {/* Enroll Button */}
                      <Button
                        onClick={() => handleEnroll(classItem.id)}
                        className="w-full"
                        size="sm"
                      >
                        Join Class
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-6 text-xs text-muted-foreground text-center">
          All times shown in East Africa Time (EAT)
        </div>
      </div>
    </div>
  );
};

export default GroupClassWeeklyCalendar;
