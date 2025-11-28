import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ShoppingCart, Plus, Minus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface AddToMultiTutorCartProps {
  tutorId: string;
  tutorName: string;
  tutorRate: number;
  subjects: string[];
}

interface CartItem {
  id: string;
  tutorId: string;
  tutorName: string;
  tutorRate: number;
  subject: string;
  sessions: number;
}

const CART_STORAGE_KEY = 'lana_multi_tutor_cart';

export const AddToMultiTutorCart = ({
  tutorId,
  tutorName,
  tutorRate,
  subjects,
}: AddToMultiTutorCartProps) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [sessions, setSessions] = useState(2);

  const addToCart = () => {
    if (!selectedSubject) {
      toast.error("Please select a subject");
      return;
    }

    try {
      // Load existing cart
      const savedCart = localStorage.getItem(CART_STORAGE_KEY);
      const cart: CartItem[] = savedCart ? JSON.parse(savedCart) : [];

      // Create new item
      const newItem: CartItem = {
        id: `${tutorId}-${selectedSubject}-${Date.now()}`,
        tutorId,
        tutorName,
        tutorRate,
        subject: selectedSubject,
        sessions,
      };

      // Add to cart
      cart.push(newItem);

      // Save cart
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));

      // Navigate to multi-tutor package page
      toast.success(`Added ${selectedSubject} with ${tutorName} to your cart!`);
      setOpen(false);
      navigate('/multi-tutor-package', { 
        state: { 
          fromCart: true, 
          itemsAdded: 1 
        } 
      });
    } catch (error) {
      console.error('Failed to add to cart:', error);
      toast.error('Failed to add to cart. Please try again.');
    }
  };

  return (
    <>
      <Button
        variant="outline"
        className="w-full bg-secondary/5 border-secondary/30 hover:bg-secondary/10 hover:border-secondary h-auto py-5 text-foreground"
        size="lg"
        onClick={() => setOpen(true)}
      >
        <div className="flex flex-col items-center gap-2 w-full">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-secondary" />
            <span className="font-semibold text-base text-foreground">Add to Multi-Subject Cart</span>
          </div>
          <span className="text-sm text-muted-foreground">Combine with other tutors & subjects</span>
        </div>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add to Multi-Subject Cart</DialogTitle>
            <DialogDescription>
              Select a subject and number of sessions with {tutorName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject} value={subject}>
                      {subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Number of Sessions</Label>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setSessions(Math.max(1, sessions - 1))}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <div className="flex-1 text-center">
                  <span className="text-2xl font-bold">{sessions}</span>
                  <p className="text-xs text-muted-foreground">
                    KES {(tutorRate * sessions).toLocaleString()}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setSessions(sessions + 1)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                {sessions >= 10 && "15% bulk discount will be applied"}
                {sessions >= 5 && sessions < 10 && "10% bulk discount will be applied"}
                {sessions >= 2 && sessions < 5 && "5% bulk discount will be applied"}
              </p>
            </div>

            <div className="pt-2 border-t">
              <Button className="w-full" size="lg" onClick={addToCart}>
                <ShoppingCart className="w-4 h-4 mr-2" />
                Add to Cart
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
