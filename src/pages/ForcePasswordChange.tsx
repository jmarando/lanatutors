import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";

const ForcePasswordChange = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const validatePassword = (pwd: string) => {
    // Min 8 chars, at least 1 lowercase, 1 uppercase, 1 number, 1 special
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;
    return regex.test(pwd);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    if (!validatePassword(password)) {
      toast({ title: "Weak password", description: "Use 8+ chars with upper, lower, number, and symbol.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      // Clear the must_reset_password flag
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes.user?.id;
      if (userId) {
        const { error: profileErr } = await supabase
          .from("profiles")
          .update({ must_reset_password: false })
          .eq("id", userId);
        if (profileErr) throw profileErr;
      }

      // Route based on role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId as string)
        .maybeSingle();

      toast({ title: "Password updated", description: "You're all set." });

      if (roleData?.role === "tutor") navigate("/tutor/dashboard");
      else if (roleData?.role === "student") navigate("/student/dashboard");
      else if (roleData?.role === "admin") navigate("/admin");
      else navigate("/");
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-[image:var(--gradient-page)]">
      <Helmet>
        <title>Force Password Change | Secure Account</title>
        <meta name="description" content="Set a new secure password to continue to your dashboard." />
        <link rel="canonical" href={`${window.location.origin}/force-password-change`} />
      </Helmet>
      <div className="max-w-lg mx-auto px-6 py-16">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Set a new password</CardTitle>
            <CardDescription>For security, you must change your password before continuing.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter a strong password"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm new password</Label>
                <Input
                  id="confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  required
                />
              </div>
              <div className="flex items-center gap-3">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Updating..." : "Update password"}
                </Button>
                <Button type="button" variant="outline" onClick={handleSignOut}>Not you? Sign out</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForcePasswordChange;
