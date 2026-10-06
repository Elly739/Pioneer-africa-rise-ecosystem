# Profile access from Community + private messaging

## What exists today

Public profile pages (`/u/<name>`, viewable without signing in) already show: photo or initials, name, headline, university · study year · country, bio, followers/following, level + XP, day streak, GitHub/LinkedIn/website links, "Open to" tags, skills and interests, Innovation Score with its six-part breakdown, earned badges, up to 6 projects, 6 certificates, and 5 recent discussions. Email and anything private are not exposed. Locked badges and the "Edit your portfolio" button appear only for the owner.

Two gaps:

- **Community names are dead text.** In the discussion list, the whole card links to the thread. Inside a thread, the original poster and every reply author render as an avatar plus a plain name — no link. Profiles are currently reachable only from the leaderboard, a project's "by …" line, the partner talent directory, and admin pages.
- **No private messaging.** The only "messages" in the app are AI Mentor chats. An unused `talent_message` notification type sits in the database from an earlier plan that was never built.

This plan closes both, using the choices you made: any signed-in member can start a chat, text plus notifications at launch, and moderators can only read a conversation after someone reports it.

## Part 1 — Make profiles reachable from Community

- Discussion cards: the author's avatar and name become a link to their profile. The card title keeps its own link to the thread. The card wrapper stops being one big link so the two links don't nest (nested links are invalid and break keyboard focus).
- Thread pages: the original poster's name and each reply author's name link to their profile, keeping the existing focus states.
- Reply authors who are the thread owner keep their "accepted answer / report" controls exactly as they are.

## Part 2 — Private messaging

**Conversation model.** One conversation per pair of people, so a chat never splits in two. A separate participant record tracks where each person has read up to, which gives an accurate unread count without marking messages one by one.

**Entry points.**
- A **Message** button on every public profile, shown to signed-in visitors viewing someone else. Clicking it opens (or starts) the conversation and goes straight there.
- A new **Inbox** page: conversation list on the left with avatar, name, last message preview, time, and unread count; the open thread on the right with the composer at the bottom.
- **Inbox** joins the account menu, with an unread count next to it in the header and in the mobile menu.
- New messages arrive live while the inbox is open, the same way notifications already do.

**Notifications.** When someone receives a message, a notification appears in the bell linking straight to that conversation — "Maya sent you a message".

**Guardrails.** Since anyone signed in can start a chat, a lightweight guard applies: short messages are rejected, identical consecutive messages are ignored, and a person can't send an unusual burst in a short window. This is a speed bump, not a wall.

## Part 3 — Moderation of reported conversations only

- A **Report** button in the conversation header, using the same reporting flow already built for projects, discussions, and replies.
- Reported conversations appear in the existing moderation queue alongside the rest, showing who is involved and why it was reported.
- Staff can open the messages of a reported conversation to review it, then resolve or dismiss — matching how the queue works today.
- Conversations that nobody reports are never readable by staff. This is worth stating on the profile or inbox so members know what they're agreeing to.

## Part 4 — Clean-up and docs

- Remove the stale `talent_message` notification type if nothing needs it, or repurpose it.
- Add messaging and the new inbox route to the README feature list and route map.
- Note in the project rules that a conversation is one-per-pair and staff visibility is report-gated, so future work doesn't quietly widen it.

## Technical details

**New tables** (all with GRANTs to `authenticated` and `service_role`, RLS enabled, no anon access):
- `conversations(id, user_a, user_b, created_at, last_message_at)` with `CHECK (user_a < user_b)` plus a unique pair index so one row per pair is enforced by the database.
- `conversation_participants(conversation_id, user_id, last_read_at)` as the join record and read marker.
- `messages(id, conversation_id, sender_id, body, created_at)` with `read_at` dropped in favour of the participant marker.

**Row-level security:** participants can read their own conversations, messages, and participant rows; a participant can insert a message only as themselves; only a participant can update their own `last_read_at`. Nobody else — including admins — can read a conversation through the normal data API.

**Server functions** (`requireSupabaseAuth`, in `src/lib/api/`): `startOrOpenConversation`, `listConversations`, `getConversationMessages` (marks read on open), `sendMessage`, `reportConversation`. Staff-only message review uses an admin client loaded inside the handler after a `has_role` check, and only for conversation ids present in `content_reports`.

**Notifications:** add a `direct_message` value to the existing notification type enum and a security-definer trigger on new messages that writes a notification for the other participant, following the pattern the other triggers already use.

**Reporting:** widen the report target type union to include `conversation` and extend the moderation queue to render and open that type.

**Anti-spam:** enforced in `sendMessage` — minimum body length, duplicate-consecutive check, and a per-hour send cap per user.

**Routes:** `src/routes/_authenticated/inbox.tsx` and `src/routes/_authenticated/inbox.$conversationId.tsx`, both under the existing auth gate; navigation and mobile menu updated with an unread badge.

## Verification

- Type-check and build log clean.
- Signed-in browser pass: open a thread, click an author's name, confirm their profile loads; click Message, send a message, confirm it persists and the unread count behaves; report a conversation and confirm it reaches the moderation queue and staff can open it.
- A second test account is used to confirm both sides of a conversation, since one account can only show half the flow.
- Mobile check on the inbox and the new profile links.
