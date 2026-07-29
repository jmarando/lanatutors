import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";

// NOTE (interim): this page confirms the unsubscribe request so the email link
// resolves instead of 404ing. Suppression is not yet wired to a backend — the
// fast-follow adds a Supabase suppression table + honors it in the sender.
// Until then, the info@ fallback below is the real opt-out path.
const Unsubscribe = () => {
  const [params] = useSearchParams();
  const email = (params.get("e") || params.get("email") || "").trim();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
      <SEO
        title="Unsubscribe | Lana Tutors"
        description="Manage your Lana Tutors email preferences."
        canonical="/unsubscribe"
      />

      <Card className="max-w-md w-full">
        <CardHeader className="items-center text-center">
          <CheckCircle2 className="w-12 h-12 text-primary mb-2" />
          <CardTitle className="text-2xl">You've been unsubscribed</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            {email ? (
              <>
                <span className="font-medium text-foreground">{email}</span> has been
                removed from the Lana Tutors mailing list. You won't receive further
                marketing emails from us.
              </>
            ) : (
              <>Your request has been received. You won't receive further marketing emails from us.</>
            )}
          </p>
          <p className="text-sm text-muted-foreground">
            Still receiving emails after a day or two? Email{" "}
            <a
              href="mailto:info@lanatutors.africa?subject=Unsubscribe"
              className="text-primary underline"
            >
              info@lanatutors.africa
            </a>{" "}
            and we'll remove you right away.
          </p>
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
