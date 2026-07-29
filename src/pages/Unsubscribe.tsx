import { useEffect, useState } from "react";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, MailX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Status = "loading" | "confirm" | "done" | "already" | "error";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Unsubscribe = () => {
  const [params] = useSearchParams();
  const initialEmail = (params.get("e") || params.get("email") || "").trim();

  const [email, setEmail] = useState(initialEmail);
  const [status, setStatus] = useState<Status>(initialEmail ? "loading" : "confirm");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!initialEmail) return;
    let active = true;

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke(
          `unsubscribe-email?email=${encodeURIComponent(initialEmail)}`,
          { method: "GET" },
        );
        if (!active) return;
        if (error) throw error;
        setStatus(data?.suppressed ? "already" : "confirm");
      } catch {
        if (active) setStatus("confirm");
      }
    })();

    return () => {
      active = false;
    };
  }, [initialEmail]);

  const handleUnsubscribe = async () => {
    const value = email.trim().toLowerCase();
    if (!EMAIL_RE.test(value)) {
      setMessage("Please enter a valid email address.");
      return;
    }

    setSubmitting(true);
    setMessage("");
    try {
      const { error } = await supabase.functions.invoke("unsubscribe-email", {
        body: { email: value, source: "unsubscribe-page" },
      });
      if (error) throw error;
      setEmail(value);
      setStatus("done");
    } catch (err) {
      console.error(err);
      setStatus("error");
      setMessage("We couldn't process that just now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
      <SEO
        title="Unsubscribe"
        description="Manage your Lana Tutors email preferences."
        canonical="/unsubscribe"
      />

      <Card className="max-w-md w-full">
        <CardHeader className="items-center text-center">
          {status === "done" || status === "already" ? (
            <CheckCircle2 className="w-12 h-12 text-primary mb-2" />
          ) : (
            <MailX className="w-12 h-12 text-primary mb-2" />
          )}
          <CardTitle className="text-2xl">
            {status === "done"
              ? "You've been unsubscribed"
              : status === "already"
                ? "You're already unsubscribed"
                : "Unsubscribe from emails"}
          </CardTitle>
        </CardHeader>

        <CardContent className="text-center space-y-4">
          {status === "loading" && (
            <div className="flex justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {(status === "confirm" || status === "error") && (
            <>
              <p className="text-muted-foreground">
                Confirm the address you'd like removed from the Lana Tutors mailing list.
              </p>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
              {message && <p className="text-sm text-destructive">{message}</p>}
              <Button className="w-full" onClick={handleUnsubscribe} disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Confirm unsubscribe
              </Button>
            </>
          )}

          {(status === "done" || status === "already") && (
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">{email}</span> has been removed
              from the Lana Tutors mailing list. You won't receive further marketing emails
              from us.
            </p>
          )}

          <div className="pt-2">
            <Link to="/" className="text-sm text-primary underline">
              Return to lanatutors.africa
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Unsubscribe;
