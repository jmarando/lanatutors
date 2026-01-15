import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Search, FileText, Copy, Check, ExternalLink, RefreshCw, Mail, Eye } from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";

interface LearningPlan {
  id: string;
  title: string;
  total_sessions: number;
  total_price: number;
  status: string | null;
  created_at: string | null;
  expires_at: string | null;
  share_token: string | null;
  notes: string | null;
  subjects: any;
  validity_days: number | null;
  discount_applied: number | null;
  tutor_profiles?: {
    user_id: string;
  };
  profiles?: {
    full_name: string;
  };
}

export const AdminLearningPlansList = () => {
  const [plans, setPlans] = useState<LearningPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<LearningPlan | null>(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("learning_plans")
        .select(`
          *,
          tutor_profiles!inner(user_id),
          profiles:tutor_profiles(user_id)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch tutor names separately
      if (data && data.length > 0) {
        const userIds = data.map(p => p.tutor_profiles?.user_id).filter(Boolean);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);
        
        setPlans(data.map(plan => ({
          ...plan,
          subjects: Array.isArray(plan.subjects) ? plan.subjects : [],
          profiles: {
            full_name: profileMap.get(plan.tutor_profiles?.user_id) || "Unknown"
          }
        })));
      } else {
        setPlans([]);
      }
    } catch (error: any) {
      console.error("Error fetching plans:", error);
      toast.error("Failed to load learning plans");
    } finally {
      setLoading(false);
    }
  };

  const copyShareLink = async (plan: LearningPlan) => {
    if (!plan.share_token) {
      toast.error("Share link not available for this plan");
      return;
    }

    const shareUrl = `https://lanatutors.africa/learning-plan/${plan.id}?token=${plan.share_token}`;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedId(plan.id);
      toast.success("Share link copied to clipboard!");
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      // Fallback
      const textArea = document.createElement("textarea");
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopiedId(plan.id);
      toast.success("Share link copied!");
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const statusOptions = [
    { value: "proposed", label: "Proposed", color: "bg-blue-500" },
    { value: "sent", label: "Sent", color: "bg-indigo-500" },
    { value: "viewed", label: "Viewed", color: "bg-purple-500" },
    { value: "accepted", label: "Accepted", color: "bg-green-500" },
    { value: "paid", label: "Paid", color: "bg-emerald-600" },
    { value: "declined", label: "Declined", color: "bg-red-500" },
    { value: "expired", label: "Expired", color: "bg-gray-500" },
  ];

  const getStatusBadge = (status: string) => {
    const option = statusOptions.find(o => o.value === status);
    if (option) {
      return <Badge className={option.color}>{option.label}</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  const updatePlanStatus = async (planId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("learning_plans")
        .update({ status: newStatus })
        .eq("id", planId);

      if (error) throw error;

      setPlans(plans.map(p => p.id === planId ? { ...p, status: newStatus } : p));
      toast.success(`Status updated to ${statusOptions.find(o => o.value === newStatus)?.label}`);
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const extractParentInfo = (notes: string | null) => {
    if (!notes) return { parentName: "Unknown", parentEmail: "Unknown", studentName: "Unknown" };
    
    // Try to extract student name from title
    const studentMatch = notes.match(/Dear ([^,]+),/);
    const parentName = studentMatch ? studentMatch[1] : "Unknown";
    
    return { parentName };
  };

  const filteredPlans = plans.filter(plan => {
    const matchesSearch = 
      plan.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plan.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || plan.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: plans.length,
    proposed: plans.filter(p => p.status === "proposed").length,
    accepted: plans.filter(p => p.status === "accepted").length,
    declined: plans.filter(p => p.status === "declined").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-2xl font-bold">Sent Learning Plans</h2>
          <p className="text-muted-foreground">Track and manage all learning plans sent to parents</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Sent</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Pending Response</p>
            <p className="text-2xl font-bold text-blue-600">{stats.proposed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Accepted</p>
            <p className="text-2xl font-bold text-green-600">{stats.accepted}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Declined</p>
            <p className="text-2xl font-bold text-red-600">{stats.declined}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title or student name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {statusOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchPlans}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Plans Table */}
      <Card>
        <CardContent className="p-0">
          {filteredPlans.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No learning plans found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan Title</TableHead>
                  <TableHead>Tutor</TableHead>
                  <TableHead>Sessions</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{plan.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {plan.subjects?.length || 0} subjects
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{plan.profiles?.full_name || "Team"}</TableCell>
                    <TableCell>{plan.total_sessions}</TableCell>
                    <TableCell>KES {plan.total_price?.toLocaleString()}</TableCell>
                    <TableCell>
                      <Select 
                        value={plan.status || "proposed"} 
                        onValueChange={(value) => updatePlanStatus(plan.id, value)}
                      >
                        <SelectTrigger className="w-[130px] h-8">
                          <SelectValue>
                            {getStatusBadge(plan.status || "proposed")}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>
                              <Badge className={opt.color}>{opt.label}</Badge>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{format(new Date(plan.created_at), "MMM d, yyyy")}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(plan.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyShareLink(plan)}
                          disabled={!plan.share_token}
                          title="Copy share link"
                        >
                          {copiedId === plan.id ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(`/learning-plan/${plan.id}?token=${plan.share_token}`, '_blank')}
                          disabled={!plan.share_token}
                          title="View plan"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setSelectedPlan(plan)}
                              title="View details"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>{plan.title}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                                  {getStatusBadge(plan.status || "proposed")}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-muted-foreground">Created</p>
                                  <p className="text-sm">{format(new Date(plan.created_at), "PPP 'at' p")}</p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-muted-foreground">Total Sessions</p>
                                  <p className="text-sm font-semibold">{plan.total_sessions}</p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
                                  <p className="text-sm font-semibold">KES {plan.total_price?.toLocaleString()}</p>
                                </div>
                              </div>

                              {plan.subjects && plan.subjects.length > 0 && (
                                <div>
                                  <p className="text-sm font-medium text-muted-foreground mb-2">Subjects</p>
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Subject</TableHead>
                                        <TableHead>Tutor</TableHead>
                                        <TableHead>Sessions</TableHead>
                                        <TableHead>Rate</TableHead>
                                        <TableHead>Total</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {plan.subjects.map((s: any, i: number) => (
                                        <TableRow key={i}>
                                          <TableCell>{s.name}</TableCell>
                                          <TableCell>{s.tutorName || "TBD"}</TableCell>
                                          <TableCell>{s.sessions}</TableCell>
                                          <TableCell>KES {s.rate?.toLocaleString()}</TableCell>
                                          <TableCell>KES {s.total?.toLocaleString()}</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              )}

                              {plan.share_token && (
                                <div className="p-4 bg-muted rounded-lg">
                                  <p className="text-sm font-medium mb-2">Share Link</p>
                                  <div className="flex items-center gap-2">
                                    <code className="flex-1 p-2 bg-background rounded text-xs break-all">
                                      https://lanatutors.africa/learning-plan/{plan.id}?token={plan.share_token}
                                    </code>
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      onClick={() => copyShareLink(plan)}
                                    >
                                      {copiedId === plan.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    </Button>
                                  </div>
                                </div>
                              )}

                              {plan.notes && (
                                <div>
                                  <p className="text-sm font-medium text-muted-foreground mb-2">Notes / Message</p>
                                  <pre className="text-xs whitespace-pre-wrap p-4 bg-muted rounded-lg max-h-60 overflow-y-auto">
                                    {plan.notes}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
