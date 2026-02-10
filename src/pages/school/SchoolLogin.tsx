import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSchool } from "@/hooks/useSchool";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import kirawaLogo from "@/assets/kirawa-logo.png";
import { GraduationCap, Users, BookOpen } from "lucide-react";

const SchoolLogin: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { school, loading: schoolLoading } = useSchool(slug);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    // Determine role from school_members
    const { data: member } = await (supabase as any).from("school_members").select("role")
      .eq("school_id", school?.id).eq("user_id", data.user.id).single();

    setLoading(false);
    if (!member) {
      toast({ title: "Access denied", description: "You are not a member of this school.", variant: "destructive" });
      await supabase.auth.signOut();
      return;
    }

    navigate(`/school/${slug}/${member.role}`);
  };

  if (schoolLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-800"></div>
    </div>
  );

  if (!school) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">School not found</p>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: `linear-gradient(135deg, ${school.primary_color}15 0%, ${school.secondary_color}15 100%)` }}>
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center pb-2">
          <img src={kirawaLogo} alt={school.name} className="h-24 w-24 mx-auto mb-4 object-contain" />
          <CardTitle className="text-2xl" style={{ color: school.primary_color }}>{school.name}</CardTitle>
          <CardDescription>{school.tagline || "School Portal"}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <Input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} required />
            <Input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
            <Button type="submit" className="w-full text-white" disabled={loading} style={{ backgroundColor: school.primary_color }}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t">
            <p className="text-xs text-center text-muted-foreground mb-3">Demo Accounts</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { role: "Admin", icon: Users, email: "admin@kirawa.demo" },
                { role: "Teacher", icon: BookOpen, email: "teacher@kirawa.demo" },
                { role: "Parent", icon: GraduationCap, email: "parent@kirawa.demo" },
              ].map(d => (
                <button key={d.role} onClick={() => { setEmail(d.email); setPassword("demo1234"); }}
                  className="flex flex-col items-center gap-1 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-xs">
                  <d.icon className="h-5 w-5" style={{ color: school.primary_color }} />
                  <span className="font-medium">{d.role}</span>
                </button>
              ))}
            </div>
          </div>

          <p className="text-[10px] text-center text-muted-foreground mt-4">
            Powered by <span className="font-semibold">Lana for Schools</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SchoolLogin;
