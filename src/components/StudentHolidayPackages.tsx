import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Package, BookOpen, User, Calendar, CheckCircle2, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SubjectAllocation {
  id: string;
  subject: string;
  tutor_id: string | null;
  sessions_allocated: number;
  sessions_used: number;
  sessions_remaining: number;
  status: string;
  tutor?: {
    id: string;
    user_id: string;
    profiles?: {
      full_name: string;
    };
  };
}

interface PackagePurchase {
  id: string;
  total_sessions: number;
  sessions_remaining: number;
  total_amount: number;
  payment_status: string;
  created_at: string;
  expires_at: string;
  metadata: any;
  allocations?: SubjectAllocation[];
}

export function StudentHolidayPackages() {
  const navigate = useNavigate();
  const [packages, setPackages] = useState<PackagePurchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Fetch user's holiday packages
      const { data: packagesData, error: packagesError } = await supabase
        .from('package_purchases')
        .select('*')
        .eq('student_id', session.user.id)
        .not('metadata', 'is', null)
        .order('created_at', { ascending: false });

      if (packagesError) throw packagesError;

      // Filter holiday packages and fetch allocations
      const holidayPackages: PackagePurchase[] = [];
      for (const pkg of packagesData || []) {
        if (pkg.metadata && typeof pkg.metadata === 'object' && 'packageType' in pkg.metadata && pkg.metadata.packageType === 'holiday_revision') {
          // Fetch allocations
          const { data: allocData } = await supabase
            .from('package_subject_allocations')
            .select('*')
            .eq('package_purchase_id', pkg.id);

          // For each allocation, fetch tutor details if assigned
          const allocationsWithTutors: SubjectAllocation[] = [];
          for (const alloc of allocData || []) {
            if (alloc.tutor_id) {
              const { data: tutorData } = await supabase
                .from('tutor_profiles')
                .select('id, user_id')
                .eq('id', alloc.tutor_id)
                .maybeSingle();

              if (tutorData) {
                const { data: profileData } = await supabase
                  .from('profiles')
                  .select('full_name')
                  .eq('id', tutorData.user_id)
                  .maybeSingle();

                allocationsWithTutors.push({
                  ...alloc,
                  tutor: {
                    ...tutorData,
                    profiles: profileData ? { full_name: profileData.full_name } : undefined,
                  },
                });
              } else {
                allocationsWithTutors.push(alloc);
              }
            } else {
              allocationsWithTutors.push(alloc);
            }
          }

          holidayPackages.push({
            ...pkg,
            allocations: allocationsWithTutors,
          });
        }
      }

      setPackages(holidayPackages);
    } catch (error) {
      console.error('Error fetching packages:', error);
      toast.error('Failed to load holiday packages');
    } finally {
      setLoading(false);
    }
  };

  const handleBookSession = (allocation: SubjectAllocation) => {
    if (!allocation.tutor_id) {
      toast.info("Tutor not yet assigned. We'll notify you once a tutor is assigned!");
      return;
    }
    // Navigate to booking page with subject and tutor pre-selected
    navigate(`/tutors?subject=${encodeURIComponent(allocation.subject)}`);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading packages...</p>
        </CardContent>
      </Card>
    );
  }

  if (packages.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Holiday Packages Yet</h3>
          <p className="text-muted-foreground mb-4">
            Purchase a December revision package to get started with intensive exam prep.
          </p>
          <Button onClick={() => navigate('/holiday-packages')}>
            View Packages
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {packages.map((pkg) => {
        const metadata = pkg.metadata as any;
        const progressPercent = pkg.total_sessions > 0 
          ? ((pkg.total_sessions - pkg.sessions_remaining) / pkg.total_sessions) * 100 
          : 0;

        return (
          <Card key={pkg.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    {metadata?.curriculum} - {metadata?.candidateLevel}
                  </CardTitle>
                  <CardDescription>
                    Purchased: {new Date(pkg.created_at).toLocaleDateString()} | 
                    Expires: {new Date(pkg.expires_at).toLocaleDateString()}
                  </CardDescription>
                </div>
                <Badge variant={pkg.payment_status === 'completed' ? 'default' : 'secondary'}>
                  {pkg.payment_status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Package Stats */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold">{pkg.total_sessions}</div>
                  <div className="text-sm text-muted-foreground">Total Sessions</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">{pkg.sessions_remaining}</div>
                  <div className="text-sm text-muted-foreground">Remaining</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {pkg.total_sessions - pkg.sessions_remaining}
                  </div>
                  <div className="text-sm text-muted-foreground">Completed</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Overall Progress</span>
                  <span className="font-medium">{progressPercent.toFixed(0)}%</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
              </div>

              {/* Subject Allocations */}
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Your Subjects
                </h4>
                {pkg.allocations?.map((allocation) => (
                  <div
                    key={allocation.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{allocation.subject}</div>
                      {allocation.tutor ? (
                        <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <User className="w-3 h-3" />
                          Tutor: {allocation.tutor.profiles?.full_name || 'Assigned'}
                        </div>
                      ) : (
                        <div className="text-sm text-yellow-600 flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3" />
                          Awaiting tutor assignment
                        </div>
                      )}
                      <div className="text-sm text-muted-foreground mt-1">
                        {allocation.sessions_remaining} of {allocation.sessions_allocated} sessions remaining
                      </div>
                    </div>

                    {allocation.status === 'assigned' ? (
                      <Button
                        size="sm"
                        onClick={() => handleBookSession(allocation)}
                      >
                        <Calendar className="w-4 h-4 mr-2" />
                        Book Session
                      </Button>
                    ) : (
                      <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                        <Clock className="w-3 h-3 mr-1" />
                        Pending
                      </Badge>
                    )}
                  </div>
                ))}
              </div>

              {/* Package Info */}
              <div className="bg-muted/50 p-4 rounded-lg space-y-2 text-sm">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save up to 25% with package rates</span>
                </div>
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Flexible scheduling throughout December & January</span>
                </div>
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Expert tutors from top schools</span>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
