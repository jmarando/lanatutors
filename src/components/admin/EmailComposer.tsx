import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Eye, Send, Loader2, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
}

const emailTemplates: EmailTemplate[] = [
  {
    id: "bootcamp-recovery",
    name: "Bootcamp Payment Recovery",
    subject: "Complete Your December Holiday Bootcamp Enrollment - Lana Tutors",
    body: `Dear {parent_name},

We noticed that you tried to enroll for the December Holiday Bootcamp on Lana Tutors for {subjects} but the payment didn't complete successfully.

No worries! Please use the link below to complete your payment:

{payment_link}

Once you complete the payment, you'll receive an email with:
✅ Class schedule and meeting links
✅ Your tutor's details
✅ Session topics for the 2-week program

Program Details:
📅 December 8-19, 2025
⏰ Daily sessions (Mon-Fri)
👨‍🏫 Expert tutors assigned to each class

If you have any questions, please reply to this email or call us.

Best regards,
Patience
Lana Tutors Team

---
Lana Tutors | Expert Online Tutoring
🌐 https://lanatutors.africa
📧 info@lanatutors.africa`
  },
  {
    id: "bootcamp-followup",
    name: "Bootcamp Follow-up (No Action)",
    subject: "December Holiday Bootcamp Starts Soon! - Lana Tutors",
    body: `Dear {parent_name},

The December Holiday Bootcamp is just around the corner, and we'd love to have {student_name} join us!

We have classes available for {curriculum} {grade_level} students in:
• Mathematics
• English
• Sciences (Physics, Chemistry, Biology)
• Kiswahili

What's Included:
✅ 10 sessions per subject over 2 weeks
✅ Small class sizes (max 15 students)
✅ Expert tutors from Kenya's top schools
✅ Interactive online sessions via Google Meet

Pricing:
• CBC/8-4-4: KES 400 per session (KES 4,000 per subject)
• IGCSE: KES 500 per session (KES 5,000 per subject)
• A-Level/IB: KES 600 per session (KES 6,000 per subject)

👉 Enroll now: https://lanatutors.africa/december-intensive

Program runs December 8-19, 2025. Don't miss out!

Best regards,
Patience
Lana Tutors Team

---
Lana Tutors | Expert Online Tutoring
🌐 https://lanatutors.africa
📧 info@lanatutors.africa`
  },
  {
    id: "balance-reminder",
    name: "Balance Payment Reminder",
    subject: "Complete Your Balance Payment - Lana Tutors",
    body: `Dear {parent_name},

Thank you for your deposit payment for the December Holiday Bootcamp!

This is a friendly reminder that your balance of KES {balance_amount} is due before the program starts on December 8th.

Please use the link below to complete your payment:

{payment_link}

Your enrolled classes:
{subjects}

If you have any questions about the payment, please don't hesitate to reach out.

Best regards,
Patience
Lana Tutors Team

---
Lana Tutors | Expert Online Tutoring
🌐 https://lanatutors.africa
📧 info@lanatutors.africa`
  },
  {
    id: "custom",
    name: "Custom Email",
    subject: "",
    body: ""
  }
];

interface EmailComposerProps {
  defaultTo?: string;
  defaultSubject?: string;
  defaultBody?: string;
  defaultParentName?: string;
  defaultStudentName?: string;
  defaultPaymentLink?: string;
}

