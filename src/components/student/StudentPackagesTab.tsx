import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Package, Calendar, Clock, User, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface PackagePurchase {
  id: string;
  tutor_id: string;
  total_sessions: number;
  sessions_remaining: number;
  sessions_used: number;
  total_amount: number;
  amount_paid: number;
  payment_status: string;
  expires_at: string;
  created_at: string;
  metadata: any;
}

interface TutorInfo {
  id: string;
  user_id: string;
  profile_slug: string;
  full_name: string;
}

export const StudentPackagesTab = () => {
  const navigate = useNavigate();
  const [packages, setPackages] = useState<PackagePurchase[]>([]);
  const [tutorInfo, setTutorInfo] = useState<Record<string, TutorInfo>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all package purchases for this student
      const { data: purchasesData, error } = await supabase
        .from("package_purchases")
        .select("*")
        .eq("student_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setPackages(purchasesData || []);

      // Fetch tutor info for all unique tutor IDs
      const tutorIds = [...new Set((purchasesData || []).map(p => p.tutor_id))];
      
      if (tutorIds.length > 0) {
        const { data: tutorsData } = await supabase
          .from("tutor_profiles")
          .select("id, user_id, profile_slug")
          .in("id", tutorIds);

        if (tutorsData) {
          // Fetch profile names for tutors
          const userIds = tutorsData.map(t => t.user_id);
          const { data: profilesData } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", userIds);

          const tutorMap: Record<string, TutorInfo> = {};
          tutorsData.forEach(tutor => {
            const profile = profilesData?.find(p => p.id === tutor.user_id);
            tutorMap[tutor.id] = {
              id: tutor.id,
              user_id: tutor.user_id,
              profile_slug: tutor.profile_slug || tutor.id,
              full_name: profile?.full_name || "Tutor"
            };
          });
          setTutorInfo(tutorMap);
        }
      }
    } catch (error) {
      console.error("Error fetching packages:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (pkg: PackagePurchase) => {
    if (pkg.payment_status !== "completed") {
      return <Badge variant="destructive">Payment Pending</Badge>;
    }
    if (new Date(pkg.expires_at) < new Date()) {
      return <Badge variant="secondary">Expired</Badge>;
    }
    if (pkg.sessions_remaining === 0) {
      return <Badge variant="secondary">Completed</Badge>;
    }
    return <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>;
  };

  const isPackageActive = (pkg: PackagePurchase) => {
    return (
      pkg.payment_status === "completed" &&
      new Date(pkg.expires_at) > new Date() &&
      pkg.sessions_remaining > 0
    );
  };

  const handleBookSession = (tutorId: string) => {
    const tutor = tutorInfo[tutorId];
    if (tutor?.profile_slug) {
      navigate(`/tutors/${tutor.profile_slug}?openBooking=1&bookingType=single`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const activePackages = packages.filter(isPackageActive);
  const inactivePackages = packages.filter(p => !isPackageActive(p));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">My Packages</h2>
        <Button variant="outline" onClick={() => navigate("/tutors")}>
          Browse Tutors
        </Button>
      </div>

      {packages.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Packages Yet</h3>
            <p className="text-muted-foreground mb-4">
              Purchase a session bundle from any tutor to save money on multiple lessons.
            </p>
            <Button onClick={() => navigate("/tutors")}>
              Find a Tutor
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Active Packages */}
          {activePackages.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
                <Package className="w-5 h-5" />
                Active Packages ({activePackages.length})
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                {activePackages.map((pkg) => {
                  const tutor = tutorInfo[pkg.tutor_id];
                  const progressPercent = Math.round(
                    ((pkg.sessions_used || 0) / pkg.total_sessions) * 100
                  );
                  const metadata = pkg.metadata as any;
                  const subjectName = metadata?.subject || "Various Subjects";

                  return (
                    <Card key={pkg.id} className="border-primary/20">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">
                              {pkg.total_sessions} Session Bundle
                            </CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                              {subjectName}
                            </p>
                          </div>
                          {getStatusBadge(pkg)}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center gap-2 text-sm">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{tutor?.full_name || "Tutor"}</span>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Sessions Used</span>
                            <span className="font-semibold">
                              {pkg.sessions_used || 0} of {pkg.total_sessions}
                            </span>
                          </div>
                          <Progress value={progressPercent} className="h-2" />
                          <p className="text-xs text-muted-foreground text-right">
                            {pkg.sessions_remaining} sessions remaining
                          </p>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span>
                            Expires: {format(new Date(pkg.expires_at), "MMM d, yyyy")}
                          </span>
                        </div>

                        <Button 
                          className="w-full mt-2" 
                          onClick={() => handleBookSession(pkg.tutor_id)}
                        >
                          <Calendar className="w-4 h-4 mr-2" />
                          Book a Session
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Inactive/Past Packages */}
          {inactivePackages.length > 0 && (
            <div className="space-y-4 mt-8">
              <h3 className="text-lg font-semibold text-muted-foreground">
                Past & Inactive Packages ({inactivePackages.length})
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                {inactivePackages.map((pkg) => {
                  const tutor = tutorInfo[pkg.tutor_id];
                  const progressPercent = Math.round(
                    ((pkg.sessions_used || 0) / pkg.total_sessions) * 100
                  );
                  const metadata = pkg.metadata as any;
                  const subjectName = metadata?.subject || "Various Subjects";

                  return (
                    <Card key={pkg.id} className="opacity-70">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">
                              {pkg.total_sessions} Session Bundle
                            </CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                              {subjectName}
                            </p>
                          </div>
                          {getStatusBadge(pkg)}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center gap-2 text-sm">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span>{tutor?.full_name || "Tutor"}</span>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Sessions Used</span>
                            <span>
                              {pkg.sessions_used || 0} of {pkg.total_sessions}
                            </span>
                          </div>
                          <Progress value={progressPercent} className="h-2" />
                        </div>

                        {pkg.payment_status !== "completed" && (
                          <Button 
                            variant="outline" 
                            className="w-full"
                            onClick={() => navigate(`/pay-balance?packageId=${pkg.id}`)}
                          >
                            Complete Payment
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
