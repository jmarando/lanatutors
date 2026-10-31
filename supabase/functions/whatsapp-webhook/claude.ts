// How Lana talks to Claude, the second AI: the chat reshaped the way the Messages API wants it, and the answer read
// back. Plain functions, with no Deno or network calls, so they can be tested without Deno (see supabase/functions/_tests).

export type ClaudeMessage = { role: "user" | "assistant"; content: string };

// Claude wants the chat to start with the person and not to end on a message of its own (a last one from its side
// reads as a prefill, which it rejects). Two messages in a row from one side become one. The team's replies and
// Lana's own are both the assistant's side.
export function toClaudeMessages(history: { role: "user" | "model"; content: string }[]): ClaudeMessage[] {
  const messages: ClaudeMessage[] = [];
  for (const m of history) {
    const content = m.content.trim();
    if (!content) continue;
    const role = m.role === "model" ? "assistant" : "user";
    const last = messages.at(-1);
    if (last?.role === role) last.content += `\n\n${content}`;
    else messages.push({ role, content });
  }
  while (messages[0]?.role === "assistant") messages.shift();
  while (messages.at(-1)?.role === "assistant") messages.pop();
  return messages;
}

type ClaudeBody = {
  content?: { type?: string; text?: string }[];
  stop_reason?: string | null;
  stop_details?: { category?: string | null } | null;
  error?: { type?: string; message?: string };
  request_id?: string;
};

// Reads Claude's answer. Anything but a plain text reply comes back as a reason the team can act on.
export function readClaudeReply(status: number, body: unknown): { ok: true; text: string } | { ok: false; reason: string } {
  const data: ClaudeBody = body && typeof body === "object" ? (body as ClaudeBody) : {};
  if (status < 200 || status >= 300) {
    const type = data.error?.type ? ` ${data.error.type}` : "";
    const message = data.error?.message ? `: ${data.error.message}` : "";
    const request = data.request_id ? ` (request ${data.request_id})` : "";
    return { ok: false, reason: `Claude answered ${status}${type}${message}${request}` };
  }
  if (data.stop_reason === "refusal") {
    const category = data.stop_details?.category ? ` (${data.stop_details.category})` : "";
    return { ok: false, reason: `Claude declined to answer${category}` };
  }
  // A thinking block can come before the text, so the blocks are read by type.
  const text = (Array.isArray(data.content) ? data.content : [])
    .filter((block) => block?.type === "text" && typeof block.text === "string")
    .map((block) => block.text)
    .join("")
    .trim();
  return text
    ? { ok: true, text }
    : { ok: false, reason: `Claude answered with no text (stop reason: ${data.stop_reason ?? "none"})` };
}
