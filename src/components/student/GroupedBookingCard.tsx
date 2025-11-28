import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Video, DollarSign, CalendarClock, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { useNavigate } from "react-router-dom";

interface GroupedBookingCardProps {
  bookings: any[];
  isUpcoming: boolean;
}

export function GroupedBookingCard({ bookings, isUpcoming }: GroupedBookingCardProps) {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();
  
  if (!bookings || bookings.length === 0) return null;
  
  // Use first booking for main display info
  const firstBooking = bookings[0];
  const totalSessions = bookings.length;
  
  // Calculate total balance due across all sessions
  const totalBalanceDue = bookings.reduce((sum, b) => sum + (b.balance_due || 0), 0);
  
  // Sort bookings by time for display
  const sortedBookings = [...bookings].sort((a, b) => {
    const timeA = a.tutor_availability?.start_time 
      ? new Date(a.tutor_availability.start_time).getTime()
      : new Date(a.created_at).getTime();
    const timeB = b.tutor_availability?.start_time 
      ? new Date(b.tutor_availability.start_time).getTime()
      : new Date(b.created_at).getTime();
    return timeA - timeB;
  });

  // Get next upcoming session
  const nextSession = sortedBookings[0];
  const nextSessionTime = nextSession.tutor_availability?.start_time 
    ? new Date(nextSession.tutor_availability.start_time)
    : new Date(nextSession.created_at);

  return (
    <Card className="border-l-4 border-l-primary hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        {/* Main Header */}
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-2xl font-bold">{firstBooking.subject}</h3>
              <Badge className="bg-primary">
                {totalSessions} {totalSessions === 1 ? 'Session' : 'Sessions'}
              </Badge>
              <Badge className="bg-green-600">Confirmed</Badge>
            </div>
            
            {isUpcoming && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground font-semibold">Next Session:</p>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <p className="text-base font-medium">
                    {formatInTimeZone(nextSessionTime, 'Africa/Nairobi', 'EEEE, MMMM d, yyyy')}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground ml-6">
                  {formatInTimeZone(nextSessionTime, 'Africa/Nairobi', 'h:mm a')} EAT
                </p>
              </div>
            )}

            {totalBalanceDue > 0 && (
              <Badge variant="outline" className="text-xs mt-2">
                Total Balance Due: {firstBooking.currency || 'KES'} {totalBalanceDue.toLocaleString()}
              </Badge>
            )}
          </div>
          
          {/* Quick Actions for Next Session */}
          {isUpcoming && (
            <div className="flex flex-col gap-2 min-w-[160px]">
              {/* Always show Join button - use meeting link if available, otherwise show request link option */}
              {nextSession.meeting_link ? (
                <Button
                  onClick={() => window.open(nextSession.meeting_link, '_blank')}
                  className="w-full"
                  size="lg"
                >
                  <Video className="w-4 h-4 mr-2" />
                  Join Class
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => {
                  const subject = encodeURIComponent('Request Meeting Link');
                    const body = encodeURIComponent(
                      `Booking ID: ${nextSession.id}\nSubject: ${nextSession.subject}\nDate/Time: ${formatInTimeZone(nextSessionTime, 'Africa/Nairobi', 'EEEE, MMMM d, yyyy')} at ${formatInTimeZone(nextSessionTime, 'Africa/Nairobi', 'h:mm a')} EAT\n\nPlease provide the meeting link for this session.`
                    );
                    window.location.href = `mailto:info@lanatutors.africa?subject=${subject}&body=${body}`;
                  }}
                  className="w-full"
                  size="lg"
                >
                  <Video className="w-4 h-4 mr-2" />
                  Request Meeting Link
                </Button>
              )}
              
              <Button
                variant="outline"
                onClick={() => {
                const subject = encodeURIComponent('Reschedule Request');
                  const body = encodeURIComponent(
                    `Booking ID: ${nextSession.id}\nSubject: ${nextSession.subject}\nCurrent Date/Time: ${formatInTimeZone(nextSessionTime, 'Africa/Nairobi', 'EEEE, MMMM d, yyyy')} at ${formatInTimeZone(nextSessionTime, 'Africa/Nairobi', 'h:mm a')} EAT\n\nPreferred New Date/Time:\n\nReason for Rescheduling:`
                  );
                  window.location.href = `mailto:info@lanatutors.africa?subject=${subject}&body=${body}`;
                }}
                className="w-full"
              >
                <CalendarClock className="w-4 h-4 mr-2" />
                Reschedule
              </Button>
              
              {totalBalanceDue > 0 && (
                <Button
                  variant="outline"
                  onClick={() => navigate(`/pay-balance/${nextSession.id}`)}
                  className="w-full"
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Pay Balance
                </Button>
              )}

              {nextSession.classroom_link && (
                <Button
                  variant="outline"
                  onClick={() => window.open(nextSession.classroom_link, '_blank')}
                  className="w-full"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Classroom
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Expand/Collapse for All Sessions */}
        {totalSessions > 1 && (
          <>
            <Button
              variant="ghost"
              onClick={() => setExpanded(!expanded)}
              className="w-full flex items-center justify-between text-sm text-muted-foreground hover:text-foreground"
            >
              <span>
                {expanded ? 'Hide' : 'View'} all {totalSessions} sessions
              </span>
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>

            {expanded && (
              <div className="mt-4 space-y-3 pt-4 border-t">
                {sortedBookings.map((booking, index) => {
                  const sessionTime = booking.tutor_availability?.start_time 
                    ? new Date(booking.tutor_availability.start_time)
                    : new Date(booking.created_at);
                  const balanceDue = booking.balance_due || 0;

                  return (
                    <div 
                      key={booking.id}
                      className="bg-muted/50 rounded-lg p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">Session {index + 1}</span>
                        <Badge variant="secondary" className="text-xs">
                          {booking.status}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>{formatInTimeZone(sessionTime, 'Africa/Nairobi', 'EEE, MMM d, yyyy')} at {formatInTimeZone(sessionTime, 'Africa/Nairobi', 'h:mm a')} EAT</span>
                      </div>

                      {balanceDue > 0 && (
                        <div className="text-xs text-orange-600">
                          Balance: {booking.currency || 'KES'} {balanceDue.toLocaleString()}
                        </div>
                      )}

                      <div className="flex gap-2 mt-2">
                        {isUpcoming && (
                          booking.meeting_link ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(booking.meeting_link, '_blank')}
                            >
                              <Video className="w-3 h-3 mr-1" />
                              Join
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                              const subject = encodeURIComponent('Request Meeting Link');
                                const body = encodeURIComponent(
                                  `Booking ID: ${booking.id}\nSubject: ${booking.subject}\nDate/Time: ${formatInTimeZone(sessionTime, 'Africa/Nairobi', 'EEEE, MMMM d, yyyy')} at ${formatInTimeZone(sessionTime, 'Africa/Nairobi', 'h:mm a')} EAT\n\nPlease provide the meeting link for this session.`
                                );
                                window.location.href = `mailto:info@lanatutors.africa?subject=${subject}&body=${body}`;
                              }}
                            >
                              <Video className="w-3 h-3 mr-1" />
                              Request Link
                            </Button>
                          )
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                          const subject = encodeURIComponent('Reschedule Request');
                            const body = encodeURIComponent(
                              `Booking ID: ${booking.id}\nSubject: ${booking.subject}\nCurrent Date/Time: ${formatInTimeZone(sessionTime, 'Africa/Nairobi', 'EEEE, MMMM d, yyyy')} at ${formatInTimeZone(sessionTime, 'Africa/Nairobi', 'h:mm a')} EAT\n\nPreferred New Date/Time:\n\nReason for Rescheduling:`
                            );
                            window.location.href = `mailto:info@lanatutors.africa?subject=${subject}&body=${body}`;
                          }}
                        >
                          <CalendarClock className="w-3 h-3 mr-1" />
                          Reschedule
                        </Button>
                        {booking.classroom_link && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(booking.classroom_link, '_blank')}
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Classroom
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
