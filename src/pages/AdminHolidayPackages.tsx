import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Package, User, BookOpen, CheckCircle, Clock, AlertCircle } from "lucide-react";

interface PackagePurchase {
  id: string;
  student_id: string;
  total_sessions: number;
  sessions_remaining: number;
  total_amount: number;
  payment_status: string;
  created_at: string;
  metadata: any; // JSON type from Supabase
  profiles?: {
    full_name: string;
    email: string;
  };
}

interface SubjectAllocation {
  id: string;
  package_purchase_id: string;
  subject: string;
  tutor_id: string | null;
  sessions_allocated: number;
  sessions_used: number;
  sessions_remaining: number;
  status: string;
}

interface Tutor {
  id: string;
  user_id: string;
  subjects: string[];
  verified: boolean;
  profiles?: {
    full_name: string;
  };
}

export default function AdminHolidayPackages() {
  const navigate = useNavigate();
  const [packages, setPackages] = useState<PackagePurchase[]>([]);
  const [allocations, setAllocations] = useState<Record<string, SubjectAllocation[]>>({});
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    checkAdminAccess();
    fetchData();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/login');
      return;
    }

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roles) {
      toast.error("Access denied. Admin privileges required.");
      navigate('/');
    }
  };

  const fetchData = async () => {
    try {
      // Fetch holiday packages
      const { data: packagesData, error: packagesError } = await supabase
        .from('package_purchases')
        .select('*')
        .not('metadata', 'is', null)
        .order('created_at', { ascending: false });

      if (packagesError) throw packagesError;

      // Filter packages with holiday metadata and fetch student profiles
      const holidayPackages: PackagePurchase[] = [];
      for (const pkg of packagesData || []) {
        if (pkg.metadata && typeof pkg.metadata === 'object' && 'packageType' in pkg.metadata && pkg.metadata.packageType === 'holiday_revision') {
          // Fetch student profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', pkg.student_id)
            .maybeSingle();

          holidayPackages.push({
            ...pkg,
            profiles: profile ? { full_name: profile.full_name, email: '' } : undefined,
          });
        }
      }

      setPackages(holidayPackages);

      // Fetch allocations for each package
      const allocationsByPackage: Record<string, SubjectAllocation[]> = {};
      for (const pkg of holidayPackages) {
        const { data: allocData } = await supabase
          .from('package_subject_allocations')
          .select('*')
          .eq('package_purchase_id', pkg.id);

        if (allocData) {
          allocationsByPackage[pkg.id] = allocData;
        }
      }
      setAllocations(allocationsByPackage);

      // Fetch verified tutors with their profiles
      const { data: tutorsData, error: tutorsError } = await supabase
        .from('tutor_profiles')
        .select('id, user_id, subjects, verified')
        .eq('verified', true);

      if (tutorsError) throw tutorsError;

      // Fetch profiles for each tutor
      const tutorsWithProfiles: Tutor[] = [];
      for (const tutor of tutorsData || []) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', tutor.user_id)
          .maybeSingle();

        tutorsWithProfiles.push({
          ...tutor,
          profiles: profile ? { full_name: profile.full_name } : undefined,
        });
      }

      setTutors(tutorsWithProfiles);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load packages');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignTutor = async (allocationId: string, tutorId: string) => {
    setAssigning(true);
    try {
      const { error } = await supabase
        .from('package_subject_allocations')
        .update({
          tutor_id: tutorId,
          status: 'assigned',
        })
        .eq('id', allocationId);

      if (error) throw error;

      toast.success('Tutor assigned successfully');
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error assigning tutor:', error);
      toast.error('Failed to assign tutor');
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading packages...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-background pt-20">
        <div className="container mx-auto px-4 py-12 max-w-7xl">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Holiday Package Management</h1>
            <p className="text-muted-foreground">Assign tutors to purchased holiday packages</p>
          </div>

          {/* Stats */}
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <Package className="w-8 h-8 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{packages.length}</p>
                    <p className="text-sm text-muted-foreground">Total Packages</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <Clock className="w-8 h-8 text-yellow-500" />
                  <div>
                    <p className="text-2xl font-bold">
                      {Object.values(allocations).flat().filter(a => a.status === 'pending_assignment').length}
                    </p>
                    <p className="text-sm text-muted-foreground">Pending Assignment</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">
                      {Object.values(allocations).flat().filter(a => a.status === 'assigned').length}
                    </p>
                    <p className="text-sm text-muted-foreground">Assigned</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <User className="w-8 h-8 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{tutors.length}</p>
                    <p className="text-sm text-muted-foreground">Verified Tutors</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Packages List */}
          <div className="space-y-6">
            {packages.map((pkg) => (
              <Card key={pkg.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="w-5 h-5" />
                        {pkg.metadata.curriculum} - {pkg.metadata.candidateLevel}
                      </CardTitle>
                      <CardDescription>
                        Student: {pkg.profiles?.full_name} | Purchased: {new Date(pkg.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <Badge variant={pkg.payment_status === 'completed' ? 'default' : 'secondary'}>
                      {pkg.payment_status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 flex gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Total Amount:</span>{' '}
                      <span className="font-semibold">KES {pkg.total_amount.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total Sessions:</span>{' '}
                      <span className="font-semibold">{pkg.total_sessions}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Remaining:</span>{' '}
                      <span className="font-semibold">{pkg.sessions_remaining}</span>
                    </div>
                  </div>

                  {/* Subject Allocations */}
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      Subject Allocations
                    </h4>
                    {allocations[pkg.id]?.map((allocation) => (
                      <div
                        key={allocation.id}
                        className="flex items-center justify-between p-4 border rounded-lg bg-muted/30"
                      >
                        <div className="flex-1">
                          <div className="font-medium">{allocation.subject}</div>
                          <div className="text-sm text-muted-foreground">
                            {allocation.sessions_allocated} sessions ({allocation.sessions_remaining} remaining)
                          </div>
                        </div>
                        
                        {allocation.status === 'pending_assignment' ? (
                          <div className="flex items-center gap-3">
                            <Select
                              disabled={assigning}
                              onValueChange={(value) => handleAssignTutor(allocation.id, value)}
                            >
                              <SelectTrigger className="w-[250px]">
                                <SelectValue placeholder="Assign tutor..." />
                              </SelectTrigger>
                              <SelectContent>
                                {tutors
                                  .filter(t => t.subjects.includes(allocation.subject))
                                  .map(tutor => (
                                    <SelectItem key={tutor.id} value={tutor.id}>
                                      {tutor.profiles?.full_name || 'Unknown Tutor'}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                            <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Pending
                            </Badge>
                          </div>
                        ) : (
                          <Badge variant="default" className="bg-green-600">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Assigned
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}

            {packages.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Holiday Packages Yet</h3>
                  <p className="text-muted-foreground">
                    Holiday package purchases will appear here for tutor assignment.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
