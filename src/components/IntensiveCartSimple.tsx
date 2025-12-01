import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SelectedClass {
  id: string;
  subject: string;
  curriculum: string;
  gradeLevel: string;
}

interface IntensiveCartSimpleProps {
  selectedClasses: SelectedClass[];
  onRemoveClass: (classId: string) => void;
}

export const IntensiveCartSimple = ({ selectedClasses, onRemoveClass }: IntensiveCartSimpleProps) => {
  const navigate = useNavigate();
  const totalAmount = selectedClasses.length * 4000;

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
                  {selectedClasses.length} subject{selectedClasses.length !== 1 ? 's' : ''}
                </p>
                <p className="text-xl font-bold">KES {totalAmount.toLocaleString()}</p>
              </div>
            </div>

            {/* Selected classes */}
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedClasses.map((cls) => (
                <Badge
                  key={cls.id}
                  variant="secondary"
                  className="cursor-pointer hover:bg-destructive/20 px-3 py-2"
                  onClick={() => onRemoveClass(cls.id)}
                >
                  {cls.subject} ({cls.curriculum})
                  <X className="h-3 w-3 ml-2" />
                </Badge>
              ))}
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
