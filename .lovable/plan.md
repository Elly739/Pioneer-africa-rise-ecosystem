# Feature status and what's left

## Already done
- **Gamification** — badges tied to real milestones, public leaderboard by Innovation Score, badge showcase on profiles.
- **Analytics** — admin funnel view (signup to onboarded to enrolled to project shipped to applied) with drop-off and signup trend.
- **Innovation Hub (partial)** — "looking for a co-founder/teammate" tagging with roles needed, feeding collaboration requests.
- **Trust (partial)** — admin moderation covers projects and discussions (no member reporting, no verified partner badge).
- **Learning (partial)** — certificates exist with codes, but only inside the member area (no public verification page, no download).

## Still missing

### Learning
- Cohort / scheduled course runs with start dates and deadlines.
- AI-graded open-response assignment per course.
- Downloadable certificate and a public verification URL anyone can open.

### Careers
- Partner-side application review: partners post opportunities but cannot see or triage applicants.
- One-click AI-tailored cover note per opportunity.
- Email/digest alerts for newly matched opportunities (blocked: no sender domain yet).

### Innovation Hub
- Project milestones / updates timeline.
- Weekly featured project.

### Community
- Upvotes on discussions and replies, plus "accepted answer".
- Weekly digest email (blocked: no sender domain yet).
- Mentor office-hours threads.

### Trust
- Verified partner badge on partner profiles and their opportunities.
- Member-facing reporting on projects, discussions and replies, with a report queue in admin.

## Blocked on you
Both email items (opportunity alerts, weekly digest) need an email domain you own before anything can send. Everything else can be built now.

## Suggested build order
1. Careers: partner application review + AI cover note (highest user value, unblocks partners).
2. Community: upvotes and accepted answer (cheap, lifts activity).
3. Trust: verified partner badge + reporting queue.
4. Learning: public certificate verification and download, then AI-graded assignments, then cohorts.
5. Innovation Hub: milestones timeline, weekly featured project.
6. Email digests once the sender domain is verified.

## Technical notes
- New tables needed: discussion votes (unique per user per target), accepted answer flag on discussions, reports table with status, project milestones, course cohorts and enrolment deadlines, course assignments and submissions with AI grade, partner verification flag on profiles.
- Every new public table ships with grants plus RLS policies in the same migration.
- AI cover note and assignment grading run through the existing gateway helper in server functions, not client-side.
- Certificate verification lives at a public route reading only code, holder name, course and issue date.
