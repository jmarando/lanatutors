import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { analytics } from "@/utils/analytics";

export interface CartStudent {
  id: string;
  name: string;
  curriculum: string;
  gradeLevel: string;
  selectedClassIds: string[];
  selectedSubjects: Array<{ id: string; subject: string; curriculum: string }>;
}

interface IntensiveCartProps {
  students: CartStudent[];
  onRemoveStudent: (studentId: string) => void;
  onRemoveSubject: (studentId: string, classId: string) => void;
}

export const IntensiveCart = ({ students, onRemoveStudent, onRemoveSubject }: IntensiveCartProps) => {
  const navigate = useNavigate();
  const totalSubjects = students.reduce((sum, student) => sum + student.selectedClassIds.length, 0);
  const totalAmount = totalSubjects * 4000;

  if (students.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg z-50">
      <div className="container mx-auto px-4 py-4">
        <Card className="bg-primary/5 border-primary/20">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-lg">Your Cart</h3>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">
                  {totalSubjects} subject{totalSubjects !== 1 ? 's' : ''} • {students.length} student{students.length !== 1 ? 's' : ''}
                </p>
                <p className="text-xl font-bold">KES {totalAmount.toLocaleString()}</p>
              </div>
            </div>

            {/* Student list */}
            <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
              {students.map((student) => (
                <div key={student.id} className="bg-background rounded-lg p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold">{student.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {student.curriculum} • {student.gradeLevel}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveStudent(student.id)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {student.selectedSubjects.map((subj) => (
                      <Badge
                        key={subj.id}
                        variant="secondary"
                        className="cursor-pointer hover:bg-destructive/20"
                        onClick={() => onRemoveSubject(student.id, subj.id)}
                      >
                        {subj.subject}
                        <X className="h-3 w-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  // Clear cart
                  localStorage.removeItem('december_intensive_cart');
                  window.location.reload();
                }}
                className="flex-1"
              >
                Clear Cart
              </Button>
              <Button
                onClick={() => {
                  analytics.intensiveCheckoutStarted({ totalClasses: totalSubjects, totalAmount });
                  navigate("/december-intensive/enroll");
                }}
                className="flex-1"
                size="lg"
              >
                Proceed to Checkout
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
