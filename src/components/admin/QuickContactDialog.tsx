import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Send, MessageCircle } from "lucide-react";

interface QuickContactDialogProps {
  type: 'email' | 'whatsapp' | null;
  onClose: () => void;
  recipient: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
}

export function QuickContactDialog({ type, onClose, recipient }: QuickContactDialogProps) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const logCommunication = async (channel: string, subject: string, content: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.from("communication_logs").insert({
        parent_id: recipient.id,
        channel,
        direction: "outbound",
        subject,
        content,
        status: "sent",
        sent_by: user?.id,
      });
    } catch (error) {
      console.error("Error logging communication:", error);
    }
  };

  const handleSendEmail = async () => {
    if (!subject.trim() || !message.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase.functions.invoke('send-admin-email', {
        body: {
          to: [recipient.email],
          subject,
          message,
        },
      });

      if (error) throw error;

      await logCommunication("email", subject, message);
      
      toast.success("Email sent successfully");
      handleClose();
    } catch (error: any) {
      console.error("Error sending email:", error);
      toast.error("Failed to send email");
    } finally {
      setSending(false);
    }
  };

  const handleLogWhatsApp = async () => {
    if (!message.trim()) {
      toast.error("Please enter the message you sent");
      return;
    }

    setSending(true);
    try {
      await logCommunication("whatsapp", "", message);
      toast.success("WhatsApp message logged");
      handleClose();
    } catch (error: any) {
      console.error("Error logging WhatsApp:", error);
      toast.error("Failed to log message");
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setSubject("");
    setMessage("");
    onClose();
  };

  if (!type) return null;

  return (
    <Dialog open={!!type} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {type === 'email' ? 'Send Email' : 'Log WhatsApp Message'}
          </DialogTitle>
          <DialogDescription>
            {type === 'email' 
              ? `Send an email to ${recipient.name} (${recipient.email})`
              : `Log the WhatsApp message you sent to ${recipient.name}`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {type === 'email' && (
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="Email subject..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="message">
              {type === 'email' ? 'Message' : 'Message Sent'}
            </Label>
            <Textarea
              id="message"
              placeholder={type === 'email' 
                ? "Write your email message..." 
                : "Paste or type the message you sent via WhatsApp..."
              }
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          {type === 'email' ? (
            <Button onClick={handleSendEmail} disabled={sending}>
              <Send className="h-4 w-4 mr-2" />
              {sending ? 'Sending...' : 'Send Email'}
            </Button>
          ) : (
            <Button onClick={handleLogWhatsApp} disabled={sending}>
              <MessageCircle className="h-4 w-4 mr-2" />
              {sending ? 'Logging...' : 'Log Message'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
