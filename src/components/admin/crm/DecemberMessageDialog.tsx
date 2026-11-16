import { toast } from "sonner";
import { Copy, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { waMessageLink } from "@/utils/decemberDesk";

interface DecemberMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  text: string;
  phone: string | null;
}

/** A message for the team to send. Nothing here is sent by the system: copy it, or open it in WhatsApp. */
export function DecemberMessageDialog({ open, onOpenChange, title, text, phone }: DecemberMessageDialogProps) {
  const link = waMessageLink(phone, text);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied");
    } catch {
      toast.error("Could not copy. Select the text and copy it by hand");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            The system sends nothing to the family. Copy this, or open it in WhatsApp, and send it from the admin inbox.
          </DialogDescription>
        </DialogHeader>
        <Textarea readOnly rows={14} value={text} aria-label="Message" className="text-sm" />
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
          <Button variant="outline" onClick={copy}>
            <Copy className="h-4 w-4" />
            Copy
          </Button>
          {link ? (
            <Button asChild>
              <a href={link} target="_blank" rel="noreferrer">
                <MessageCircle className="h-4 w-4" />
                Open in WhatsApp
              </a>
            </Button>
          ) : (
            <Button disabled>No phone number</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