export function EmailComposer({
  defaultTo = "",
  defaultSubject = "",
  defaultBody = "",
  defaultParentName = "",
  defaultStudentName = "",
  defaultPaymentLink = ""
}: EmailComposerProps) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  const [to, setTo] = useState(defaultTo);
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [selectedTemplate, setSelectedTemplate] = useState("");

  const applyTemplate = (templateId: string) => {
    const template = emailTemplates.find(t => t.id === templateId);
    if (template) {
      let newSubject = template.subject;
      let newBody = template.body;
      
      // Replace placeholders with defaults if available
      if (defaultParentName) {
        newBody = newBody.replace(/{parent_name}/g, defaultParentName);
      }
      if (defaultStudentName) {
        newBody = newBody.replace(/{student_name}/g, defaultStudentName);
      }
      if (defaultPaymentLink) {
        newBody = newBody.replace(/{payment_link}/g, defaultPaymentLink);
      }
      
      setSubject(newSubject);
      setBody(newBody);
    }
    setSelectedTemplate(templateId);
  };

  const generateHtmlEmail = () => {
    const formattedBody = body.replace(/\n/g, '<br>');
    
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 24px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Lana Tutors</h1>
              <p style="color: #a3c9e8; margin: 8px 0 0 0; font-size: 14px;">Expert Online Tutoring</p>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 32px 24px;">
              <div style="color: #333333; font-size: 15px; line-height: 1.6;">
                ${formattedBody}
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px 24px; border-top: 1px solid #e9ecef;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="color: #6c757d; font-size: 12px;">
                    <p style="margin: 0 0 8px 0;"><strong>Lana Tutors</strong></p>
                    <p style="margin: 0 0 4px 0;">📧 info@lanatutors.africa</p>
                    <p style="margin: 0 0 4px 0;">🌐 <a href="https://lanatutors.africa" style="color: #2d5a87;">lanatutors.africa</a></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  };

  const handleSend = async () => {
    if (!to || !subject || !body) {
      toast.error("Please fill in all fields");
      return;
    }

    setSending(true);
    try {
      const html = generateHtmlEmail();
      
      const response = await supabase.functions.invoke('send-admin-email', {
        body: {
          to,
          subject,
          html,
          replyTo: 'info@lanatutors.africa'
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to send email');
      }

      toast.success(`Email sent to ${to}`);
      setOpen(false);
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast.error(`Failed to send: ${error.message}`);
    } finally {
      setSending(false);
    }
  };

  const copyHtml = async () => {
    await navigator.clipboard.writeText(generateHtmlEmail());
    toast.success("HTML copied to clipboard");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Mail className="h-4 w-4 mr-2" />
          Compose Email
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Compose Email (from info@lanatutors.africa)</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          {/* Editor Side */}
          <div className="space-y-4">
            <div>
              <Label>Template</Label>
              <Select value={selectedTemplate} onValueChange={applyTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a template..." />
                </SelectTrigger>
                <SelectContent>
                  {emailTemplates.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>To</Label>
              <Input 
                value={to} 
                onChange={(e) => setTo(e.target.value)}
                placeholder="recipient@example.com"
              />
            </div>

            <div>
              <Label>Subject</Label>
              <Input 
                value={subject} 
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject..."
              />
            </div>

            <div>
              <Label>Body (use placeholders: {'{parent_name}'}, {'{student_name}'}, {'{payment_link}'}, etc.)</Label>
              <Textarea 
                value={body} 
                onChange={(e) => setBody(e.target.value)}
                placeholder="Email body..."
                rows={15}
                className="font-mono text-sm"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSend} disabled={sending}>
                {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                Send Email
              </Button>
              <Button variant="outline" onClick={() => setShowPreview(!showPreview)}>
                <Eye className="h-4 w-4 mr-2" />
                {showPreview ? 'Hide' : 'Show'} Preview
              </Button>
              <Button variant="ghost" onClick={copyHtml}>
                <Copy className="h-4 w-4 mr-2" />
                Copy HTML
              </Button>
            </div>
          </div>

          {/* Preview Side */}
          <div className="border rounded-lg overflow-hidden bg-muted/30">
            <div className="bg-muted px-3 py-2 text-sm font-medium border-b">
              Email Preview
            </div>
            <div className="p-2">
              <iframe
                srcDoc={generateHtmlEmail()}
                className="w-full h-[500px] border-0 bg-white rounded"
                title="Email Preview"
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Quick compose for specific recovery scenarios
interface QuickEmailProps {
  type: 'desterio' | 'isaac' | 'nancy' | 'abdulhafit';
}

export function QuickRecoveryEmail({ type }: QuickEmailProps) {
  const configs = {
    desterio: {
      to: "desterionambwaya@gmail.com",
      parentName: "Desterio",
      subject: "Complete Your December Holiday Bootcamp Enrollment - Lana Tutors",
      paymentLink: "https://pay.pesapal.com/iframe/PesapalIframe3/Index?OrderTrackingId=9fee8f0a-bf30-4354-bbef-db00ec5f9571",
      body: `Dear Desterio,

We noticed that you tried to enroll for the December Holiday Bootcamp on Lana Tutors for English (CBC Grade 8) but the payment didn't complete successfully.

No worries! Please use the link below to complete your payment:

https://pay.pesapal.com/iframe/PesapalIframe3/Index?OrderTrackingId=9fee8f0a-bf30-4354-bbef-db00ec5f9571

Once you complete the payment, you'll receive an email with the class meeting link.

Class Details:
📚 Subject: English
📅 Starts: Tomorrow (December 8th)
⏰ Time: 11:00 AM - 12:15 PM (daily for 2 weeks)
👨‍🏫 Tutor: Emily Magoma

Thanks,
Patience
Lana Tutors Team`
    },
    isaac: {
      to: "isaaceziron@gmail.com",
      parentName: "Isaac Hezron",
      subject: "Complete Your December Holiday Bootcamp Enrollment - Lana Tutors",
      paymentLink: "",
      body: `Dear Isaac,

We noticed that you tried to enroll for the December Holiday Bootcamp on Lana Tutors for Biology, English, and Kiswahili (8-4-4 Form 3) but the payment didn't complete.

Please use the link below to complete your enrollment:

{payment_link}

Once you complete the payment, you'll receive meeting links for all your classes.

Your Classes:
📚 Biology (1:00-2:15 PM) - Tutor: Samuel Ochieng Auma
📚 English (2:30-3:45 PM) - Tutor: Edrick Musimbi  
📚 Kiswahili (4:00-5:15 PM) - Tutor: Evans Simiyu Wanjala

📅 Program: December 8-19, 2025
💰 Total: KES 12,000

Thanks,
Patience
Lana Tutors Team`
    },
    abdulhafit: {
      to: "abdulhafitfarah@gmail.com",
      parentName: "Abdulhafit",
      subject: "Complete Your Balance Payment - December Holiday Bootcamp",
      paymentLink: "",
      body: `Dear Abdulhafit,

Thank you for your deposit payment of KES 3,600 for the December Holiday Bootcamp!

This is a friendly reminder that your balance of KES 8,400 is due before the program starts on December 8th.

Please use the link below to complete your balance payment:

{payment_link}

Your Enrolled Classes (A-Level Year 12):
📚 Pure Mathematics (8:00-9:15 AM) - Tutor: Calvins Onuko
📚 Biology (1:00-2:15 PM) - Tutor: Muna Mbai

Meeting links will be shared once the balance is cleared.

Thanks,
Patience
Lana Tutors Team`
    },
    nancy: {
      to: "nancykavingo@gmail.com",
      parentName: "Nancy",
      subject: "December Holiday Bootcamp - Perfect for James & Sarah! | Lana Tutors",
      paymentLink: "",
      body: `Dear Nancy,

The December Holiday Bootcamp starts this Monday, and we'd love to have James and Sarah join us!

We have perfect classes for your children:

For James (CBC Grade 8):
• Mathematics, English, Sciences, Kiswahili
• KES 400 per session (KES 4,000 per subject)

For Sarah (CBC Grade 6):
Note: Our bootcamp focuses on Grade 7-9 for CBC. If you'd like 1-on-1 tutoring for Sarah, we can arrange that separately.

What's Included:
✅ 10 sessions per subject over 2 weeks
✅ Small class sizes (max 15 students)
✅ Expert tutors from Kenya's top schools
✅ Daily interactive sessions via Google Meet

👉 Enroll James now: https://lanatutors.africa/december-intensive

Program runs December 8-19, 2025.

For 1-on-1 tutoring for Sarah or any questions, just reply to this email!

Best regards,
Patience
Lana Tutors Team`
    }
  };

  const config = configs[type];
  
  return (
    <EmailComposer
      defaultTo={config.to}
      defaultSubject={config.subject}
      defaultBody={config.body}
      defaultParentName={config.parentName}
      defaultPaymentLink={config.paymentLink}
    />
  );
}
