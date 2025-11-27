import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, Send } from "lucide-react";
import { toast } from "sonner";

interface Subject {
  name: string;
  sessions: number;
  rate: number;
  sessionsPerWeek?: number;
  weeks?: number;
}

interface CreateLearningPlanFormProps {
  inquiry: any;
  tutorProfileId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const CreateLearningPlanForm = ({ 
  inquiry, 
  tutorProfileId, 
  onSuccess, 
  onCancel 
}: CreateLearningPlanFormProps) => {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState(`Learning Plan for ${inquiry.student_name}`);
  const [subjects, setSubjects] = useState<Subject[]>(
    inquiry.subjects_needed?.map((name: string) => ({
      name,
      sessions: inquiry.preferred_sessions ? Math.floor(inquiry.preferred_sessions / inquiry.subjects_needed.length) : 4,
      rate: 1500,
      sessionsPerWeek: 2,
      weeks: inquiry.desired_duration_weeks || 4,
    })) || []
  );
  const [discount, setDiscount] = useState(0);
  const [validityDays, setValidityDays] = useState(90);
  const [notes, setNotes] = useState("");

  const addSubject = () => {
    setSubjects([...subjects, { name: "", sessions: 1, rate: 1500, sessionsPerWeek: 2, weeks: inquiry.desired_duration_weeks || 4 }]);
  };

  const removeSubject = (index: number) => {
    setSubjects(subjects.filter((_, i) => i !== index));
  };

  const updateSubject = (index: number, field: keyof Subject, value: any) => {
    const updated = [...subjects];
    updated[index] = { ...updated[index], [field]: value };
    
    // Auto-calculate total sessions when sessionsPerWeek or weeks changes
    if (field === 'sessionsPerWeek' || field === 'weeks') {
      const sessionsPerWeek = field === 'sessionsPerWeek' ? value : updated[index].sessionsPerWeek || 2;
      const weeks = field === 'weeks' ? value : updated[index].weeks || 4;
      updated[index].sessions = sessionsPerWeek * weeks;
    }
    
    setSubjects(updated);
  };

  const calculateTotals = () => {
    const totalSessions = subjects.reduce((sum, s) => sum + Number(s.sessions), 0);
    const subtotal = subjects.reduce((sum, s) => sum + (Number(s.sessions) * Number(s.rate)), 0);
    const discountAmount = subtotal * (Number(discount) / 100);
    const totalPrice = subtotal - discountAmount;
    return { totalSessions, subtotal, discountAmount, totalPrice };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (subjects.length === 0) {
      toast.error("Please add at least one subject");
      return;
    }

    if (subjects.some(s => !s.name || s.sessions < 1 || s.rate < 1)) {
      toast.error("Please fill in all subject details");
      return;
    }

    setLoading(true);
    try {
      const { totalSessions, totalPrice } = calculateTotals();

      // Create learning plan
      const { data: plan, error: planError } = await supabase
        .from("learning_plans")
        .insert({
          tutor_id: tutorProfileId,
          inquiry_id: inquiry.id,
          title,
          subjects: subjects.map(s => ({
            name: s.name,
            sessions: s.sessions,
            rate: s.rate,
            total: s.sessions * s.rate,
          })),
          total_sessions: totalSessions,
          total_price: totalPrice,
          discount_applied: discount,
          validity_days: validityDays,
          notes,
          status: "proposed",
        })
        .select()
        .single();

      if (planError) throw planError;

      // Update inquiry status
      await supabase
        .from("tutor_inquiries")
        .update({ status: "plan_created" })
        .eq("id", inquiry.id);

      // Send email to parent
      const { error: emailError } = await supabase.functions.invoke("send-learning-plan-email", {
        body: {
          planId: plan.id,
          parentEmail: inquiry.parent_email,
          parentName: inquiry.parent_name,
          studentName: inquiry.student_name,
          planTitle: title,
          totalSessions,
          totalPrice,
          validityDays,
          personalMessage: notes,
          subjects: subjects.map(s => ({
            name: s.name,
            sessions: s.sessions,
            rate: s.rate,
          })),
        },
      });

      if (emailError) {
        console.error("Email error:", emailError);
        toast.error("Learning plan created but email failed to send");
      } else {
        toast.success("Learning plan created and sent to parent!");
      }

      onSuccess();
    } catch (error: any) {
      console.error("Error creating learning plan:", error);
      toast.error(error.message || "Failed to create learning plan");
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Inquiry Info */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Student:</span>
              <p className="font-medium">{inquiry.student_name}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Parent:</span>
              <p className="font-medium">{inquiry.parent_name}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Grade:</span>
              <p className="font-medium">{inquiry.grade_level}</p>
            </div>
            {inquiry.curriculum && (
              <div>
                <span className="text-muted-foreground">Curriculum:</span>
                <p className="font-medium">{inquiry.curriculum}</p>
              </div>
            )}
            {inquiry.desired_duration_weeks && (
              <div>
                <span className="text-muted-foreground">Desired Duration:</span>
                <p className="font-medium">{inquiry.desired_duration_weeks} weeks</p>
              </div>
            )}
            {inquiry.available_time_per_week && (
              <div>
                <span className="text-muted-foreground">Available Time/Week:</span>
                <p className="font-medium">{inquiry.available_time_per_week}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Schedule Guidance */}
      {inquiry.desired_duration_weeks && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <h4 className="font-semibold text-sm mb-2">📅 Schedule Planning Tip</h4>
            <p className="text-xs text-muted-foreground">
              The parent wants tutoring for <strong>{inquiry.desired_duration_weeks} weeks</strong>
              {inquiry.available_time_per_week && ` with ${inquiry.available_time_per_week} available`}.
              Consider recommending 2-3 sessions per week spread across subjects. 
              For example: {inquiry.desired_duration_weeks} weeks × 2 sessions/week = {inquiry.desired_duration_weeks * 2} total sessions.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Plan Title */}
      <div>
        <Label htmlFor="title">Plan Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      {/* Personal Message */}
      <div>
        <Label htmlFor="notes">Personal Message to Parent</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Write a personal introduction that will appear at the top of the email. For example: 'Hi [Parent Name], I'm excited to work with [Student Name]! Here's the customized learning plan I've prepared...'"
          rows={4}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground mt-1">
          This message will appear at the beginning of the email sent to the parent
        </p>
      </div>

      {/* Subjects */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Label>Subjects & Sessions</Label>
          <Button type="button" variant="outline" size="sm" onClick={addSubject}>
            <Plus className="w-4 h-4 mr-2" />
            Add Subject
          </Button>
        </div>
        <div className="space-y-3">
          {subjects.map((subject, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                  <div className="md:col-span-3">
                    <Label className="text-xs">Subject</Label>
                    <Input
                      value={subject.name}
                      onChange={(e) => updateSubject(index, "name", e.target.value)}
                      placeholder="e.g., Mathematics"
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <div>
                    <Label className="text-xs">Sessions/Week</Label>
                    <Input
                      type="number"
                      min="1"
                      max="7"
                      value={subject.sessionsPerWeek || 2}
                      onChange={(e) => updateSubject(index, "sessionsPerWeek", parseInt(e.target.value) || 2)}
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Weeks</Label>
                    <Input
                      type="number"
                      min="1"
                      value={subject.weeks || 4}
                      onChange={(e) => updateSubject(index, "weeks", parseInt(e.target.value) || 4)}
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Total Sessions</Label>
                    <Input
                      type="number"
                      min="1"
                      value={subject.sessions}
                      disabled
                      className="bg-muted/50 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Rate/Session (KES)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={subject.rate}
                      onChange={(e) => updateSubject(index, "rate", parseInt(e.target.value) || 1500)}
                      required
                    />
                  </div>
                  <div className="flex items-end">
                    {subjects.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSubject(index)}
                        className="w-full"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="mt-3 p-2 bg-muted/30 rounded text-xs">
                  <p className="text-muted-foreground">
                    Schedule: <strong>{subject.sessionsPerWeek || 2} sessions/week</strong> × <strong>{subject.weeks || 4} weeks</strong> = {subject.sessions} total sessions
                  </p>
                  <p className="text-muted-foreground mt-1">
                    Subtotal: <strong>KES {(subject.sessions * subject.rate).toLocaleString()}</strong>
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Pricing */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="discount">Discount (%)</Label>
          <Input
            id="discount"
            type="number"
            min="0"
            max="100"
            value={discount}
            onChange={(e) => setDiscount(parseInt(e.target.value) || 0)}
          />
        </div>
        <div>
          <Label htmlFor="validity">Validity (Days)</Label>
          <Input
            id="validity"
            type="number"
            min="1"
            value={validityDays}
            onChange={(e) => setValidityDays(parseInt(e.target.value) || 90)}
            required
          />
        </div>
      </div>

      {/* Summary */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Total Sessions:</span>
            <span className="font-semibold">{totals.totalSessions}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Subtotal:</span>
            <span>KES {totals.subtotal.toLocaleString()}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount ({discount}%):</span>
              <span>- KES {totals.discountAmount.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold border-t pt-2">
            <span>Total Price:</span>
            <span>KES {totals.totalPrice.toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Create & Send to Parent
            </>
          )}
        </Button>
      </div>
    </form>
  );
};
