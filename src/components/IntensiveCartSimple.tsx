import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, ShoppingCart, Minus, Plus, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SelectedClass {
  id: string;
  subject: string;
  curriculum: string;
  gradeLevel: string;
  quantity: number;
}

interface IntensiveCartSimpleProps {
  selectedClasses: SelectedClass[];
  onRemoveClass: (classId: string) => void;
  onUpdateQuantity: (classId: string, quantity: number) => void;
}

export const IntensiveCartSimple = ({ selectedClasses, onRemoveClass, onUpdateQuantity }: IntensiveCartSimpleProps) => {
  const navigate = useNavigate();
  const totalStudents = selectedClasses.reduce((sum, cls) => sum + cls.quantity, 0);
  const totalAmount = totalStudents * 4000;

  if (selectedClasses.length === 0) {
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
                  {selectedClasses.length} subject{selectedClasses.length !== 1 ? "s" : ""} • {totalStudents} student{totalStudents !== 1 ? "s" : ""}
                </p>
                <p className="text-xl font-bold">KES {totalAmount.toLocaleString()}</p>
              </div>
            </div>

            {/* Selected classes with details */}
            <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
              {selectedClasses.map((cls) => (
                <div
                  key={cls.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-background border"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{cls.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {cls.curriculum} • {cls.gradeLevel}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      KES {(cls.quantity * 4000).toLocaleString()}
                    </p>
                  </div>
                  
                  {/* Quantity controls */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-muted rounded-md">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => onUpdateQuantity(cls.id, cls.quantity - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <div className="flex items-center gap-1 px-2 min-w-[3rem] justify-center">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm font-medium">{cls.quantity}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => onUpdateQuantity(cls.id, cls.quantity + 1)}
                        disabled={cls.quantity >= 10}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => onRemoveClass(cls.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Price breakdown */}
            <div className="text-xs text-muted-foreground mb-4 p-2 bg-muted/50 rounded">
              KES 400/session × 10 sessions × {totalStudents} student{totalStudents !== 1 ? "s" : ""} = <span className="font-semibold">KES {totalAmount.toLocaleString()}</span>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  localStorage.removeItem('december_intensive_cart');
                  window.location.reload();
                }}
                className="flex-1"
              >
                Clear Cart
              </Button>
              <Button
                onClick={() => navigate("/december-intensive/enroll")}
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
