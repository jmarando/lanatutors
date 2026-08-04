import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import lanaLogo from "@/assets/lana-tutors-invoice-logo.png";
import { 
  FileText, 
  Download, 
  Loader2, 
  Book, 
  CreditCard, 
  Calendar, 
  Clock, 
  User, 
  Mail, 
  Phone,
  Plus
} from "lucide-react";

type InvoiceSource = "custom" | "booking" | "package";

interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  source: InvoiceSource;
  parentName: string;
  parentEmail?: string;
  parentPhone?: string;
  studentName?: string;
  tutorName?: string;
  subject?: string;
  classType?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  totalSessions?: number;
  subjects?: { subject: string; sessions: number }[];
  expiresAt?: string;
  totalAmount: number;
  amountPaid?: number;
  balanceDue?: number;
  amountToPay: number;
  paymentOption?: "full" | "deposit" | "weekly";
  weeklyWeeks?: number;
  weeklySessionsPerWeek?: number;
  weeklyStartDate?: string;

  currency: string;
  notes?: string;
  referenceId?: string;
}

export default function AdminInvoices() {
  const { toast } = useToast();
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [source, setSource] = useState<InvoiceSource>("custom");
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState("");
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [savingParent, setSavingParent] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [newStudentGrade, setNewStudentGrade] = useState("");
  const [newStudentCurriculum, setNewStudentCurriculum] = useState("");
  const [savedInvoices, setSavedInvoices] = useState<any[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingStatus, setEditingStatus] = useState<string>("draft");
  const [savedSearch, setSavedSearch] = useState("");



  const [invoiceData, setInvoiceData] = useState<InvoiceData>({
    invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
    invoiceDate: format(new Date(), "yyyy-MM-dd"),
    dueDate: "",
    source: "custom",
    parentName: "",
    parentEmail: "",
    parentPhone: "",
    studentName: "",
    tutorName: "",
    subject: "",
    classType: "",
    description: "",
    totalAmount: 0,
    amountToPay: 0,
    currency: "KES",
    paymentOption: "full",
    weeklyWeeks: 4,
    weeklySessionsPerWeek: 2,
    weeklyStartDate: format(new Date(), "yyyy-MM-dd"),
    notes: "",

  });

  useEffect(() => {
    fetchBookingsAndPackages();
    fetchSavedInvoices();
  }, []);

  useEffect(() => {
    if (source === "booking" && selectedBookingId) {
      loadBookingInvoice(selectedBookingId);
    } else if (source === "package" && selectedPackageId) {
      loadPackageInvoice(selectedPackageId);
    }
  }, [source, selectedBookingId, selectedPackageId]);

  const fetchBookingsAndPackages = async () => {
    setLoading(true);
    try {
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (bookingsError) throw bookingsError;

      const { data: packagesData, error: packagesError } = await supabase
        .from("package_purchases")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (packagesError) throw packagesError;

      const bookingRows = bookingsData || [];
      const packageRows = packagesData || [];

      // Availability slots for booking dates
      const slotIds = Array.from(
        new Set(bookingRows.map((b: any) => b.availability_slot_id).filter(Boolean))
      );
      const slotMap = new Map<string, any>();
      if (slotIds.length) {
        const { data: slots } = await supabase
          .from("tutor_availability")
          .select("id, start_time, end_time")
          .in("id", slotIds as string[]);
        (slots || []).forEach((s: any) => slotMap.set(s.id, s));
      }

      // Profiles for parents (student_id) and tutors (tutor_id)
      const profileIds = Array.from(
        new Set(
          [
            ...bookingRows.map((b: any) => b.student_id),
            ...bookingRows.map((b: any) => b.tutor_id),
          ].filter(Boolean)
        )
      );
      const profileMap = new Map<string, any>();
      if (profileIds.length) {
        const { data: profileRows } = await supabase
          .from("profiles")
          .select("id, full_name, phone_number")
          .in("id", profileIds as string[]);
        (profileRows || []).forEach((p: any) => profileMap.set(p.id, p));
      }

      const bookingsWithTutors = bookingRows.map((booking: any) => ({
        ...booking,
        tutor_availability: booking.availability_slot_id
          ? slotMap.get(booking.availability_slot_id) || null
          : null,
        profiles: profileMap.get(booking.student_id) || null,
        tutorName: profileMap.get(booking.tutor_id)?.full_name || "Tutor",
      }));

      // Tutor names for packages (package_purchases.tutor_id -> tutor_profiles.id)
      const pkgTutorIds = Array.from(
        new Set(packageRows.map((p: any) => p.tutor_id).filter(Boolean))
      );
      const pkgTutorNameMap = new Map<string, string>();
      if (pkgTutorIds.length) {
        const { data: tutorProfiles } = await supabase
          .from("tutor_profiles")
          .select("id, user_id")
          .in("id", pkgTutorIds as string[]);
        const userIds = (tutorProfiles || []).map((t: any) => t.user_id).filter(Boolean);
        const nameMap = new Map<string, string>();
        if (userIds.length) {
          const { data: tutorNameRows } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", userIds);
          (tutorNameRows || []).forEach((p: any) => nameMap.set(p.id, p.full_name));
        }
        (tutorProfiles || []).forEach((t: any) => {
          pkgTutorNameMap.set(t.id, nameMap.get(t.user_id) || "Multiple Tutors");
        });
      }

      const packagesWithTutors = packageRows.map((pkg: any) => ({
        ...pkg,
        tutorName: pkgTutorNameMap.get(pkg.tutor_id) || "Multiple Tutors",
      }));

      setBookings(bookingsWithTutors);
      setPackages(packagesWithTutors);
    } catch (error) {
      console.error("Error fetching bookings/packages:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to load bookings and packages",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  const loadBookingInvoice = async (bookingId: string) => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return;

    const isDeposit = booking.payment_option === "deposit";
    const isSpecialTutor = booking.tutor_id === "4d9426d7-7294-492a-a2e9-4b1642ba1954";
    const depositRate = isSpecialTutor ? 0.01 : 0.3;
    const amountToPay = isDeposit ? booking.amount * depositRate : booking.amount;

    let parentEmail = booking.parent_email || "";
    if (!parentEmail && booking.student_id) {
      const { data: emailData } = await supabase.rpc("get_user_email", {
        _user_id: booking.student_id,
      });
      parentEmail = (emailData as string) || "";
    }

    setInvoiceData({
      invoiceNumber: `INV-BK-${booking.id.slice(0, 8).toUpperCase()}`,
      invoiceDate: format(new Date(booking.created_at || new Date()), "yyyy-MM-dd"),
      dueDate: booking.tutor_availability?.start_time
        ? format(new Date(booking.tutor_availability.start_time), "yyyy-MM-dd")
        : "",
      source: "booking",
      parentName: booking.profiles?.full_name || "Parent",
      parentEmail,

      parentPhone: booking.profiles?.phone_number || "",
      studentName: booking.student_name || "",
      tutorName: booking.tutorName || "Tutor",
      subject: booking.subject || "",
      classType: booking.class_type || "",
      description: "",
      startTime: booking.tutor_availability?.start_time,
      endTime: booking.tutor_availability?.end_time,
      totalAmount: booking.amount || 0,
      amountPaid: booking.deposit_paid || 0,
      balanceDue: booking.balance_due || 0,
      amountToPay: amountToPay || 0,
      paymentOption: booking.payment_option || "full",
      currency: booking.currency || "KES",
      notes: "",
      referenceId: booking.id,
    });
  };

  const loadPackageInvoice = async (packageId: string) => {
    const pkg = packages.find((p) => p.id === packageId);
    if (!pkg) return;

    const metadata = (pkg.metadata as any) || {};
    const isDeposit = metadata.paymentOption === "deposit";
    const isSpecialTutor = pkg.tutor_id === "4d9426d7-7294-492a-a2e9-4b1642ba1954";
    const depositRate = isSpecialTutor ? 0.01 : 0.3;
    const amountToPay = isDeposit ? pkg.total_amount * depositRate : pkg.total_amount;

    setInvoiceData({
      invoiceNumber: `INV-PK-${pkg.id.slice(0, 8).toUpperCase()}`,
      invoiceDate: format(new Date(pkg.created_at || new Date()), "yyyy-MM-dd"),
      dueDate: pkg.expires_at ? format(new Date(pkg.expires_at), "yyyy-MM-dd") : "",
      source: "package",
      parentName: metadata.parentName || "Parent",
      parentEmail: metadata.parentEmail || "",
      parentPhone: metadata.parentPhone || "",
      studentName: metadata.studentName || "",
      tutorName: pkg.tutorName || "Multiple Tutors",
      subject: "",
      classType: "",
      description: "",
      totalSessions: pkg.total_sessions,
      subjects: metadata.subjects || [],
      expiresAt: pkg.expires_at,
      totalAmount: pkg.total_amount || 0,
      amountPaid: pkg.amount_paid || 0,
      balanceDue: (pkg.total_amount || 0) - (pkg.amount_paid || 0),
      amountToPay: amountToPay || 0,
      paymentOption: metadata.paymentOption || "full",
      currency: pkg.currency || "KES",
      notes: "",
      referenceId: pkg.id,
    });
  };

  const handleCustomFieldChange = (field: keyof InvoiceData, value: any) => {
    setInvoiceData((prev) => {
      const next = { ...prev, [field]: value };
      if (
        field === "totalAmount" ||
        field === "paymentOption" ||
        field === "weeklyWeeks"
      ) {
        if (next.paymentOption === "deposit") {
          next.amountToPay = next.totalAmount * 0.3;
        } else if (next.paymentOption === "weekly") {
          const weeks = Math.max(1, Number(next.weeklyWeeks) || 1);
          next.amountToPay = Math.round(next.totalAmount / weeks);
        } else {
          next.amountToPay = next.totalAmount;
        }
      }
      // Default due date = the day classes start
      if (field === "weeklyStartDate" && value) {
        next.dueDate = value;
      }
      if (field === "paymentOption" && value === "weekly" && !next.dueDate) {
        next.dueDate = next.weeklyStartDate || next.dueDate;
      }
      return next;
    });
  };

  // Weekly payment plan: parents pay upfront at the start of each week, before that week's sessions
  const buildWeeklySchedule = (data: InvoiceData) => {
    const weeks = Math.max(1, Number(data.weeklyWeeks) || 1);
    const perWeek = Math.round(data.totalAmount / weeks);
    const start = data.weeklyStartDate ? new Date(data.weeklyStartDate) : new Date();
    const rows: { label: string; sessionsWeek: string; dueDate: string; amount: number }[] = [];
    let allocated = 0;

    for (let i = 0; i < weeks; i++) {
      const weekStart = new Date(start);
      weekStart.setDate(start.getDate() + i * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      const isLast = i === weeks - 1;
      const amount = isLast ? data.totalAmount - allocated : perWeek;
      allocated += amount;
      rows.push({
        label: `Week ${i + 1}`,
        sessionsWeek: `${format(weekStart, "d MMM")} – ${format(weekEnd, "d MMM yyyy")}`,
        // Paid in advance: on or before the first day of that week
        dueDate: format(weekStart, "d MMM yyyy"),
        amount,
      });
    }
    return rows;
  };




  const handleDownloadPDF = async () => {
    if (!invoiceRef.current) return;
    if (!invoiceData.parentName || invoiceData.totalAmount <= 0) {
      toast({
        title: "Missing details",
        description: "Please enter at least a parent name and a total amount.",
        variant: "destructive",
      });
      return;
    }

    setDownloading(true);
    try {
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const contentWidth = pageWidth - margin * 2;
      const contentHeight = pageHeight - margin * 2;

      // Pixels of the source canvas that fit on one PDF page
      let pxPerPage = Math.floor((contentHeight * canvas.width) / contentWidth);

      // If the content only slightly overflows a page boundary, shrink it a
      // little so we never end up with a nearly-empty trailing page.
      const rawPages = canvas.height / pxPerPage;
      const targetPages = rawPages <= 1.25 ? 1 : rawPages <= 2.3 ? 2 : Math.ceil(rawPages);
      if (targetPages < Math.ceil(rawPages)) {
        pxPerPage = Math.ceil(canvas.height / targetPages);
      }
      const totalPages = Math.max(1, Math.ceil(canvas.height / pxPerPage));


      for (let page = 0; page < totalPages; page++) {
        const sliceHeight = Math.min(pxPerPage, canvas.height - page * pxPerPage);

        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeight;
        const ctx = pageCanvas.getContext("2d");
        if (!ctx) continue;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        ctx.drawImage(
          canvas,
          0,
          page * pxPerPage,
          canvas.width,
          sliceHeight,
          0,
          0,
          canvas.width,
          sliceHeight
        );

        const imgData = pageCanvas.toDataURL("image/png");
        let drawWidth = contentWidth;
        let drawHeight = (sliceHeight * contentWidth) / canvas.width;
        if (drawHeight > contentHeight) {
          const shrink = contentHeight / drawHeight;
          drawHeight = contentHeight;
          drawWidth = contentWidth * shrink;
        }
        const offsetX = margin + (contentWidth - drawWidth) / 2;

        if (page > 0) pdf.addPage();
        pdf.addImage(imgData, "PNG", offsetX, margin, drawWidth, drawHeight);

      }

      pdf.save(`lana-tutors-invoice-${invoiceData.invoiceNumber}.pdf`);
      await saveInvoice(undefined, true);

      toast({
        title: "Success",
        description: `Invoice downloaded (${totalPages} page${totalPages > 1 ? "s" : ""})`,
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };


  const handleSaveParentToSystem = async () => {
    if (!invoiceData.parentName || !invoiceData.parentPhone) {
      toast({
        title: "Missing details",
        description: "Parent name and phone are required to create an account.",
        variant: "destructive",
      });
      return;
    }
    setSavingParent(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-parent-profile", {
        body: {
          fullName: invoiceData.parentName,
          phoneNumber: invoiceData.parentPhone,
          email: invoiceData.parentEmail || undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const parentId = data?.userId;
      if (!parentId) throw new Error("No parent account returned");

      if (invoiceData.studentName) {
        await supabase.from("students").insert({
          parent_id: parentId,
          full_name: invoiceData.studentName,
          grade_level: newStudentGrade || "Not specified",
          curriculum: newStudentCurriculum || "Not specified",
        });
      }

      toast({
        title: "Parent added",
        description: invoiceData.studentName
          ? "Parent account and student profile created."
          : "Parent account created.",
      });
    } catch (e: any) {
      console.error("Error creating parent:", e);
      toast({
        title: "Error",
        description: e.message || "Failed to create parent account",
        variant: "destructive",
      });
    } finally {
      setSavingParent(false);
    }
  };

  const handleEmailInvoice = async () => {
    if (!invoiceData.parentEmail) {
      toast({
        title: "No email",
        description: "Add the parent's email address first.",
        variant: "destructive",
      });
      return;
    }
    setEmailing(true);
    try {
      const isWeekly = invoiceData.paymentOption === "weekly";
      const schedule = isWeekly ? buildWeeklySchedule(invoiceData) : [];

      const rows = [
        ["Invoice number", invoiceData.invoiceNumber],
        ["Invoice date", invoiceData.invoiceDate],
        invoiceData.dueDate ? ["Payment due by", invoiceData.dueDate] : null,
        invoiceData.studentName ? ["Student", invoiceData.studentName] : null,
        invoiceData.subject ? ["Subject / Service", invoiceData.subject] : null,
        ["Total", `${invoiceData.currency} ${invoiceData.totalAmount.toLocaleString()}`],
        isWeekly
          ? ["Weekly instalment (paid in advance)", `${invoiceData.currency} ${invoiceData.amountToPay.toLocaleString()}`]
          : ["Amount due now", `${invoiceData.currency} ${invoiceData.amountToPay.toLocaleString()}`],
      ].filter(Boolean) as [string, string][];

      const scheduleHtml = isWeekly
        ? `
          <tr><td style="padding:20px 0 8px;font-weight:bold;font-size:15px">Weekly payment plan (paid in advance)</td></tr>
          <tr><td style="padding:0 0 12px;color:#4b5563">Each week's fee is payable in advance, on or before the first day of that week, to confirm that week's sessions${
            invoiceData.weeklySessionsPerWeek
              ? ` (${invoiceData.weeklySessionsPerWeek} session${invoiceData.weeklySessionsPerWeek > 1 ? "s" : ""} per week)`
              : ""
          }.</td></tr>
          <tr><td>
            <table role="presentation" width="100%" cellpadding="8" cellspacing="0" style="border:1px solid #f1d5d1;border-radius:8px">
              <tr style="background:#fef5f4">
                <td style="font-weight:bold">Week</td>
                <td style="font-weight:bold">Sessions</td>
                <td style="font-weight:bold">Pay on or before</td>
                <td style="font-weight:bold;text-align:right">Amount</td>
              </tr>
              ${schedule
                .map(
                  (r) =>
                    `<tr><td>${r.label}</td><td style="color:#6b7280">${r.sessionsWeek}</td><td style="color:#6b7280">${r.dueDate}</td><td style="text-align:right;font-weight:bold">${invoiceData.currency} ${r.amount.toLocaleString()}</td></tr>`
                )
                .join("")}
            </table>
          </td></tr>`
        : "";

      const paybillHtml = `
        <tr><td style="padding:24px 0 8px;font-weight:bold;font-size:15px">How to pay (M-Pesa)</td></tr>
        <tr><td>
          <table role="presentation" width="100%" cellpadding="8" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;background:#f9fafb">
            <tr><td style="color:#6b7280">NCBA Paybill</td><td style="text-align:right;font-weight:bold">880100</td></tr>
            <tr><td style="color:#6b7280">Account Number</td><td style="text-align:right;font-weight:bold">1006114657</td></tr>
            <tr><td style="color:#6b7280">Recipient</td><td style="text-align:right;font-weight:bold">Lana Bespoke Limited</td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:10px 0 0;color:#6b7280;font-size:13px">After paying, send your M-Pesa confirmation to info@lanatutors.africa or WhatsApp +254 117 512316.</td></tr>`;

      const html = `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial,Helvetica,sans-serif;color:#1f2937">
          <tr><td style="padding:0 0 16px">
            <p style="margin:0 0 12px">Hi ${invoiceData.parentName || "there"},</p>
            <p style="margin:0 0 16px">Please find your Lana Tutors invoice summary below.</p>
          </td></tr>
          <tr><td>
            <table role="presentation" width="100%" cellpadding="8" cellspacing="0" style="border:1px solid #f1d5d1;border-radius:8px">
              ${rows
                .map(
                  ([k, v]) =>
                    `<tr><td style="color:#6b7280">${k}</td><td style="text-align:right;font-weight:bold">${v}</td></tr>`
                )
                .join("")}
            </table>
          </td></tr>
          ${scheduleHtml}
          ${paybillHtml}
          ${
            invoiceData.notes
              ? `<tr><td style="padding:16px 0 0;color:#4b5563">${invoiceData.notes}</td></tr>`
              : ""
          }
          <tr><td style="padding:20px 0 0;color:#4b5563">Reply to this email if anything needs adjusting and we'll sort it out.</td></tr>
        </table>`;


      const { error } = await supabase.functions.invoke("send-admin-email", {
        body: {
          to: invoiceData.parentEmail,
          recipientName: invoiceData.parentName,
          subject: `Lana Tutors invoice ${invoiceData.invoiceNumber}`,
          html,
        },
      });
      if (error) throw error;
      await saveInvoice("sent", true);
      toast({ title: "Invoice sent", description: `Emailed to ${invoiceData.parentEmail}` });
    } catch (e: any) {
      console.error("Error emailing invoice:", e);
      toast({
        title: "Error",
        description: e.message || "Failed to send invoice email",
        variant: "destructive",
      });
    } finally {
      setEmailing(false);
    }
  };

  const resetToCustom = () => {

    setEditingId(null);
    setEditingStatus("draft");
    setSelectedBookingId("");
    setSelectedPackageId("");
    setInvoiceData({
      invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
      invoiceDate: format(new Date(), "yyyy-MM-dd"),
      dueDate: "",
      source: "custom",
      parentName: "",
      parentEmail: "",
      parentPhone: "",
      studentName: "",
      tutorName: "",
      subject: "",
      classType: "",
      description: "",
      totalAmount: 0,
      amountToPay: 0,
      currency: "KES",
      paymentOption: "full",
      weeklyWeeks: 4,
      weeklySessionsPerWeek: 2,
      weeklyStartDate: format(new Date(), "yyyy-MM-dd"),
      notes: "",

    });
  };

  const fetchSavedInvoices = async () => {
    setSavedLoading(true);
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      setSavedInvoices(data || []);
    } catch (e: any) {
      console.error("Error loading saved invoices:", e);
      toast({
        title: "Error",
        description: e.message || "Failed to load saved invoices",
        variant: "destructive",
      });
    } finally {
      setSavedLoading(false);
    }
  };

  const saveInvoice = async (status?: string, silent = false) => {
    if (!invoiceData.parentName) {
      if (!silent) {
        toast({
          title: "Missing details",
          description: "Add at least a parent name before saving.",
          variant: "destructive",
        });
      }
      return;
    }
    if (!silent) setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const payload = {
        invoice_number: invoiceData.invoiceNumber,
        invoice_date: invoiceData.invoiceDate || format(new Date(), "yyyy-MM-dd"),
        due_date: invoiceData.dueDate || null,
        source: invoiceData.source,
        parent_name: invoiceData.parentName,
        parent_email: invoiceData.parentEmail || null,
        parent_phone: invoiceData.parentPhone || null,
        student_name: invoiceData.studentName || null,
        tutor_name: invoiceData.tutorName || null,
        subject: invoiceData.subject || null,
        class_type: invoiceData.classType || null,
        description: invoiceData.description || null,
        currency: invoiceData.currency,
        total_amount: invoiceData.totalAmount || 0,
        amount_to_pay: invoiceData.amountToPay || invoiceData.totalAmount || 0,
        payment_option: invoiceData.paymentOption || "full",
        status: status || editingStatus || "draft",
        notes: invoiceData.notes || null,
        data: invoiceData as any,
        created_by: userData?.user?.id || null,
      };

      const { data, error } = await supabase
        .from("invoices")
        .upsert(payload, { onConflict: "invoice_number" })
        .select()
        .maybeSingle();
      if (error) throw error;

      if (data) {
        setEditingId(data.id);
        setEditingStatus(data.status);
      }
      if (!silent) {
        toast({ title: "Saved", description: `Invoice ${invoiceData.invoiceNumber} saved.` });
      }
      fetchSavedInvoices();
    } catch (e: any) {
      console.error("Error saving invoice:", e);
      if (!silent) {
        toast({
          title: "Error",
          description: e.message || "Failed to save invoice",
          variant: "destructive",
        });
      }
    } finally {
      if (!silent) setSaving(false);
    }
  };

  const loadSavedInvoice = (row: any) => {
    const stored = (row.data || {}) as Partial<InvoiceData>;
    setSource((stored.source as InvoiceSource) || (row.source as InvoiceSource) || "custom");
    setSelectedBookingId("");
    setSelectedPackageId("");
    setEditingId(row.id);
    setEditingStatus(row.status);
    setInvoiceData({
      invoiceNumber: row.invoice_number,
      invoiceDate: row.invoice_date || format(new Date(), "yyyy-MM-dd"),
      dueDate: row.due_date || "",
      source: (row.source as InvoiceSource) || "custom",
      parentName: row.parent_name || "",
      parentEmail: row.parent_email || "",
      parentPhone: row.parent_phone || "",
      studentName: row.student_name || "",
      tutorName: row.tutor_name || "",
      subject: row.subject || "",
      classType: row.class_type || "",
      description: row.description || "",
      totalAmount: Number(row.total_amount) || 0,
      amountToPay: Number(row.amount_to_pay) || 0,
      currency: row.currency || "KES",
      paymentOption: (row.payment_option as any) || "full",
      notes: row.notes || "",
      ...stored,
    });

    toast({ title: "Loaded", description: `Editing invoice ${row.invoice_number}` });
  };

  const updateInvoiceStatus = async (row: any, status: string) => {
    try {
      const { error } = await supabase.from("invoices").update({ status }).eq("id", row.id);
      if (error) throw error;
      if (editingId === row.id) setEditingStatus(status);
      fetchSavedInvoices();
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const deleteInvoice = async (row: any) => {
    try {
      const { error } = await supabase.from("invoices").delete().eq("id", row.id);
      if (error) throw error;
      if (editingId === row.id) {
        setEditingId(null);
        setEditingStatus("draft");
      }
      toast({ title: "Deleted", description: `Invoice ${row.invoice_number} removed.` });
      fetchSavedInvoices();
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "Failed to delete invoice",
        variant: "destructive",
      });
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Invoices</h2>
          <p className="text-sm text-muted-foreground">
            {editingId
              ? `Editing saved invoice ${invoiceData.invoiceNumber} (${editingStatus})`
              : "Create, save, download and revisit invoices for parents."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetToCustom}>
            <Plus className="mr-2 h-4 w-4" />
            New invoice
          </Button>
          <Button onClick={() => saveInvoice()} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                {editingId ? "Save changes" : "Save invoice"}
              </>
            )}
          </Button>
        </div>
      </div>


      <div className="grid lg:grid-cols-2 gap-6 items-start">
        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create Invoice
            </CardTitle>
            <CardDescription>
              Build a custom invoice or pull details from an existing booking/package.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Invoice Source</Label>
              <Select
                value={source}
                onValueChange={(value: InvoiceSource) => {
                  setSource(value);
                  resetToCustom();
                  if (value !== "custom") {
                    // Keep fields empty until a booking/package is selected
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom Invoice</SelectItem>
                  <SelectItem value="booking">From Existing Session Booking</SelectItem>
                  <SelectItem value="package">From Existing Lesson Package</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {source === "booking" && (
              <div className="space-y-2">
                <Label>Select Booking</Label>
                <Select value={selectedBookingId} onValueChange={setSelectedBookingId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a booking..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {bookings.map((booking) => (
                      <SelectItem key={booking.id} value={booking.id}>
                        {booking.subject} — {booking.profiles?.full_name || "Unknown"} — KES {booking.amount?.toLocaleString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {source === "package" && (
              <div className="space-y-2">
                <Label>Select Package</Label>
                <Select value={selectedPackageId} onValueChange={setSelectedPackageId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a package..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {packages.map((pkg) => (
                      <SelectItem key={pkg.id} value={pkg.id}>
                        {pkg.total_sessions} sessions — {pkg.tutorName} — {pkg.currency} {pkg.total_amount?.toLocaleString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Invoice Number</Label>
                <Input
                  value={invoiceData.invoiceNumber}
                  onChange={(e) => handleCustomFieldChange("invoiceNumber", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Invoice Date</Label>
                <Input
                  type="date"
                  value={invoiceData.invoiceDate}
                  onChange={(e) => handleCustomFieldChange("invoiceDate", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Parent / Customer Name</Label>
              <Input
                value={invoiceData.parentName}
                onChange={(e) => handleCustomFieldChange("parentName", e.target.value)}
                placeholder="e.g. Jane Wanjiru"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={invoiceData.parentEmail}
                  onChange={(e) => handleCustomFieldChange("parentEmail", e.target.value)}
                  placeholder="parent@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={invoiceData.parentPhone}
                  onChange={(e) => handleCustomFieldChange("parentPhone", e.target.value)}
                  placeholder="0712345678"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Student Name</Label>
              <Input
                value={invoiceData.studentName}
                onChange={(e) => handleCustomFieldChange("studentName", e.target.value)}
                placeholder="e.g. Brian Wanjiru"
              />
            </div>

            {source === "custom" && (
              <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                <div>
                  <p className="text-sm font-medium">New parent (spoke on the phone?)</p>
                  <p className="text-xs text-muted-foreground">
                    Create an account for this parent so they show up in Parents, Sessions and Packages.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Student Grade / Level</Label>
                    <Input
                      value={newStudentGrade}
                      onChange={(e) => setNewStudentGrade(e.target.value)}
                      placeholder="e.g. Grade 7"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Curriculum</Label>
                    <Input
                      value={newStudentCurriculum}
                      onChange={(e) => setNewStudentCurriculum(e.target.value)}
                      placeholder="e.g. CBC, British, American"
                    />
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={handleSaveParentToSystem}
                  disabled={savingParent}
                >
                  {savingParent ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <User className="h-4 w-4 mr-2" />
                  )}
                  Add parent to system
                </Button>
              </div>
            )}


            {(source === "custom" || source === "booking") && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Subject / Service</Label>
                  <Input
                    value={invoiceData.subject}
                    onChange={(e) => handleCustomFieldChange("subject", e.target.value)}
                    placeholder="e.g. Mathematics"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Class Type</Label>
                  <Input
                    value={invoiceData.classType}
                    onChange={(e) => handleCustomFieldChange("classType", e.target.value)}
                    placeholder="e.g. In-person, Online"
                  />
                </div>
              </div>
            )}

            {source === "custom" && (
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={invoiceData.description}
                  onChange={(e) => handleCustomFieldChange("description", e.target.value)}
                  placeholder="Brief description of the service being invoiced"
                />
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select
                  value={invoiceData.currency}
                  onValueChange={(value) => handleCustomFieldChange("currency", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KES">KES</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Total Amount</Label>
                <Input
                  type="number"
                  min={0}
                  value={invoiceData.totalAmount}
                  onChange={(e) => handleCustomFieldChange("totalAmount", Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Payment Option</Label>
                <Select
                  value={invoiceData.paymentOption}
                  onValueChange={(value: "full" | "deposit" | "weekly") => handleCustomFieldChange("paymentOption", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Full Payment</SelectItem>
                    <SelectItem value="deposit">30% Deposit</SelectItem>
                    <SelectItem value="weekly">Weekly (paid in advance each week)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {invoiceData.paymentOption === "weekly" && (
              <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                <div>
                  <p className="text-sm font-medium">Weekly payment plan (paid in advance)</p>
                  <p className="text-xs text-muted-foreground">
                    Each week's fee is paid upfront, on or before the first day of that week, to confirm that week's sessions.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Number of weeks</Label>
                    <Input
                      type="number"
                      min={1}
                      value={invoiceData.weeklyWeeks ?? 1}
                      onChange={(e) => handleCustomFieldChange("weeklyWeeks", Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Sessions per week</Label>
                    <Input
                      type="number"
                      min={1}
                      value={invoiceData.weeklySessionsPerWeek ?? 1}
                      onChange={(e) =>
                        handleCustomFieldChange("weeklySessionsPerWeek", Number(e.target.value))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Classes start (Week 1)</Label>
                    <Input
                      type="date"
                      value={invoiceData.weeklyStartDate || ""}
                      onChange={(e) => handleCustomFieldChange("weeklyStartDate", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}


            <div className="space-y-2">
              <Label>Payment Due By (defaults to the day classes start)</Label>
              <Input
                type="date"
                value={invoiceData.dueDate || ""}
                onChange={(e) => handleCustomFieldChange("dueDate", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={invoiceData.notes || ""}
                onChange={(e) => handleCustomFieldChange("notes", e.target.value)}
                placeholder="Any additional notes to appear on the invoice"
              />
            </div>

            <Button
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="w-full"
              size="lg"
            >
              {downloading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Download Invoice PDF
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={handleEmailInvoice}
              disabled={emailing}
              className="w-full"
              size="lg"
            >
              {emailing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Email Invoice to Parent
                </>
              )}
            </Button>

          </CardContent>
        </Card>

        {/* Preview */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Preview</h3>
          <Card className="overflow-hidden">
            <div ref={invoiceRef} className="bg-white text-slate-900">
              <CardHeader className="border-b bg-gradient-to-b from-background to-muted/20 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <img src={lanaLogo} alt="Lana Tutors" className="h-10" />
                    <div className="text-left leading-tight">
                      <p className="text-xs text-muted-foreground">
                        Expert tutoring for CBC, IGCSE, A-Levels & more
                      </p>
                      <p className="text-xs text-muted-foreground">info@lanatutors.africa</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <CardTitle className="text-xl font-bold">Payment Invoice</CardTitle>
                    <CardDescription className="text-xs">
                      Invoice #{invoiceData.invoiceNumber}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3 pt-4 pb-4">

                {/* Billed To */}
                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Billed To
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Parent / Customer:</span>
                      <p className="font-medium">{invoiceData.parentName || "—"}</p>
                    </div>
                    {invoiceData.studentName && (
                      <div>
                        <span className="text-muted-foreground">Student:</span>
                        <p className="font-medium">{invoiceData.studentName}</p>
                      </div>
                    )}
                    {invoiceData.parentEmail && (
                      <div>
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          Email:
                        </span>
                        <p className="font-medium">{invoiceData.parentEmail}</p>
                      </div>
                    )}
                    {invoiceData.parentPhone && (
                      <div>
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          Phone:
                        </span>
                        <p className="font-medium">{invoiceData.parentPhone}</p>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Service Details */}
                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Book className="w-4 h-4" />
                    Service Details
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {invoiceData.tutorName && (
                      <div>
                        <span className="text-muted-foreground">Tutor:</span>
                        <p className="font-medium">{invoiceData.tutorName}</p>
                      </div>
                    )}
                    {invoiceData.subject && (
                      <div>
                        <span className="text-muted-foreground">Subject:</span>
                        <p className="font-medium">{invoiceData.subject}</p>
                      </div>
                    )}
                    {invoiceData.classType && (
                      <div>
                        <span className="text-muted-foreground">Class Type:</span>
                        <p className="font-medium capitalize">{invoiceData.classType}</p>
                      </div>
                    )}
                    {invoiceData.totalSessions && (
                      <div>
                        <span className="text-muted-foreground">Total Sessions:</span>
                        <p className="font-medium">{invoiceData.totalSessions} sessions</p>
                      </div>
                    )}
                    {invoiceData.startTime && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Date & Time:
                        </span>
                        <p className="font-medium">
                          {format(new Date(invoiceData.startTime), "PPP 'at' p")}
                        </p>
                        {invoiceData.endTime && (
                          <p className="text-xs text-muted-foreground">
                            Duration: {Math.round((new Date(invoiceData.endTime).getTime() - new Date(invoiceData.startTime).getTime()) / (1000 * 60))} minutes
                          </p>
                        )}
                      </div>
                    )}
                    {invoiceData.description && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Description:</span>
                        <p className="font-medium">{invoiceData.description}</p>
                      </div>
                    )}
                    {invoiceData.subjects && invoiceData.subjects.length > 0 && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Subjects:</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {invoiceData.subjects.map((subj, idx) => (
                            <span key={idx} className="px-2 py-1 bg-muted rounded text-xs">
                              {subj.subject} ({subj.sessions} sessions)
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {invoiceData.expiresAt && (
                      <div>
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Valid Until:
                        </span>
                        <p className="font-medium">{format(new Date(invoiceData.expiresAt), "PPP")}</p>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Payment Summary */}
                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Payment Summary
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Amount</span>
                      <span className="font-medium">
                        {invoiceData.currency} {invoiceData.totalAmount.toLocaleString()}
                      </span>
                    </div>

                    {invoiceData.paymentOption === "deposit" && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Payment Option</span>
                          <span className="font-medium">30% Deposit</span>
                        </div>
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Deposit (30%)</span>
                          <span className="font-medium">
                            {invoiceData.currency} {Math.round(invoiceData.totalAmount * 0.3).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Balance Due Later</span>
                          <span>
                            {invoiceData.currency} {Math.round(invoiceData.totalAmount * 0.7).toLocaleString()}
                          </span>
                        </div>
                      </>
                    )}

                    {invoiceData.balanceDue && invoiceData.balanceDue > 0 && invoiceData.paymentOption !== "deposit" && (
                      <>
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Already Paid</span>
                          <span className="font-medium">
                            {invoiceData.currency} {invoiceData.amountPaid?.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Remaining Balance</span>
                          <span className="font-medium">
                            {invoiceData.currency} {invoiceData.balanceDue.toLocaleString()}
                          </span>
                        </div>
                      </>
                    )}

                    {invoiceData.paymentOption === "weekly" && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Payment Plan</span>
                        <span className="font-medium">
                          Weekly over {invoiceData.weeklyWeeks || 1} week
                          {(invoiceData.weeklyWeeks || 1) > 1 ? "s" : ""}
                        </span>
                      </div>
                    )}

                    <Separator />

                    <div className="flex justify-between pt-1">
                      <span className="font-semibold text-lg">
                        {invoiceData.paymentOption === "weekly" ? "Week 1 Payment Due Now" : "Amount to Pay Now"}
                      </span>
                      <span className="font-bold text-2xl text-primary">
                        {invoiceData.currency} {Math.round(invoiceData.amountToPay || invoiceData.totalAmount).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {invoiceData.paymentOption === "weekly" && invoiceData.totalAmount > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Weekly Payment Schedule
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Payment is due at the end of each week, after that week's sessions have been
                        delivered
                        {invoiceData.weeklySessionsPerWeek
                          ? ` (${invoiceData.weeklySessionsPerWeek} session${
                              invoiceData.weeklySessionsPerWeek > 1 ? "s" : ""
                            } per week)`
                          : ""}
                        .
                      </p>
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-muted">
                            <tr>
                              <th className="text-left px-2 py-1 font-medium">Week</th>
                              <th className="text-left px-2 py-1 font-medium">Sessions</th>
                              <th className="text-left px-2 py-1 font-medium">Pay by</th>
                              <th className="text-right px-2 py-1 font-medium">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {buildWeeklySchedule(invoiceData).map((row) => (
                              <tr key={row.label} className="border-t">
                                <td className="px-2 py-1 font-medium">{row.label}</td>
                                <td className="px-2 py-1 text-muted-foreground">{row.sessionsWeek}</td>
                                <td className="px-2 py-1 text-muted-foreground">{row.dueDate}</td>
                                <td className="px-2 py-1 text-right font-medium">
                                  {invoiceData.currency} {row.amount.toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                {/* Payment Details */}
                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    How to Pay (M-Pesa)
                  </h3>
                  <div className="border rounded-lg divide-y text-sm">
                    <div className="flex justify-between px-3 py-1.5">
                      <span className="text-muted-foreground">NCBA Paybill</span>
                      <span className="font-bold">880100</span>
                    </div>
                    <div className="flex justify-between px-3 py-1.5">
                      <span className="text-muted-foreground">Account Number</span>
                      <span className="font-bold">1006114657</span>
                    </div>
                    <div className="flex justify-between px-3 py-1.5">
                      <span className="text-muted-foreground">Recipient</span>
                      <span className="font-bold">Lana Bespoke Limited</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Card and mobile money payments can also be made via Pesapal. After paying, send your
                    M-Pesa confirmation to info@lanatutors.africa or WhatsApp +254 117 512316.
                  </p>
                </div>


                {invoiceData.notes && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Notes:</span>
                    <p className="font-medium mt-1">{invoiceData.notes}</p>
                  </div>
                )}

                <div className="text-xs text-muted-foreground text-center pt-2">
                  <p>Invoice Date: {invoiceData.invoiceDate ? format(new Date(invoiceData.invoiceDate), "PPP") : format(new Date(), "PPP")}</p>
                  {invoiceData.dueDate && <p>Due Date: {format(new Date(invoiceData.dueDate), "PPP")}</p>}
                </div>
              </CardContent>
            </div>
          </Card>
        </div>
      </div>

      {/* Saved invoices */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Past invoices
              </CardTitle>
              <CardDescription>
                Every saved, downloaded or emailed invoice. Open one to amend and re-send it.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search name, number, student..."
                value={savedSearch}
                onChange={(e) => setSavedSearch(e.target.value)}
                className="w-56"
              />
              <Button variant="outline" size="sm" onClick={fetchSavedInvoices} disabled={savedLoading}>
                {savedLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {savedInvoices.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No invoices saved yet. Create one above and hit Save invoice.
            </p>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Invoice</th>
                    <th className="text-left px-3 py-2 font-medium">Parent</th>
                    <th className="text-left px-3 py-2 font-medium">Student</th>
                    <th className="text-left px-3 py-2 font-medium">Date</th>
                    <th className="text-right px-3 py-2 font-medium">Amount</th>
                    <th className="text-left px-3 py-2 font-medium">Status</th>
                    <th className="text-right px-3 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {savedInvoices
                    .filter((row) => {
                      const q = savedSearch.trim().toLowerCase();
                      if (!q) return true;
                      return [
                        row.invoice_number,
                        row.parent_name,
                        row.parent_email,
                        row.student_name,
                        row.subject,
                      ]
                        .filter(Boolean)
                        .some((v: string) => v.toLowerCase().includes(q));
                    })
                    .map((row) => (
                      <tr key={row.id} className="border-t">
                        <td className="px-3 py-2 font-medium">{row.invoice_number}</td>
                        <td className="px-3 py-2">{row.parent_name}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row.student_name || "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {row.invoice_date ? format(new Date(row.invoice_date), "d MMM yyyy") : "—"}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {row.currency} {Number(row.total_amount).toLocaleString()}
                        </td>
                        <td className="px-3 py-2">
                          <Select
                            value={row.status}
                            onValueChange={(value) => updateInvoiceStatus(row, value)}
                          >
                            <SelectTrigger className="h-8 w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="draft">Draft</SelectItem>
                              <SelectItem value="sent">Sent</SelectItem>
                              <SelectItem value="paid">Paid</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          <Button size="sm" variant="outline" onClick={() => loadSavedInvoice(row)}>
                            Open
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="ml-2 text-destructive"
                            onClick={() => deleteInvoice(row)}
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

}
