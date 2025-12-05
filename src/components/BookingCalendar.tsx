import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, isSameDay } from "date-fns";
import { toZonedTime, fromZonedTime, formatInTimeZone } from "date-fns-tz";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CreditCard, Smartphone, FileText, Package } from "lucide-react";
import { PaymentOptionsCard } from "./PaymentOptionsCard";
import { NAIROBI_LOCATIONS } from "@/utils/locationData";
import { getLevelsForCurriculum } from "@/utils/curriculumData";
import { StudentPicker } from "./StudentPicker";
import { Student } from "@/hooks/useStudents";
import { PriceDisplay } from "@/components/PriceDisplay";

interface AvailabilitySlot {
  id: string;
  start_time: string;
  end_time: string;
  is_booked: boolean;
}

interface BookingCalendarProps {
  tutorId: string;
  tutorName: string;
  tutorEmail: string;
  studentEmail: string;
  studentName: string;
  hourlyRate: number;
  tutorSubjects?: string[];
  tutorLocations?: string[];
  tutorCurriculum?: string[];
  tutorTeachingMode?: string[];
  tutorTeachingLevels?: string[];
  onBookingComplete?: () => void;
  classType?: 'online' | 'in-person';
  isTrialSession?: boolean;
  selectedTier?: 'standard' | 'advanced';
  redeemPackageId?: string; // Pre-select package for redemption flow
}

interface PackageOffer {
  id: string;
  name: string;
  description: string;
  session_count: number;
  total_price: number;
  discount_percentage: number;
  validity_days: number;
}

interface PackagePurchase {
  id: string;
  sessions_remaining: number;
  expires_at: string;
  metadata?: any;
}

