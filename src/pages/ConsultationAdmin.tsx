import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Calendar, Clock, Mail, Phone, User, BookOpen, FileText, Video, Edit, Save, X, MessageCircle } from "lucide-react";

interface ConsultationBooking {
  id: string;
  parent_name: string;
  student_name: string;
  email: string;
  phone_number: string;
  consultation_date: string;
  consultation_time: string;
  grade_level: string;
  subjects_interest: string[];
  preferred_mode: string;
  additional_notes?: string;
  status: string;
  created_at: string;
}

export default function ConsultationAdmin() {
  const [bookings, setBookings] = useState<ConsultationBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState("");

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from("consultation_bookings")
        .select("*")
        .order("consultation_date", { ascending: true })
        .order("consultation_time", { ascending: true });

      if (error) throw error;
      setBookings(data || []);
    } catch (error: any) {
      toast.error("Failed to load bookings: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditNote = (bookingId: string, currentNote: string) => {
    setEditingNote(bookingId);
    setNoteContent(currentNote || "");
  };

  const handleSaveNote = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from("consultation_bookings")
        .update({ additional_notes: noteContent })
        .eq("id", bookingId);

      if (error) throw error;

      toast.success("Note saved successfully");
      setEditingNote(null);
      fetchBookings();
    } catch (error: any) {
      toast.error("Failed to save note: " + error.message);
    }
  };

  const handleCancelEdit = () => {
    setEditingNote(null);
    setNoteContent("");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-500";
      case "pending":
        return "bg-yellow-500";
      case "cancelled":
        return "bg-red-500";
      case "completed":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleWhatsAppMessage = (booking: ConsultationBooking) => {
    // Format phone number (remove spaces and special characters)
    const cleanPhone = booking.phone_number.replace(/[\s\-\(\)]/g, '');
    
    // Construct the WhatsApp message
    const message = `Hi ${booking.parent_name}! 👋

This is a reminder about your free consultation for ${booking.student_name}.

📅 Date: ${formatDate(booking.consultation_date)}
⏰ Time: ${booking.consultation_time}
📚 Grade: ${booking.grade_level}
📖 Subjects: ${booking.subjects_interest.join(', ')}

We're looking forward to discussing ${booking.student_name}'s learning needs with you!

If you have any questions before the consultation, feel free to reply to this message.

Best regards,
The ElimuConnect Team`;

    // Encode the message for URL
    const encodedMessage = encodeURIComponent(message);
    
    // Open WhatsApp Web with pre-filled message
    window.open(`https://wa.me/${cleanPhone}?text=${encodedMessage}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Consultation Bookings</h1>
          <p className="text-muted-foreground">
            Manage all scheduled free consultations
          </p>
        </div>

        <div className="grid gap-6">
          {bookings.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No consultation bookings yet.
              </CardContent>
            </Card>
          ) : (
            bookings.map((booking) => (
              <Card key={booking.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-2xl flex items-center gap-2">
                        <User className="h-5 w-5" />
                        {booking.student_name}
                      </CardTitle>
                      <p className="text-muted-foreground mt-1">
                        Parent: {booking.parent_name}
                      </p>
                    </div>
                    <Badge className={getStatusColor(booking.status)}>
                      {booking.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Date:</span>
                        <span>{formatDate(booking.consultation_date)}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Time:</span>
                        <span>{booking.consultation_time}</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Email:</span>
                        <a href={`mailto:${booking.email}`} className="text-primary hover:underline">
                          {booking.email}
                        </a>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Phone:</span>
                        <a href={`tel:${booking.phone_number}`} className="text-primary hover:underline">
                          {booking.phone_number}
                        </a>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Grade:</span>
                        <span>{booking.grade_level}</span>
                      </div>

                      <div className="flex items-start gap-2 text-sm">
                        <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <span className="font-medium">Subjects:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {booking.subjects_interest.map((subject, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {subject}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <Video className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Mode:</span>
                        <Badge variant="secondary">{booking.preferred_mode}</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t space-y-4">
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => handleWhatsAppMessage(booking)}
                        className="flex-1"
                        variant="default"
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Send WhatsApp Message
                      </Button>
                    </div>

                    <div className="flex items-start justify-between mb-2">
                      <span className="font-medium text-sm flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Admin Notes
                      </span>
                      {editingNote !== booking.id && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditNote(booking.id, booking.additional_notes || "")}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      )}
                    </div>
                    
                    {editingNote === booking.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={noteContent}
                          onChange={(e) => setNoteContent(e.target.value)}
                          placeholder="Add notes about this consultation..."
                          className="min-h-[100px]"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleSaveNote(booking.id)}>
                            <Save className="h-4 w-4 mr-1" />
                            Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                        {booking.additional_notes || "No notes added yet."}
                      </p>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground pt-2 border-t">
                    Booked on: {new Date(booking.created_at).toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
