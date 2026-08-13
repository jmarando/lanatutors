import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Send, Eye, Users, PhoneOff, Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

interface CampaignContact {
  phone: string;
  name?: string;
  source?: string;
  components?: any[];
}

export function WhatsAppCampaigns() {
  const [templateName, setTemplateName] = useState("");
  const [languageCode, setLanguageCode] = useState("en_US");
  const [audienceSource, setAudienceSource] = useState<"manual" | "consultations" | "inquiries" | "bookings">("manual");
  const [manualPhones, setManualPhones] = useState("");
  const [audience, setAudience] = useState<CampaignContact[]>([]);
  const [loadingAudience, setLoadingAudience] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [previewing, setPreviewing] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [suppressions, setSuppressions] = useState<string[]>([]);
  const [personalizeGreeting, setPersonalizeGreeting] = useState(false);

  useEffect(() => {
    loadSuppressions();
  }, []);

  const loadSuppressions = async () => {
    const { data } = await supabase.from("whatsapp_suppressions").select("phone_number");
    setSuppressions((data || []).map((s) => s.phone_number));
  };

  const normalizePhone = (phone: string) => {
    let p = phone.replace(/[\s+()-]/g, "");
    if (p.startsWith("0")) p = "254" + p.slice(1);
    if (p.length === 9) p = "254" + p;
    return p;
  };

  const greetingComponents = (name?: string) => {
    const greeting = personalizeGreeting && name ? name : "there";
    return [{ type: "body", parameters: [{ type: "text", text: greeting }] }];
  };

  const buildAudience = async () => {
    setLoadingAudience(true);
    const contacts: CampaignContact[] = [];

    if (audienceSource === "manual") {
      manualPhones
        .split(/[\n,;]/)
        .map((p) => p.trim())
        .filter(Boolean)
        .forEach((phone) => {
          contacts.push({ phone: normalizePhone(phone), source: "manual", components: greetingComponents() });
        });
    } else if (audienceSource === "consultations") {
      const { data } = await supabase
        .from("consultation_bookings")
        .select("phone_number, parent_name")
        .not("phone_number", "is", null);
      (data || []).forEach((b: any) => {
        contacts.push({ phone: normalizePhone(b.phone_number), name: b.parent_name, source: "consultation", components: greetingComponents(b.parent_name) });
      });
    } else if (audienceSource === "inquiries") {
      const { data } = await supabase
        .from("tutor_inquiries")
        .select("parent_phone, parent_name")
        .not("parent_phone", "is", null);
      (data || []).forEach((i: any) => {
        contacts.push({ phone: normalizePhone(i.parent_phone), name: i.parent_name, source: "inquiry", components: greetingComponents(i.parent_name) });
      });
    } else if (audienceSource === "bookings") {
      const { data } = await supabase
        .from("bookings")
        .select("student_profile_id, student_id, students(full_name)")
        .not("student_profile_id", "is", null)
        .limit(500);
      // Need parent phones via students -> profiles
      const studentIds = (data || []).map((b: any) => b.student_profile_id).filter(Boolean);
      if (studentIds.length) {
        const { data: students } = await supabase
          .from("students")
          .select("id, parent_id, full_name, parent:profiles(phone_number)")
          .in("id", studentIds);
        (students || []).forEach((s: any) => {
          if (s.parent?.phone_number) {
            contacts.push({ phone: normalizePhone(s.parent.phone_number), name: s.full_name, source: "booking", components: greetingComponents(s.full_name) });
          }
        });
      }
    }

    // Deduplicate by phone
    const seen = new Set<string>();
    const deduped = contacts.filter((c) => {
      if (seen.has(c.phone)) return false;
      seen.add(c.phone);
      return true;
    });

    setAudience(deduped);
    setLoadingAudience(false);
    setResult(null);
    setPreview(null);
  };

  const activeAudience = useMemo(() => {
    return audience.filter((c) => !suppressions.includes(c.phone));
  }, [audience, suppressions]);

  const handlePreview = async () => {
    if (!templateName || activeAudience.length === 0) {
      toast.error("Choose a template and build an audience first");
      return;
    }
    setPreviewing(true);
    const { data, error } = await supabase.functions.invoke("send-whatsapp-marketing", {
      body: {
        templateName,
        languageCode,
        audience: activeAudience.slice(0, 1),
        preview: true,
      },
    });
    setPreviewing(false);
    if (error) {
      toast.error("Preview failed: " + error.message);
      return;
    }
    setPreview(data);
  };

  const handleSend = async () => {
    if (!templateName || activeAudience.length === 0) {
      toast.error("Choose a template and build an audience first");
      return;
    }
    setSending(true);
    const { data, error } = await supabase.functions.invoke("send-whatsapp-marketing", {
      body: {
        templateName,
        languageCode,
        audience: activeAudience,
      },
    });
    setSending(false);
    if (error) {
      toast.error("Send failed: " + error.message);
      return;
    }
    setResult(data);
    toast.success(`Sent ${data.sent} messages`);
  };

  const addSuppression = async (phone: string) => {
    const { error } = await supabase.from("whatsapp_suppressions").insert({
      phone_number: normalizePhone(phone),
      reason: "manual_opt_out",
      source: "admin_campaign",
    });
    if (error) {
      toast.error("Failed to suppress: " + error.message);
    } else {
      toast.success("Number suppressed");
      loadSuppressions();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">WhatsApp Campaigns</h2>
          <p className="text-muted-foreground">Send approved Meta templates to leads and customers</p>
        </div>
        <Badge variant="outline" className="text-sm">
          <PhoneOff className="h-3 w-3 mr-1" />
          {suppressions.length} opted out
        </Badge>
      </div>

      <Tabs defaultValue="compose" className="w-full">
        <TabsList>
          <TabsTrigger value="compose">Compose</TabsTrigger>
          <TabsTrigger value="suppressions">Opt-outs</TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">1. Template</CardTitle>
              <CardDescription>Use the exact name of an approved Meta WhatsApp template</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="templateName">Template name</Label>
                  <Input
                    id="templateName"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="e.g. holiday_tuition_2026"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="languageCode">Language code</Label>
                  <Input
                    id="languageCode"
                    value={languageCode}
                    onChange={(e) => setLanguageCode(e.target.value)}
                    placeholder="en_US"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">2. Audience</CardTitle>
              <CardDescription>Pick who should receive this campaign</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={audienceSource} onValueChange={(v: any) => setAudienceSource(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual phone list</SelectItem>
                  <SelectItem value="consultations">All consultation bookings</SelectItem>
                  <SelectItem value="inquiries">All tutor inquiries</SelectItem>
                  <SelectItem value="bookings">Booking parents</SelectItem>
                </SelectContent>
              </Select>

              {audienceSource === "manual" && (
                <div className="space-y-2">
                  <Label>Phone numbers</Label>
                  <Textarea
                    value={manualPhones}
                    onChange={(e) => setManualPhones(e.target.value)}
                    placeholder="254712345678&#10;254723456789"
                    rows={5}
                  />
                </div>
              )}

              <Button onClick={buildAudience} disabled={loadingAudience} variant="secondary">
                {loadingAudience ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Users className="h-4 w-4 mr-2" />}
                Build audience
              </Button>

              {audience.length > 0 && (
                <div className="flex flex-wrap gap-2 items-center text-sm">
                  <Badge variant="secondary">{audience.length} total</Badge>
                  <Badge variant="outline" className="text-muted-foreground">
                    {audience.length - activeAudience.length} suppressed
                  </Badge>
                  <Badge variant="default" className="bg-green-600">
                    {activeAudience.length} will receive
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {activeAudience.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">3. Preview & Send</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button onClick={handlePreview} disabled={previewing} variant="outline">
                    {previewing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Eye className="h-4 w-4 mr-2" />}
                    Preview first contact
                  </Button>
                  <Button onClick={handleSend} disabled={sending}>
                    {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                    Send to {activeAudience.length} contacts
                  </Button>
                </div>

                {preview && (
                  <div className="bg-muted p-4 rounded-lg text-sm font-mono overflow-auto">
                    <p className="text-xs text-muted-foreground mb-2">Payload preview</p>
                    <pre className="text-xs">{JSON.stringify(preview.payload, null, 2)}</pre>
                  </div>
                )}

                {result && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <Card className="bg-green-50">
                        <CardContent className="p-3 text-center">
                          <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto mb-1" />
                          <p className="text-xl font-bold text-green-600">{result.sent}</p>
                          <p className="text-xs text-muted-foreground">Sent</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-red-50">
                        <CardContent className="p-3 text-center">
                          <XCircle className="h-5 w-5 text-red-600 mx-auto mb-1" />
                          <p className="text-xl font-bold text-red-600">{result.failed}</p>
                          <p className="text-xs text-muted-foreground">Failed</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-gray-50">
                        <CardContent className="p-3 text-center">
                          <PhoneOff className="h-5 w-5 text-gray-600 mx-auto mb-1" />
                          <p className="text-xl font-bold text-gray-600">{result.suppressed}</p>
                          <p className="text-xs text-muted-foreground">Suppressed</p>
                        </CardContent>
                      </Card>
                    </div>
                    {result.results?.some((r: any) => r.error) && (
                      <div className="bg-red-50 p-3 rounded-lg text-sm">
                        <p className="font-medium flex items-center gap-2"><AlertCircle className="h-4 w-4" /> Errors</p>
                        <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                          {result.results.filter((r: any) => r.error).map((r: any, i: number) => (
                            <li key={i}>{r.phone}: {r.error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="suppressions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Opted-out numbers</CardTitle>
              <CardDescription>These numbers will be skipped in all campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              {suppressions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No opt-outs yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {suppressions.map((phone) => (
                    <Badge key={phone} variant="secondary">{phone}</Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Manual suppress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input id="suppressPhone" placeholder="254712345678" />
              <Button
                onClick={() => {
                  const phone = (document.getElementById("suppressPhone") as HTMLInputElement)?.value;
                  if (phone) addSuppression(phone);
                }}
              >
                Add to opt-out list
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
