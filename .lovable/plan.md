# Simplify navigation and verify signed-in features

## Goal
Turn the crowded header into a clear app shell based on the selected **Simplified App Shell** direction, keep every feature easy to reach, and complete the signed-in quality check.

## Navigation redesign
- Replace the long desktop row with five primary destinations: **Learn, Build, Opportunities, Community, More**.
- Map existing areas into those destinations:
  - **Learn:** courses and learning progress.
  - **Build:** Innovation Hub and challenges.
  - **Opportunities:** careers and applications.
  - **Community:** discussions and people.
  - **More:** leaderboard, blog, certificates, portfolio, CV, role requests, and other secondary destinations.
- Consolidate level, XP, and streak into one compact status control.
- Keep notifications visible, and combine Dashboard, role workspace/Admin, profile-related links, and sign out in a clear account menu.
- Preserve a compact mobile menu with the same hierarchy and no clipped or wrapped labels.

## Floating AI Mentor
- Remove AI Mentor from the top navigation.
- Add a persistent bottom-right mentor launcher on signed-in app pages, using the selected clean white/navy/blue/orange visual direction.
- Give it a short contextual label on larger screens and a compact icon-only treatment on mobile.
- Ensure keyboard access, a clear accessible label, safe spacing above mobile controls, and reduced-motion support.
- Keep existing context-aware “Ask the mentor” links inside lessons, projects, quizzes, and opportunities.

## Visual system
- Shift shared app styling to the selected **Crisp Light** palette: white surfaces, deep navy structure, blue navigation emphasis, and orange primary actions.
- Use **Outfit** for headings and **Figtree** for interface/body text.
- Apply the selected direction’s tighter header height, quieter borders, compact controls, and restrained shadows without redesigning unrelated page content.
- Preserve the current Pioneer Africa Hub logo.

## Signed-in verification
- Restore or mint the requesting user’s managed sign-in session and test the real flows end to end.
- Verify discussion voting, accepted-answer marking, and reporting, including the resulting state after refresh.
- Verify joining an available cohort and submitting an AI-graded assignment when testable course data exists.
- Verify Admin Reports and Applicants access, list states, filters, and status actions for the signed-in user’s actual roles.
- Verify “Project of the week” with the existing project now visible in the supplied screenshot; confirm its project link and displayed content.
- Fix any defects uncovered within these named flows, then recheck desktop and mobile navigation, runtime errors, and the latest build result.

## Technical notes
- Keep TanStack Router links and existing role checks; no permissions are moved into browser-only state.
- Reuse the existing notification, stats, and account data rather than introducing new backend tables.
- Implement menus with accessible focus management, outside-click/Escape dismissal, active-route indication, and non-overlapping responsive layout.
- Add route-specific metadata only if a touched content route is currently missing the required metadata.
