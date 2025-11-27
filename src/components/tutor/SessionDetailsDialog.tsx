import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
import { Calendar, Clock, User, BookOpen, Video, DollarSign, MapPin } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface SessionDetailsDialogProps {
  booking: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SessionDetailsDialog = ({ booking, open, onOpenChange }: SessionDetailsDialogProps) => {
  if (!booking) return null;

  const startTime = parseISO(booking.tutor_availability.start_time);
  const endTime = parseISO(booking.tutor_availability.end_time);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-500';
      case 'pending':
        return 'bg-yellow-500';
      case 'cancelled':
        return 'bg-red-500';
      case 'completed':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Session Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge className={getStatusColor(booking.status)}>
              {booking.status?.toUpperCase()}
            </Badge>
          </div>

          <Separator />

          {/* Student Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <User className="w-4 h-4 text-primary" />
              Student Information
            </div>
            <div className="ml-6 space-y-1">
              <div className="text-sm">
                <span className="text-muted-foreground">Name: </span>
                <span className="font-medium">{booking.profiles?.full_name || "Unknown"}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Session Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <BookOpen className="w-4 h-4 text-primary" />
              Class Details
            </div>
            <div className="ml-6 space-y-1">
              <div className="text-sm">
                <span className="text-muted-foreground">Subject: </span>
                <span className="font-medium">{booking.subject}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Class Type: </span>
                <span className="font-medium capitalize">{booking.class_type || 'Online'}</span>
              </div>
              {booking.notes && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Notes: </span>
                  <span className="font-medium">{booking.notes}</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Time & Location */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Calendar className="w-4 h-4 text-primary" />
              Schedule
            </div>
            <div className="ml-6 space-y-1">
              <div className="text-sm">
                <span className="text-muted-foreground">Date: </span>
                <span className="font-medium">{format(startTime, "EEEE, MMMM d, yyyy")}</span>
              </div>
              <div className="text-sm flex items-center gap-1">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <span className="font-medium">
                  {format(startTime, "h:mm a")} - {format(endTime, "h:mm a")}
                </span>
              </div>
            </div>
          </div>

          {booking.class_type === 'physical' && booking.meeting_link && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <MapPin className="w-4 h-4 text-primary" />
                  Location
                </div>
                <div className="ml-6 text-sm">
                  <span className="font-medium">{booking.meeting_link}</span>
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Payment Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <DollarSign className="w-4 h-4 text-primary" />
              Payment
            </div>
            <div className="ml-6 space-y-1">
              <div className="text-sm">
                <span className="text-muted-foreground">Amount: </span>
                <span className="font-medium">
                  {booking.currency || 'KES'} {booking.amount?.toLocaleString()}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Payment Option: </span>
                <span className="font-medium capitalize">{booking.payment_option || 'Full'}</span>
              </div>
              {booking.payment_option === 'deposit' && booking.balance_due > 0 && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Balance Due: </span>
                  <span className="font-medium text-orange-600">
                    {booking.currency || 'KES'} {booking.balance_due?.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Meeting Link */}
          {booking.meeting_link && booking.class_type !== 'physical' && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Video className="w-4 h-4 text-primary" />
                  Meeting Link
                </div>
                <Button
                  size="sm"
                  onClick={() => window.open(booking.meeting_link, '_blank')}
                  className="gap-2"
                >
                  <Video className="w-4 h-4" />
                  Join Session
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
