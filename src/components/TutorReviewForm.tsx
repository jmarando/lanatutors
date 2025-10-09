import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TutorReviewFormProps {
  tutorId: string;
  tutorName: string;
  bookingId?: string;
  onSuccess?: () => void;
}

export const TutorReviewForm = ({
  tutorId,
  tutorName,
  bookingId,
  onSuccess,
}: TutorReviewFormProps) => {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("tutor_reviews")
        .insert({
          tutor_id: tutorId,
          student_id: user.id,
          booking_id: bookingId,
          rating,
          comment: comment.trim() || null,
        });

      if (error) throw error;

      toast.success("Review submitted! It will be published after moderation.");
      setRating(0);
      setComment("");
      onSuccess?.();
    } catch (error: any) {
      console.error("Error submitting review:", error);
      toast.error(error.message || "Failed to submit review");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold mb-4">Rate Your Experience with {tutorName}</h3>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">Your Rating *</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  onMouseEnter={() => setHoveredRating(value)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 ${
                      value <= (hoveredRating || rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Your Review (Optional)</p>
            <Textarea
              placeholder="Share your experience with this tutor..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {comment.length}/500 characters
            </p>
          </div>

          <Button onClick={handleSubmit} disabled={loading || rating === 0} className="w-full">
            {loading ? "Submitting..." : "Submit Review"}
          </Button>

          <p className="text-xs text-muted-foreground">
            * Reviews are moderated before being published to ensure quality and appropriateness.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
