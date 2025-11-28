import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Edit, Trash, Users, Calendar } from "lucide-react";

export const AdminGroupClasses = () => {
  const [groupClasses, setGroupClasses] = useState<any[]>([]);
  const [tutors, setTutors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    curriculum: "",
    grade_level: "",
    subject: "",
    description: "",
    day_of_week: "",
    start_time: "",
    end_time: "",
    max_students: 10,
  });

  useEffect(() => {
    fetchGroupClasses();
    fetchTutors();
  }, []);

  const fetchGroupClasses = async () => {
    const { data, error } = await supabase
      .from("group_classes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching group classes:", error);
    } else {
      setGroupClasses(data || []);
    }
    setLoading(false);
  };

  const fetchTutors = async () => {
    const { data, error } = await supabase
      .from("tutor_profiles")
      .select(`
        id,
        subjects,
        profiles!inner(full_name)
      `)
      .eq("verified", true);

    if (error) {
      console.error("Error fetching tutors:", error);
    } else {
      setTutors(data || []);
    }
  };

  const handleCreateClass = async () => {
    if (!formData.curriculum || !formData.grade_level || !formData.subject || !formData.day_of_week || !formData.start_time || !formData.end_time) {
      toast.error("Please fill in all required fields");
      return;
    }

    const title = `${formData.grade_level} ${formData.subject} - ${formData.curriculum}`;

    const { data, error } = await supabase
      .from("group_classes")
      .insert({
        title,
        ...formData,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating group class:", error);
      toast.error("Failed to create group class");
    } else {
      toast.success("Group class created successfully");
      setCreateDialogOpen(false);
      setFormData({
        curriculum: "",
        grade_level: "",
        subject: "",
        description: "",
        day_of_week: "",
        start_time: "",
        end_time: "",
        max_students: 10,
      });
      fetchGroupClasses();

      // Generate meeting link
      generateMeetingLink(data.id);
    }
  };

  const generateMeetingLink = async (classId: string) => {
    const { data, error } = await supabase.functions.invoke("create-google-meet-session", {
      body: {
        summary: `Group Class - ${classId}`,
        description: "Group tutoring session",
        startDateTime: new Date().toISOString(),
        endDateTime: new Date(Date.now() + 3600000).toISOString(),
      },
    });

    if (error) {
      console.error("Error generating meeting link:", error);
    } else if (data?.meetingLink) {
      await supabase
        .from("group_classes")
        .update({ meeting_link: data.meetingLink })
        .eq("id", classId);
      
      toast.success("Meeting link generated");
      fetchGroupClasses();
    }
  };

  const handleDeleteClass = async (classId: string) => {
    const { error } = await supabase
      .from("group_classes")
      .delete()
      .eq("id", classId);

    if (error) {
      console.error("Error deleting group class:", error);
      toast.error("Failed to delete group class");
    } else {
      toast.success("Group class deleted");
      fetchGroupClasses();
    }
  };

  const subjects = ["Mathematics", "English", "Kiswahili", "Science", "Physics", "Chemistry", "Biology"];
  const curricula = ["CBC", "British", "American", "IB", "8-4-4"];
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Group Classes Management</h2>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Group Class
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Group Class</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Curriculum *</Label>
                  <Select value={formData.curriculum} onValueChange={(value) => setFormData({...formData, curriculum: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select curriculum" />
                    </SelectTrigger>
                    <SelectContent>
                      {curricula.map((curr) => (
                        <SelectItem key={curr} value={curr}>{curr}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Grade Level *</Label>
                  <Input
                    value={formData.grade_level}
                    onChange={(e) => setFormData({...formData, grade_level: e.target.value})}
                    placeholder="e.g., Grade 6"
                  />
                </div>
              </div>

              <div>
                <Label>Subject *</Label>
                <Select value={formData.subject} onValueChange={(value) => setFormData({...formData, subject: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subj) => (
                      <SelectItem key={subj} value={subj}>{subj}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Describe the class focus and objectives"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Day of Week *</Label>
                  <Select value={formData.day_of_week} onValueChange={(value) => setFormData({...formData, day_of_week: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select day" />
                    </SelectTrigger>
                    <SelectContent>
                      {days.map((day) => (
                        <SelectItem key={day} value={day}>{day}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Start Time (EAT) *</Label>
                  <Input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                  />
                </div>
                <div>
                  <Label>End Time (EAT) *</Label>
                  <Input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <Label>Max Students</Label>
                <Input
                  type="number"
                  value={formData.max_students}
                  onChange={(e) => setFormData({...formData, max_students: parseInt(e.target.value)})}
                  min={1}
                  max={20}
                />
              </div>

              <Button onClick={handleCreateClass} className="w-full">
                Create Class
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        </div>
      ) : (
        <div className="grid gap-4">
          {groupClasses.map((classItem) => (
            <Card key={classItem.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2">{classItem.title}</CardTitle>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">{classItem.curriculum}</Badge>
                      <Badge variant="outline">{classItem.grade_level}</Badge>
                      <Badge>{classItem.subject}</Badge>
                      <Badge variant={classItem.status === "active" ? "default" : "secondary"}>
                        {classItem.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteClass(classItem.id)}>
                      <Trash className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground mb-1">Schedule</div>
                    <div className="font-medium">{classItem.day_of_week}</div>
                    <div>{classItem.start_time} - {classItem.end_time} EAT</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Enrollment</div>
                    <div className="font-medium">{classItem.current_enrollment}/{classItem.max_students} students</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Rate</div>
                    <div className="font-medium">KES {classItem.hourly_rate}/hr</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Meeting Link</div>
                    {classItem.meeting_link ? (
                      <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => window.open(classItem.meeting_link, '_blank')}>
                        View Link
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => generateMeetingLink(classItem.id)}>
                        Generate
                      </Button>
                    )}
                  </div>
                </div>
                {classItem.description && (
                  <p className="text-sm text-muted-foreground mt-4">{classItem.description}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
