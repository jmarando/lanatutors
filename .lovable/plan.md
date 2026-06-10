# Lana WhatsApp AI — 5 Upgrades

Goal: Turn the WhatsApp bot from a single-shot Q&A into a context-aware assistant that remembers conversations, logs everything, escalates when needed, and can actually look things up.

---

## 1. Sharpen the system prompt
Bake in concrete, Lana-specific facts so Lana stops giving generic answers:
- Curricula offered (CBC, IGCSE, A-Levels, American, IB) + the specialized IGCSE early-years subjects
- Booking paths: Single Session / Custom Package / Learning Plan / Academic Assessment Call
- Pricing model (multi-currency, KES base, 30% platform fee not shown to parents)
- Online (Google Meet) and in-person (Nairobi) modes
- Payments: Pesapal (cards, M-Pesa)
- Brand voice rules already in place (short, warm, sign off "Lana 💛" first reply only)
- Hard rules: never invent prices/tutor names, never share dashboard links, all email from info@lanatutors.africa

I'll ask you to confirm pricing ranges before publishing those specifically.

---

## 2. Conversation memory
Today every message is treated as the first one — Lana has amnesia.

Add a `whatsapp_conversations` table:
- `phone_number` (PK)
- `profile_name`
- `messages` (jsonb array of `{role, content, ts}`, capped to last 20)
- `parent_id` (nullable — linked when we match the phone to a parent account)
- `last_message_at`
- `escalated` (bool)

On every inbound message:
1. Load history for that phone
2. Send full history to Gemini
3. Append user msg + assistant reply
4. Trim to last 20 turns

---

## 3. Log every WhatsApp message to `communication_logs`
You already have a `communication_logs` table + `CommunicationTimeline` admin UI. Right now WhatsApp messages don't show up there.

For every inbound + outbound WA message, insert:
- `channel: "whatsapp"`
- `direction: inbound | outbound`
- `content`
- `parent_id` (if phone matches a parent in `profiles`)
- `status: "sent"`

Result: every parent's profile page in admin will show their full WhatsApp thread alongside emails.

---

## 4. Escalation to the team
When Lana detects:
- Frustration / complaint keywords ("angry", "refund", "complaint", "terrible", "unacceptable")
- Explicit request for a human ("speak to someone", "talk to a person")
- Complex billing/payment issues
- 3+ back-and-forth turns without resolution

She will:
1. Send a warm holding reply ("Let me get someone from the team to help — they'll email you at...")
2. Mark conversation `escalated = true`
3. Send an email to info@lanatutors.africa with the full transcript via existing Resend setup
4. Stop auto-replying until an admin manually clears `escalated`

---

## 5. Tools (function calling)
Give Lana actual capabilities using Gemini function calling:

- `lookup_tutors({subject, curriculum, level})` → queries `tutor_profiles` via the public RPC and returns 2–3 matches with names + brief bio
- `get_booking_link({type})` → returns the right deep link for assessment call / single session / package / learning plan
- `check_parent_account({phone})` → tells Lana whether the WhatsApp number maps to an existing parent (so she can greet returning families by name and skip onboarding info)

These run server-side in the edge function; results get fed back to Gemini so the final reply is grounded in real data.

---

## Technical details

**Files**
- `supabase/functions/whatsapp-webhook/index.ts` — rewrite to support memory, logging, tools, escalation
- New migration: `whatsapp_conversations` table with RLS (admin read-only; service role full access)
- New edge function: `whatsapp-escalation-email` (or reuse existing email-sender pattern)

**Order of work**
1. DB migration (memory table)
2. Rewrite webhook with: prompt + memory + logging
3. Add escalation path + email
4. Add Gemini function-calling tools
5. Test end-to-end via WhatsApp

**Risks / things I need from you**
- Real pricing ranges per curriculum (or confirm "always say 'team will confirm'")
- Confirm escalation email should go to `info@lanatutors.africa` (or a different inbox)
- OK to use Gemini 2.5 Flash (current) for tool calling — it supports it natively

I'll ship steps 1–4 in one pass, then verify in the WhatsApp UI before adding tools (step 5) since those need the most testing.
