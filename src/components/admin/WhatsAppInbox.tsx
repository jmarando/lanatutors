import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, RefreshCw, Search, AlertCircle, CheckCircle2, Send, Hand, Bot } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface Conversation {
  phone_number: string;
  profile_name: string | null;
  messages: any;
  last_message_at: string;
  escalated: boolean;
  escalated_at: string | null;
}

export function WhatsAppInbox() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active, setActive] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("whatsapp_conversations")
      .select("*")
      .order("last_message_at", { ascending: false })
      .limit(200);
    if (error) {
      toast.error("Failed to load conversations");
      console.error(error);
    } else {
      const list = (data as Conversation[]) || [];
      setConversations(list);
      if (list.length && !active) setActive(list[0]);
      else if (active) {
        const refreshed = list.find(c => c.phone_number === active.phone_number);
        if (refreshed) setActive(refreshed);
      }
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Poll every 10s so new inbound messages show up
  useEffect(() => {
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.phone_number]);

  const setEscalated = async (phone: string, escalated: boolean) => {
    const { error } = await supabase
      .from("whatsapp_conversations")
      .update({ escalated, escalated_at: escalated ? new Date().toISOString() : null })
      .eq("phone_number", phone);
    if (error) {
      toast.error("Failed to update");
    } else {
      toast.success(escalated ? "Auto-replies paused — you're handling this chat" : "Lana will reply again");
      load();
    }
  };

  const sendHuman = async () => {
    if (!active || !draft.trim()) return;
    setSending(true);
    const { error } = await supabase.functions.invoke("whatsapp-send", {
      body: { phone: active.phone_number, text: draft.trim(), pauseAi: true },
    });
    setSending(false);
    if (error) {
      toast.error("Failed to send: " + error.message);
      return;
    }
    setDraft("");
    toast.success("Message sent");
    load();
  };

  const filtered = conversations.filter(c => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (c.profile_name?.toLowerCase().includes(q)) || c.phone_number.includes(q);
  });

  const messages = Array.isArray(active?.messages) ? active!.messages : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <MessageCircle className="h-6 w-6 text-green-600" /> WhatsApp Inbox
          </h2>
          <p className="text-sm text-muted-foreground">All conversations Lana is handling on WhatsApp.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[70vh]">
        {/* List */}
        <Card className="md:col-span-1 overflow-hidden flex flex-col">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name or phone"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            {filtered.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground text-center">No conversations yet.</p>
            ) : filtered.map(c => (
              <button
                key={c.phone_number}
                onClick={() => setActive(c)}
                className={`w-full text-left p-3 border-b hover:bg-muted/50 transition ${active?.phone_number === c.phone_number ? "bg-muted" : ""}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium truncate">{c.profile_name || c.phone_number}</span>
                  {c.escalated && <Badge variant="destructive" className="text-[10px]">Escalated</Badge>}
                </div>
                <div className="text-xs text-muted-foreground flex justify-between mt-0.5">
                  <span className="truncate">+{c.phone_number}</span>
                  <span>{formatDistanceToNow(new Date(c.last_message_at), { addSuffix: true })}</span>
                </div>
              </button>
            ))}
          </ScrollArea>
        </Card>

        {/* Thread */}
        <Card className="md:col-span-2 overflow-hidden flex flex-col">
          {!active ? (
            <CardContent className="flex-1 flex items-center justify-center text-muted-foreground">
              Select a conversation
            </CardContent>
          ) : (
            <>
              <div className="p-3 border-b flex items-center justify-between">
                <div>
                  <p className="font-semibold">{active.profile_name || "Unknown"}</p>
                  <p className="text-xs text-muted-foreground">+{active.phone_number}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {active.escalated ? (
                    <>
                      <Badge variant="destructive" className="gap-1">
                        <Hand className="h-3 w-3" /> Human handling
                      </Badge>
                      <Button size="sm" variant="outline" onClick={() => setEscalated(active.phone_number, false)}>
                        <Bot className="h-4 w-4 mr-1" /> Resume AI
                      </Button>
                    </>
                  ) : (
                    <>
                      <Badge variant="secondary" className="gap-1">
                        <Bot className="h-3 w-3" /> Auto-replying
                      </Badge>
                      <Button size="sm" variant="outline" onClick={() => setEscalated(active.phone_number, true)}>
                        <Hand className="h-4 w-4 mr-1" /> Take over
                      </Button>
                    </>
                  )}
                  <Button size="sm" variant="outline" asChild>
                    <a href={`https://wa.me/${active.phone_number}`} target="_blank" rel="noreferrer">
                      Open in WhatsApp
                    </a>
                  </Button>
                </div>
              </div>
              <ScrollArea className="flex-1 p-4 bg-muted/20">
                <div className="space-y-3">
                  {messages.map((m: any, i: number) => {
                    const isUser = m.role === "user";
                    const isHuman = m.sent_by === "human";
                    return (
                      <div key={i} className={`flex ${isUser ? "justify-start" : "justify-end"}`}>
                        <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                          isUser
                            ? "bg-white border"
                            : isHuman
                              ? "bg-emerald-600 text-white"
                              : "bg-primary text-primary-foreground"
                        }`}>
                          {!isUser && (
                            <div className="text-[10px] uppercase tracking-wide opacity-80 mb-0.5">
                              {isHuman ? "You (human)" : "Lana (AI)"}
                            </div>
                          )}
                          {m.content}
                          {m.ts && (
                            <div className={`text-[10px] mt-1 opacity-70`}>
                              {new Date(m.ts).toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {messages.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center">No messages yet.</p>
                  )}
                </div>
              </ScrollArea>
              <div className="border-t p-3 bg-background space-y-2">
                {!active.escalated && (
                  <p className="text-[11px] text-muted-foreground">
                    Sending a message will pause the AI for this chat. Click "Resume AI" when you're done.
                  </p>
                )}
                <div className="flex gap-2 items-end">
                  <Textarea
                    placeholder="Reply as a human… (Enter to send, Shift+Enter for newline)"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendHuman();
                      }
                    }}
                    rows={2}
                    className="resize-none"
                  />
                  <Button onClick={sendHuman} disabled={sending || !draft.trim()}>
                    <Send className="h-4 w-4 mr-1" />
                    {sending ? "Sending..." : "Send"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