export const BookingCalendar = ({
  tutorId,
  tutorName,
  tutorEmail,
  studentEmail,
  studentName,
  hourlyRate,
  tutorSubjects = [],
  tutorLocations = [],
  tutorCurriculum = [],
  tutorTeachingMode = [],
  tutorTeachingLevels = [],
  onBookingComplete,
  classType = 'online',
  isTrialSession = false,
  selectedTier = 'standard',
  redeemPackageId,
}: BookingCalendarProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [availableSlots, setAvailableSlots] = useState<AvailabilitySlot[]>([]);
  const [monthSlots, setMonthSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [subject, setSubject] = useState("");
  const [curriculum, setCurriculum] = useState("");
  const [level, setLevel] = useState("");
  const [notes, setNotes] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedClassType, setSelectedClassType] = useState<'online' | 'in-person'>(classType);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [sessionDuration, setSessionDuration] = useState<1 | 2>(1); // 1 hour or 2 hours
  const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'card'>('mpesa');
  const [paymentOption, setPaymentOption] = useState<'deposit' | 'full' | 'package'>('deposit');
  const [packageOffers, setPackageOffers] = useState<PackageOffer[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<PackageOffer | null>(null);
  const [existingPackages, setExistingPackages] = useState<PackagePurchase[]>([]);
  const [selectedExistingPackage, setSelectedExistingPackage] = useState<PackagePurchase | null>(null);
  const [loading, setLoading] = useState(false);
  const [paymentInitiated, setPaymentInitiated] = useState(false);
  const [pricingTiers, setPricingTiers] = useState<any[]>([]);
  const [curriculumSpecificRate, setCurriculumSpecificRate] = useState<number | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [tutorUserId, setTutorUserId] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [bookingForSelf, setBookingForSelf] = useState(false);

  useEffect(() => {
    // Determine curriculum-level-specific rate when curriculum or level changes
    if (!curriculum || !level) {
      setCurriculumSpecificRate(null);
      return;
    }

    (async () => {
      console.log('[BookingCalendar] Fetching rate for:', { curriculum, level, tutorId });
      
      // Query curriculum_level_tier_assignments to find the correct tier for this curriculum-level combo
      const { data: assignment } = await supabase
        .from('curriculum_level_tier_assignments')
        .select('tier_id, tutor_pricing_tiers(online_hourly_rate)')
        .eq('tutor_id', tutorId)
        .eq('curriculum', curriculum)
        .eq('level', level)
        .maybeSingle();
      
      console.log('[BookingCalendar] Assignment found:', assignment);
      
      if (assignment && assignment.tutor_pricing_tiers) {
        const tierData = assignment.tutor_pricing_tiers as any;
        const rate = Number(tierData.online_hourly_rate);
        console.log('[BookingCalendar] Setting curriculum-specific rate:', rate);
        setCurriculumSpecificRate(rate);
      } else {
        // Fallback to base hourly rate if no specific tier found
        console.log('[BookingCalendar] No assignment found, using base hourly rate:', hourlyRate);
        setCurriculumSpecificRate(hourlyRate);
      }
    })();
  }, [curriculum, level, tutorId, hourlyRate]);

  useEffect(() => {
    // Resolve the tutor's auth user_id from the tutor profile id and fetch pricing tiers
    (async () => {
      const { data } = await supabase
        .from('tutor_profiles')
        .select('user_id')
        .eq('id', tutorId)
        .eq('verified', true)
        .maybeSingle();
      
      if (data?.user_id) {
        setTutorUserId(data.user_id);
      }
    })();
    
    // Fetch tutor pricing tiers
    (async () => {
      const { data } = await supabase
        .from('tutor_pricing_tiers')
        .select('*')
        .eq('tutor_id', tutorId)
        .order('tier_name');
      
      if (data) {
        setPricingTiers(data);
      }
    })();
  }, [tutorId]);

  useEffect(() => {
    if (selectedDate && tutorUserId) {
      fetchAvailableSlots();
      fetchMonthSlots();
    }
  }, [selectedDate, tutorId, tutorUserId]);

  useEffect(() => {
    fetchPackageOffers();
    fetchExistingPackages();
  }, [tutorId]);

  // Auto-select package for redemption flow and populate saved curriculum/level/subject
  useEffect(() => {
    if (redeemPackageId && existingPackages.length > 0) {
      const packageToRedeem = existingPackages.find(p => p.id === redeemPackageId);
      if (packageToRedeem) {
        setSelectedExistingPackage(packageToRedeem);
        setPaymentOption('package');
        
        // Auto-populate curriculum/level/subject from package metadata if available
        const metadata = packageToRedeem.metadata;
        if (metadata) {
          if (metadata.curriculum && tutorCurriculum?.includes(metadata.curriculum)) {
            setCurriculum(metadata.curriculum);
          }
          if (metadata.level) {
            setLevel(metadata.level);
          }
          if (metadata.subject && tutorSubjects?.includes(metadata.subject)) {
            setSubject(metadata.subject);
          }
        }
      }
    }
  }, [redeemPackageId, existingPackages, tutorCurriculum, tutorSubjects]);

  const effectiveRate = curriculumSpecificRate !== null ? curriculumSpecificRate : hourlyRate;
  const onlineRateDisplay = effectiveRate.toLocaleString();
  const inPersonRateDisplay = Math.round(effectiveRate * 1.5).toLocaleString();

  const fetchPackageOffers = async () => {
    const { data } = await supabase
      .from("package_offers")
      .select("*")
      .eq("tutor_id", tutorId)
      .eq("is_active", true)
      .order("session_count");
    
    if (data) setPackageOffers(data);
  };

  const fetchExistingPackages = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch packages that are completed, have sessions remaining, and either have no expiration or aren't expired yet
    const { data } = await supabase
      .from("package_purchases")
      .select("*")
      .eq("student_id", user.id)
      .eq("tutor_id", tutorId)
      .eq("payment_status", "completed")
      .gt("sessions_remaining", 0)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);
    
    if (data) setExistingPackages(data);
  };

  const fetchAvailableSlots = async () => {
    if (!selectedDate || !tutorUserId) return;

    // Convert selected date to EAT timezone for querying
    const EAT_TIMEZONE = 'Africa/Nairobi';
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Convert to UTC from EAT for database query
    const startOfDayUTC = fromZonedTime(startOfDay, EAT_TIMEZONE);
    const endOfDayUTC = fromZonedTime(endOfDay, EAT_TIMEZONE);

    const { data, error } = await supabase
      .from("tutor_availability")
      .select("*")
      .in("tutor_id", [tutorUserId as string, tutorId])
      .gte("start_time", startOfDayUTC.toISOString())
      .lte("start_time", endOfDayUTC.toISOString())
      .order("start_time");

    if (error) {
      console.error("Error fetching slots:", error);
      return;
    }

    const slots = data || [];

    // Build blocked intervals for overlap checks
    const blockedIntervals = slots
      .filter((s: any) => s.slot_type === "blocked")
      .map((s: any) => ({
        start: new Date(s.start_time).getTime(),
        end: new Date(s.end_time).getTime(),
      }));

    // If total blocked time for the day is >= 10 hours, treat the whole day as unavailable
    const totalBlockedHours = blockedIntervals.reduce((sum, b) => {
      return sum + (b.end - b.start) / (1000 * 60 * 60);
    }, 0);

    const hasFullDayBlock = totalBlockedHours >= 10; // our working day is roughly 8 AM - 8 PM

    if (hasFullDayBlock) {
      setAvailableSlots([]);
      return;
    }

    const overlaps = (aStart: number, aEnd: number, bStart: number, bEnd: number) =>
      Math.max(aStart, bStart) < Math.min(aEnd, bEnd);

    // Start from all non-booked, available slots
    const candidateAvailable = slots.filter((s: any) =>
      !s.is_booked && (s.slot_type === null || s.slot_type === "available")
    );

    // Remove any available slots that overlap a blocked interval
    const filtered = candidateAvailable.filter((s: any) => {
      const sStart = new Date(s.start_time).getTime();
      const sEnd = new Date(s.end_time).getTime();
      return !blockedIntervals.some((b) => overlaps(sStart, sEnd, b.start, b.end));
    });

    // Filter to only show slots between 6 AM and 10 PM EAT
    const filteredByTime = filtered.filter((s: any) => {
      const slotStartEAT = toZonedTime(new Date(s.start_time), EAT_TIMEZONE);
      const hour = slotStartEAT.getHours();
      return hour >= 6 && hour < 22; // 6 AM to 10 PM (slot starting at 9 PM ends at 10 PM)
    });

    setAvailableSlots(filteredByTime);
  };
  const fetchMonthSlots = async () => {
    if (!selectedDate) return;

    const EAT_TIMEZONE = 'Africa/Nairobi';
    const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);
    const monthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);
    
    // Convert to UTC from EAT for database query
    const monthStartUTC = fromZonedTime(monthStart, EAT_TIMEZONE);
    const monthEndUTC = fromZonedTime(monthEnd, EAT_TIMEZONE);

    const { data, error } = await supabase
      .from("tutor_availability")
      .select("*")
      .in("tutor_id", [tutorUserId as string, tutorId])
      .gte("start_time", monthStartUTC.toISOString())
      .lte("start_time", monthEndUTC.toISOString());

    if (error) {
      console.error("Error fetching month slots:", error);
      return;
    }

    setMonthSlots(data || []);
  };

  const handleBookSlot = async (showInvoice: boolean = false) => {
    if (!selectedSlot || !subject.trim() || !curriculum.trim() || !level.trim()) {
      toast({
        title: "Missing information",
        description: "Please select a slot, enter a subject, select a curriculum, and select a level",
        variant: "destructive",
      });
      return;
    }

    if (!tutorUserId) {
      toast({
        title: "Error",
        description: "Tutor information not loaded. Please refresh the page.",
        variant: "destructive",
      });
      return;
    }

    // Validate location for in-person sessions
    if (selectedClassType === 'in-person' && !selectedLocation) {
      toast({
        title: "Missing location",
        description: "Please select a teaching location for in-person sessions",
        variant: "destructive",
      });
      return;
    }

    // Validate that a rate has been determined (not 0 or null) for paid bookings
    if (!isTrialSession && paymentOption !== 'package') {
      const effectiveRate = curriculumSpecificRate !== null ? curriculumSpecificRate : hourlyRate;
      if (!effectiveRate || effectiveRate <= 0) {
        toast({
          title: "Rate not available",
          description: "No rate found for the selected curriculum and level. Please contact support or try a different curriculum/level combination.",
          variant: "destructive",
        });
        return;
      }
    }

    // Payment validation removed - Pesapal handles payment method collection

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Phone number no longer collected here - Pesapal handles it

      // For trial sessions, always 30 minutes and free
      let duration, totalAmount, depositAmount, balanceDue;
      
      if (isTrialSession) {
        duration = 0.5; // 30 minutes
        totalAmount = 0;
        depositAmount = 0;
        balanceDue = 0;
      } else {
        duration =
          (new Date(selectedSlot.end_time).getTime() -
            new Date(selectedSlot.start_time).getTime()) /
          (1000 * 60 * 60);
        
        // Multiply by sessionDuration for double sessions
        duration = duration * sessionDuration;
        
        // Use curriculum-specific rate if available, otherwise use base hourly rate
        const effectiveRate = curriculumSpecificRate !== null ? curriculumSpecificRate : hourlyRate;
        // Calculate rate (50% more for in-person)
        const baseRate = selectedClassType === 'in-person' ? effectiveRate * 1.5 : effectiveRate;
        // Apply 15% discount for double in-person sessions only (no discount for online double)
        const rate = (sessionDuration === 2 && selectedClassType === 'in-person') ? baseRate * 0.85 : baseRate;
        totalAmount = duration * rate;
        
        // Handle different payment options
        const depositRate = 0.3;
        
        if (paymentOption === 'deposit') {
          depositAmount = totalAmount * depositRate;
          balanceDue = totalAmount - depositAmount;
        } else if (paymentOption === 'full') {
          depositAmount = totalAmount;
          balanceDue = 0;
        } else if (paymentOption === 'package') {
          // Using existing package - no payment needed
          if (selectedExistingPackage) {
            depositAmount = 0;
            balanceDue = 0;
            totalAmount = 0;
          } 
          // Purchasing new package
          else if (selectedPackage) {
            totalAmount = selectedPackage.total_price;
            depositAmount = selectedPackage.total_price;
            balanceDue = 0;
          } else {
            throw new Error("Please select a package");
          }
        }
      }

      // For new package purchases, create package purchase first
      let packagePurchaseId = null;
      if (paymentOption === 'package' && selectedPackage && !selectedExistingPackage) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + selectedPackage.validity_days);

        const { data: pkgData, error: pkgError } = await supabase
          .from("package_purchases")
          .insert({
            student_id: user.id,
            tutor_id: tutorId,
            package_offer_id: selectedPackage.id,
            total_sessions: selectedPackage.session_count,
            sessions_remaining: selectedPackage.session_count,
            total_amount: selectedPackage.total_price,
            amount_paid: 0,
            payment_status: "pending",
            expires_at: expiresAt.toISOString(),
          })
          .select()
          .single();

        if (pkgError) throw pkgError;
        packagePurchaseId = pkgData.id;
      } else if (paymentOption === 'package' && selectedExistingPackage) {
        packagePurchaseId = selectedExistingPackage.id;
      }

      // Create booking with appropriate status
      const noteText = isTrialSession 
        ? `FREE CONSULTATION (30 min chemistry check): ${notes.trim()}` 
        : (notes.trim() || null);
      
      const notesWithLocation = selectedClassType === 'in-person' && selectedLocation
        ? `${noteText ? noteText + ' | ' : ''}Location: ${selectedLocation}`
        : noteText;

      const notesWithCurriculumLevel = `${notesWithLocation ? notesWithLocation + ' | ' : ''}Curriculum: ${curriculum} | Level: ${level} | Tier: ${selectedTier} | Duration: ${sessionDuration === 2 ? '2 hours' : '1 hour'}`;

      // Generate a booking_group_id if this is part of a multi-session booking
      // For now, single bookings get null, but future multi-session flows will generate a UUID here
      const bookingGroupId = null; // Will be populated when we implement multi-session booking

      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          student_id: user.id,
          tutor_id: tutorUserId,
          availability_slot_id: selectedSlot.id,
          subject: subject.trim(),
          notes: notesWithCurriculumLevel,
          amount: totalAmount,
          deposit_paid: depositAmount,
          balance_due: balanceDue,
          class_type: selectedClassType,
          status: (isTrialSession || paymentOption === 'package') ? "pending" : "pending",
          payment_option: isTrialSession ? 'deposit' : paymentOption,
          package_purchase_id: packagePurchaseId,
          booking_group_id: bookingGroupId,
          student_profile_id: selectedStudent?.id || null,
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Note: Google Meet and email sending happens via create-booking-with-meet after payment
      // For immediate booking flows (trial, package redemption), it's called directly below

      // For trial sessions, skip payment and send confirmation immediately
      if (isTrialSession) {
        // Create meet link and send booking confirmation emails
        await supabase.functions.invoke("create-booking-with-meet", {
          body: { bookingId: booking.id },
        });

        toast({
          title: "Consultation booked!",
          description: "Your free 30-minute chemistry session has been confirmed. Check your email for details.",
        });

        window.location.href = `/booking-confirmed?bookingId=${booking.id}`;
        return;
      }

      // Handle payment based on payment option
      if (paymentOption === 'package' && selectedExistingPackage) {
        // Using existing package - book for free, confirm immediately
        await supabase
          .from("bookings")
          .update({ status: "confirmed" })
          .eq("id", booking.id);

        // Deduct sessions from package - double sessions deduct 2, single deduct 1
        const sessionsToDeduct = sessionDuration; // 1 for single, 2 for double
        const newSessionsRemaining = Math.max(0, selectedExistingPackage.sessions_remaining - sessionsToDeduct);
        const newSessionsUsed = (selectedExistingPackage.metadata?.sessions_used || 0) + sessionsToDeduct;
        
        // Save curriculum/level/subject to package metadata and deduct sessions
        const existingMetadata = selectedExistingPackage.metadata || {};
        await supabase
          .from("package_purchases")
          .update({
            sessions_remaining: newSessionsRemaining,
            sessions_used: newSessionsUsed,
            metadata: {
              ...existingMetadata,
              curriculum: curriculum,
              level: level,
              subject: subject.trim(),
            }
          })
          .eq("id", selectedExistingPackage.id);

        // Create meet link and send booking email
        await supabase.functions.invoke("create-booking-with-meet", {
          body: { bookingId: booking.id },
        });

        toast({
          title: "Booking confirmed!",
          description: `Your session has been booked using ${sessionsToDeduct} package credit${sessionsToDeduct > 1 ? 's' : ''}. ${newSessionsRemaining} remaining.`,
        });

        window.location.href = `/booking-confirmed?bookingId=${booking.id}`;
        return;
      }

      // For paid options - either show invoice preview or go directly to payment
      if (showInvoice) {
        // Route 1: Generate invoice and pay (via invoice preview page)
        const invoiceUrl = paymentOption === 'package'
          ? `/invoice-preview?type=package&packageId=${packagePurchaseId}`
          : `/invoice-preview?type=booking&bookingId=${booking.id}`;
        
        window.location.href = invoiceUrl;
      } else {
        // Route 2: Direct payment (skip invoice preview, go straight to Pesapal)
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const { data: profile } = await supabase
          .from("profiles")
          .select("phone_number")
          .eq("id", user.id)
          .single();

        const phoneNum = profile?.phone_number || "";

        const description = paymentOption === 'package'
          ? `${selectedPackage?.session_count} session package`
          : `${subject.trim()} tutoring session`;

        const amountToPay = paymentOption === 'package' 
          ? totalAmount
          : paymentOption === 'full' 
            ? totalAmount 
            : depositAmount;

        const { data: paymentData, error: paymentError } = await supabase.functions.invoke("initiate-pesapal-payment", {
          body: {
            amount: Math.round(amountToPay),
            currency: "KES",
            description,
            phoneNumber: phoneNum,
            paymentType: paymentOption === 'package' ? "package_purchase" : "booking",
            referenceId: paymentOption === 'package' ? packagePurchaseId : booking.id,
            callbackUrl: window.location.origin + "/payment-callback",
          },
        });

        if (paymentError) throw paymentError;

        if (paymentData?.redirect_url) {
          window.location.href = paymentData.redirect_url;
        }
      }
    } catch (error: any) {
      console.error("Error booking slot:", error);
      toast({
        title: "Booking failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };



  const resetForm = () => {
    setSubject("");
    setNotes("");
    setPhoneNumber("");
    setSelectedSlot(null);
    setPaymentInitiated(false);
    setSelectedClassType('online');
    setSelectedLocation("");
    fetchAvailableSlots();

    onBookingComplete?.();
  };

  // Get availability status for a given date (used for calendar dots)
  const getDateStatus = (date: Date) => {
    const EAT_TIMEZONE = 'Africa/Nairobi';
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);
    
    // Convert to UTC from EAT
    const dayStartUTC = fromZonedTime(dayStart, EAT_TIMEZONE);
    const dayEndUTC = fromZonedTime(dayEnd, EAT_TIMEZONE);

    const daySlots = monthSlots.filter((slot) => {
      const slotStart = new Date(slot.start_time);
      return slotStart >= dayStartUTC && slotStart <= dayEndUTC;
    });

    if (daySlots.length === 0) return null;

    // Mirror the full-day block and overlap logic used for availableSlots
    const blockedIntervals = daySlots
      .filter((s: any) => s.slot_type === "blocked")
      .map((s: any) => ({
        start: new Date(s.start_time).getTime(),
        end: new Date(s.end_time).getTime(),
      }));

    const totalBlockedHours = blockedIntervals.reduce((sum, b) => {
      return sum + (b.end - b.start) / (1000 * 60 * 60);
    }, 0);

    const hasFullDayBlock = totalBlockedHours >= 10; // same threshold as fetchAvailableSlots

    const overlaps = (aStart: number, aEnd: number, bStart: number, bEnd: number) =>
      Math.max(aStart, bStart) < Math.min(aEnd, bEnd);

    const candidateAvailable = daySlots.filter((s: any) =>
      !s.is_booked && (s.slot_type === null || s.slot_type === "available")
    );

    const filteredAvailable = candidateAvailable.filter((s: any) => {
      const sStart = new Date(s.start_time).getTime();
      const sEnd = new Date(s.end_time).getTime();
      return !blockedIntervals.some((b) => overlaps(sStart, sEnd, b.start, b.end));
    });

    const hasAnyAvailable = !hasFullDayBlock && filteredAvailable.length > 0;
    const hasBooked = daySlots.some((s) => s.is_booked);
    const hasBlocked = daySlots.some((s) => s.slot_type === "blocked");

    if (hasAnyAvailable) return "available";

    // No effective availability left on this day
    if (hasBooked && !hasBlocked) return "fully-booked";
    if (hasBlocked || hasFullDayBlock || hasBooked) return "unavailable";

    return null;
  };

  // Build modifiers for calendar styling
  const availableDates: Date[] = [];
  const unavailableDates: Date[] = [];

  if (selectedDate) {
    const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const monthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
    
    for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
      const status = getDateStatus(new Date(d));
      if (status === "available") availableDates.push(new Date(d));
      else if (status === "unavailable" || status === "fully-booked") unavailableDates.push(new Date(d));
    }
  }


  return (
    <div className="space-y-6">
      {/* Active Package Banner */}
      {existingPackages.length > 0 && (
        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="bg-green-500 rounded-full p-2">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-green-800 dark:text-green-200">
                🎁 You have an active package with {tutorName}!
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                {existingPackages.reduce((sum, p) => sum + p.sessions_remaining, 0)} session{existingPackages.reduce((sum, p) => sum + p.sessions_remaining, 0) !== 1 ? 's' : ''} remaining. 
                Select "Use Package" below to book without additional payment.
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-medium block">Select Date</label>
          <div className="border rounded-lg p-3 bg-background">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              className="pointer-events-auto"
              modifiers={{
                available: availableDates,
                unavailable: unavailableDates,
              }}
              modifiersClassNames={{
                available: "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:bg-green-500 after:rounded-full",
                unavailable: "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:bg-red-500 after:rounded-full opacity-60",
              }}
            />
            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2 pt-2 border-t">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Available</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span>Unavailable</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium block">Available Time Slots</label>
              <span className="text-xs text-muted-foreground">Times in EAT</span>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto border rounded-lg p-3 bg-background">
              {availableSlots.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No available slots for this date
                </p>
              ) : (
                availableSlots.map((slot) => {
                  const EAT_TIMEZONE = 'Africa/Nairobi';
                  const startTimeEAT = formatInTimeZone(new Date(slot.start_time), EAT_TIMEZONE, "h:mm a");
                  const endTimeEAT = formatInTimeZone(new Date(slot.end_time), EAT_TIMEZONE, "h:mm a");
                  
                  return (
                    <Button
                      key={slot.id}
                      variant={selectedSlot?.id === slot.id ? "default" : "outline"}
                      className="w-full justify-start"
                      onClick={() => setSelectedSlot(slot)}
                    >
                      {startTimeEAT} - {endTimeEAT}
                    </Button>
                  );
                })
              )}
            </div>
          </div>

          {selectedSlot && (
            <div className="space-y-4 pt-4 border-t">
              {/* Student Picker for parent accounts */}
              <StudentPicker
                onStudentSelect={(student, forSelf) => {
                  setSelectedStudent(student);
                  setBookingForSelf(forSelf);
                }}
                selectedStudentId={selectedStudent?.id}
                bookingForSelf={bookingForSelf}
                defaultCurriculum={curriculum}
                defaultLevel={level}
              />
              
              {/* In redemption mode with pre-populated data, show read-only display */}
              {redeemPackageId && selectedExistingPackage?.metadata?.curriculum && selectedExistingPackage?.metadata?.level && selectedExistingPackage?.metadata?.subject ? (
                <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 rounded-lg p-4 space-y-2">
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">Session Details (from package)</p>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Curriculum:</span>
                      <p className="font-medium">{curriculum}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Level:</span>
                      <p className="font-medium">{level}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Subject:</span>
                      <p className="font-medium">{subject}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Curriculum *</Label>
                    {tutorCurriculum && tutorCurriculum.length > 0 ? (
                      <Select 
                        value={curriculum} 
                        onValueChange={(val) => {
                          setCurriculum(val);
                          setLevel(""); // Reset level when curriculum changes
                        }} 
                        disabled={paymentInitiated}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select curriculum" />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          {tutorCurriculum.map((curr) => (
                            <SelectItem key={curr} value={curr}>
                              {curr}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        placeholder="e.g., CBC, IGCSE, 8-4-4"
                        value={curriculum}
                        onChange={(e) => {
                          setCurriculum(e.target.value);
                          setLevel(""); // Reset level when curriculum changes
                        }}
                        disabled={paymentInitiated}
                      />
                    )}
                  </div>

                  {curriculum && (
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Level/Grade *</Label>
                      <Select value={level} onValueChange={setLevel} disabled={paymentInitiated}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select level/grade" />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50 max-h-[300px]">
                          {getLevelsForCurriculum(curriculum)
                            .filter((lvl) => {
                              // Only show levels that the tutor actually teaches for this curriculum
                              const tutorLevelKey = `${curriculum} - ${lvl.value}`;
                              return tutorTeachingLevels.some(tl => tl === tutorLevelKey);
                            })
                            .map((lvl) => (
                              <SelectItem key={lvl.value} value={lvl.value}>
                                {lvl.label}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      {curriculumSpecificRate !== null && curriculum && level && (
                        <p className="text-sm font-semibold text-primary mt-2">
                          Rate for {curriculum} - {level}: <PriceDisplay amountKES={curriculumSpecificRate} />/hr
                        </p>
                      )}
                    </div>
                  )}

                  <div>
                    <Label className="text-sm font-medium mb-2 block">Subject *</Label>
                    {tutorSubjects && tutorSubjects.length > 0 ? (
                      <Select value={subject} onValueChange={setSubject} disabled={paymentInitiated}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a subject" />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          {tutorSubjects.map((subj) => (
                            <SelectItem key={subj} value={subj}>
                              {subj}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        placeholder="e.g., Mathematics - Algebra"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        disabled={paymentInitiated}
                      />
                    )}
                  </div>
                </>
              )}

              {!isTrialSession && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">Class Type *</Label>
                  <div className={`grid ${tutorTeachingMode.includes('In-Person') ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
                    <button
                      type="button"
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        selectedClassType === 'online' 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      } ${paymentInitiated ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      onClick={() => !paymentInitiated && setSelectedClassType('online')}
                      disabled={paymentInitiated}
                    >
                      <div className="font-semibold mb-1">
                        Online - KES {onlineRateDisplay}/hr
                      </div>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li>✓ Session recordings</li>
                        <li>✓ AI transcripts</li>
                        <li>✓ Virtual whiteboard</li>
                      </ul>
                    </button>
                    {tutorTeachingMode.includes('In-Person') && (
                      <button
                        type="button"
                        className={`p-4 rounded-lg border-2 transition-all text-left ${
                          selectedClassType === 'in-person' 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:border-primary/50'
                        } ${paymentInitiated ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        onClick={() => !paymentInitiated && setSelectedClassType('in-person')}
                        disabled={paymentInitiated}
                      >
                        <div className="font-semibold mb-1">
                          In-Person - KES {inPersonRateDisplay}/hr
                        </div>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          <li>✓ Face-to-face learning</li>
                          <li>✓ Hands-on guidance</li>
                          <li>✓ Physical materials</li>
                        </ul>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {!isTrialSession && selectedClassType === 'in-person' && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">Teaching Location *</Label>
                  <Select value={selectedLocation} onValueChange={setSelectedLocation} disabled={paymentInitiated}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50 max-h-[300px]">
                      {tutorLocations.length > 0 ? (
                        tutorLocations.map((location) => (
                          <SelectItem key={location} value={location}>
                            {location}
                          </SelectItem>
                        ))
                      ) : (
                        NAIROBI_LOCATIONS.map((location) => (
                          <SelectItem key={location} value={location}>
                            {location}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {tutorLocations.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Tutor hasn't specified locations yet. All locations available.
                    </p>
                  )}
                </div>
              )}

              {!isTrialSession && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">Session Duration *</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        sessionDuration === 1 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      } ${paymentInitiated ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      onClick={() => !paymentInitiated && setSessionDuration(1)}
                      disabled={paymentInitiated}
                    >
                      <div className="font-semibold mb-1">Single Session (1 hour)</div>
                      <div className="text-sm text-muted-foreground">
                        {curriculumSpecificRate !== null && curriculum ? (
                          <>From <PriceDisplay amountKES={selectedClassType === 'online' ? curriculumSpecificRate : (curriculumSpecificRate * 1.5)} /></>
                        ) : (
                          <><PriceDisplay amountKES={selectedClassType === 'online' ? hourlyRate : (hourlyRate * 1.5)} /></>
                        )}
                      </div>
                    </button>
                    <button
                      type="button"
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        sessionDuration === 2 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      } ${paymentInitiated ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      onClick={() => !paymentInitiated && setSessionDuration(2)}
                      disabled={paymentInitiated}
                    >
                      <div className="font-semibold mb-1 flex items-center gap-2">
                        Double Session (2 hours)
                        {selectedClassType === 'in-person' && (
                          <Badge variant="secondary" className="text-xs">Save 15%</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {curriculumSpecificRate !== null && curriculum ? (
                          <>From <PriceDisplay amountKES={selectedClassType === 'online' ? (curriculumSpecificRate * 2) : (curriculumSpecificRate * 1.5 * 2 * 0.85)} /></>
                        ) : (
                          <><PriceDisplay amountKES={selectedClassType === 'online' ? (hourlyRate * 2) : (hourlyRate * 1.5 * 2 * 0.85)} /></>
                        )}
                      </div>
                    </button>
                  </div>
                </div>
              )}


              <div>
                <Label className="text-sm font-medium mb-2 block">Notes (Optional)</Label>
                <Textarea
                  placeholder="Any specific topics or questions?"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  disabled={paymentInitiated}
                />
              </div>

              {!isTrialSession && (
                <>
                  {selectedSlot && (() => {
                    const slotDuration = (new Date(selectedSlot.end_time).getTime() - new Date(selectedSlot.start_time).getTime()) / (1000 * 60 * 60);
                    const duration = slotDuration * sessionDuration;
                    // Use curriculum-specific rate if available, otherwise use base hourly rate
                    const effectiveRate = curriculumSpecificRate !== null ? curriculumSpecificRate : hourlyRate;
                    const baseRate = selectedClassType === 'in-person' ? effectiveRate * 1.5 : effectiveRate;
                    // Apply 5% discount for double lessons (2 hours)
                    const rate = sessionDuration === 2 ? baseRate * 0.95 : baseRate;
                    const total = duration * rate;
                    const depositRate = tutorId === '4d9426d7-7294-492a-a2e9-4b1642ba1954' ? 0.01 : 0.3;
                    const deposit = total * depositRate;
                    const balance = total - deposit;

                    // Check if we're in package redemption mode
                    const isRedemptionMode = redeemPackageId && selectedExistingPackage;

                    return (
                      <>
                        <div className="p-4 bg-muted/30 rounded-lg border">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium">Session Type:</span>
                            <span className="font-semibold">
                              {selectedClassType === 'online' ? 'Online' : 'In-Person'} - {sessionDuration === 1 ? '1 hour' : '2 hours'}
                            </span>
                          </div>
                          {!isRedemptionMode && (
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium">Total Amount:</span>
                              <span className="text-lg font-bold text-primary"><PriceDisplay amountKES={total} /></span>
                            </div>
                          )}
                        </div>

                        {/* Package Redemption Mode - Simplified UI */}
                        {isRedemptionMode ? (
                          <div className="bg-green-50 dark:bg-green-950/30 border-2 border-green-500 rounded-lg p-4">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="bg-green-500 rounded-full p-2">
                                <Package className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-green-800 dark:text-green-200">
                                  Redeeming from your package
                                </h3>
                                <p className="text-sm text-green-700 dark:text-green-300">
                                  {selectedExistingPackage.sessions_remaining} session{selectedExistingPackage.sessions_remaining !== 1 ? 's' : ''} remaining
                                </p>
                              </div>
                            </div>
                            <p className="text-sm text-green-700 dark:text-green-300">
                              ✅ This session will use 1 session from your package. No payment required.
                            </p>
                          </div>
                        ) : (
                          /* Standard Payment Option Selector */
                          <div>
                            <Label className="text-sm font-medium mb-2 block">Payment Option *</Label>
                            <div className={`grid gap-3 ${existingPackages.length > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                              {existingPackages.length > 0 && (
                                <button
                                  type="button"
                                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                                    paymentOption === 'package' 
                                      ? 'border-green-500 bg-green-50 dark:bg-green-950/30' 
                                      : 'border-green-200 hover:border-green-400 bg-green-50/50 dark:bg-green-950/10'
                                  } ${paymentInitiated ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                  onClick={() => {
                                    if (!paymentInitiated) {
                                      setPaymentOption('package');
                                      if (existingPackages.length === 1) {
                                        setSelectedExistingPackage(existingPackages[0]);
                                      }
                                    }
                                  }}
                                  disabled={paymentInitiated}
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    <Package className="w-4 h-4 text-green-600" />
                                    <span className="font-semibold text-green-700 dark:text-green-300">Use Package</span>
                                  </div>
                                  <div className="text-sm text-green-600 dark:text-green-400 mb-1">
                                    {existingPackages.reduce((sum, p) => sum + p.sessions_remaining, 0)} sessions left
                                  </div>
                                  <div className="text-xs text-green-600/80 dark:text-green-400/80">
                                    No payment needed
                                  </div>
                                </button>
                              )}
                              <button
                                type="button"
                                className={`p-4 rounded-lg border-2 transition-all text-left ${
                                  paymentOption === 'deposit' 
                                    ? 'border-primary bg-primary/5' 
                                    : 'border-border hover:border-primary/50'
                                } ${paymentInitiated ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                onClick={() => !paymentInitiated && setPaymentOption('deposit')}
                                disabled={paymentInitiated}
                              >
                                <div className="font-semibold mb-1">{tutorId === '4d9426d7-7294-492a-a2e9-4b1642ba1954' ? '1%' : '30%'} Deposit</div>
                                <div className="text-sm text-muted-foreground mb-2">
                                  Pay KES {deposit.toFixed(0)} now
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Balance due: KES {balance.toFixed(0)}
                                </div>
                              </button>
                              <button
                                type="button"
                                className={`p-4 rounded-lg border-2 transition-all text-left ${
                                  paymentOption === 'full' 
                                    ? 'border-primary bg-primary/5' 
                                    : 'border-border hover:border-primary/50'
                                } ${paymentInitiated ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                onClick={() => !paymentInitiated && setPaymentOption('full')}
                                disabled={paymentInitiated}
                              >
                                <div className="font-semibold mb-1">Full Payment</div>
                                <div className="text-sm text-muted-foreground mb-2">
                                  Pay KES {total.toFixed(0)} now
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  No balance due
                                </div>
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}

                  {/* Payment information message - only show when NOT in redemption mode */}
                  {!redeemPackageId && (
                    paymentOption === 'package' && existingPackages.length > 0 ? (
                      <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3">
                        <p className="text-sm text-green-700 dark:text-green-300">
                          ✅ This session will be deducted from your package. No payment required.
                        </p>
                      </div>
                    ) : (
                      <div className="bg-muted/50 border border-border rounded-lg p-3">
                        <p className="text-sm text-muted-foreground">
                          💳 You'll be redirected to Pesapal, our secure payment partner, to complete your payment with M-Pesa, Card, or other payment methods.
                        </p>
                      </div>
                    )
                  )}
                 </>
              )}

              <div className="space-y-2">
                <Button 
                  onClick={() => handleBookSlot(false)} 
                  disabled={loading || paymentInitiated} 
                  className={`w-full ${redeemPackageId && selectedExistingPackage ? 'bg-green-600 hover:bg-green-700' : paymentOption === 'package' && existingPackages.length > 0 ? 'bg-green-600 hover:bg-green-700' : ''}`}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {isTrialSession ? "Booking..." : (redeemPackageId || paymentOption === 'package') ? "Redeeming..." : "Processing..."}
                    </>
                  ) : paymentInitiated ? (
                    "Waiting for Payment..."
                  ) : isTrialSession ? (
                    "Confirm Free Trial"
                  ) : redeemPackageId && selectedExistingPackage ? (
                    <>
                      <Package className="w-4 h-4 mr-2" />
                      Redeem Session from Package
                    </>
                  ) : paymentOption === 'package' && existingPackages.length > 0 ? (
                    "Confirm Booking (Use Package)"
                  ) : (
                    "Proceed to Payment"
                  )}
                </Button>

                {!isTrialSession && !selectedExistingPackage && !redeemPackageId && (
                  <Button 
                    onClick={() => handleBookSlot(true)}
                    disabled={loading || paymentInitiated} 
                    variant="outline"
                    className="w-full"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4 mr-2" />
                        Generate Invoice & Pay
                      </>
                    )}
                  </Button>
                )}
              </div>

              {!paymentInitiated && !isTrialSession && (
                <div className="text-xs text-muted-foreground space-y-1">
                  {selectedExistingPackage ? (
                    <>
                      <p>✓ No payment needed - using your active package</p>
                      <p>• 1 session will be deducted from your package</p>
                    </>
                  ) : paymentOption === 'package' ? (
                    <>
                      <p>• Pay now to purchase this package</p>
                      <p>• Use sessions anytime within {selectedPackage?.validity_days} days</p>
                      <p>• Choose M-Pesa, Card, or other payment methods on the next page</p>
                    </>
                  ) : paymentOption === 'full' ? (
                    <>
                      <p>• Pay the full amount now - no balance required later</p>
                      <p>• Choose M-Pesa, Card, or other payment methods on the next page</p>
                    </>
                  ) : (
                    <>
                      <p>• Pay only {tutorId === '4d9426d7-7294-492a-a2e9-4b1642ba1954' ? '1%' : '30%'} deposit now to secure your booking</p>
                      <p>• Balance due before the session starts</p>
                      <p>• Choose M-Pesa, Card, or other payment methods on the next page</p>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
