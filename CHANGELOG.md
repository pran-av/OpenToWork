# CHANGELOG

## v2.0.0 (Current)
(Apr 18, 2026 - May 09, 2026)

- Agent Integration: Added PLT Agent Service integration with server routes for resumes, job descriptions, resume scoring tasks/reports, notifications, and profile APIs.
- Onboarding v2: Rolled out server-led onboarding flows with improved step sequencing, status handling, and recovery behavior across desktop/mobile Sage experiences.
- Infrastructure: Introduced/expanded `agents` schema migrations for tasks, conversations/messages partitioning, flow/step/UI-action state models, and related hardening.
- Deployment Config: Added production base URL fallback for agent API (`https://agentservice.pitchlikethis.com`) with env override support.
- Policies: Published and wired **Privacy Policy v1.0.0** and **Terms of Service v1.0.0** pages.

### Engineering — Studio onboarding linear flow & Sage shell (`feat/onboarding-linear-flow`)

High-signal notes for future work. Internal API/route names still use `project` / `campaign` / `lead` in many places; user-facing copy and comments follow the **Application / Pitch / Recruiter** terminology guard.

#### Layout & chrome

- **`app/dashboard/DashboardClientShell.tsx`** — Wires the dashboard body: desktop **left rail** (`DashboardDesktopSidebar`), **`DashboardFlowPullDrawer`** on key routes, and coordinates with Sage. Banner copy is driven by **`lib/dashboard-flow-banners.json`** (per `bannerKey`: `experience` | `campaigns` | `profile`). JSON `_comment.ctaActionRule`: if banner CTA label is exactly **`Visit Flow Panel`**, the handler opens the pull drawer; **any other** CTA label starts/resumes onboarding via **`SAGE_OPEN_ONBOARDING_FLOW_EVENT`** (direct flow entry without requiring the drawer step first).
- **`components/dashboard/DashboardDesktopSidebar.tsx`** — New desktop-only nav (`lg:flex`, hidden on small viewports). Items: Experiences → `/dashboard`, Applications → `/dashboard/projects`, Profile → `/dashboard/profile`. Collapsible width (`lg:w-16` ↔ `lg:w-60`). Stable Sage highlight targets: `id="experience-desktop-sage-target"`, `id="applications-desktop-sage-target"`, `id="profile-desktop-sage-target"` (used by tour positioning in `DashboardSageFrame`).
- **`components/dashboard/DashboardHeader.tsx`** — Mobile bottom pill nav (`fixed`, `lg:hidden`) with matching IDs: `experience-nav-cta`, `applications-nav-cta`, `profile-nav-cta`. **Campaign editor write mode** still hides bottom nav when pathname matches `/dashboard/projects/[projectId]/campaigns/[campaignId]` + `useStudioCampaignWriteModeListener()`. **Cross-page suppression**: listens for **`STUDIO_SUPPRESS_MOBILE_BOTTOM_NAV_EVENT`** (`lib/studio-mobile-nav.ts`) so children (e.g. experience form) can hide the bar while a bottom sheet is open.
- **Sage mode toggle removed** — Closing/opening Sage is unified around **Close Flow** / flow panel behavior across viewports (see `SageWindow`).

#### Pull drawer & flow bootstrap

- **`components/dashboard/DashboardFlowPullDrawer.tsx`** — Portal-based pull-to-reveal (or CTA-opened) drawer listing flow state: **idle → available | pending | completed** using `listActiveOnboardingFlowsV2` / `listCompletedOnboardingFlowsV2`. Persists **Prepare** UI on CTA via `prepareUiOnFlowCta` / `flowPrepareUiOnCta` coordination with `SageWindow` (mobile avoids duplicate “Preparing” surfaces). Dispatches **`SAGE_OPEN_ONBOARDING_FLOW_EVENT`** with optional `prepareUiOnFlowCta`, `resumeFlowInstanceId`, `forceStart`. Integrates **`SAGE_FLOW_PREPARE_UI_DONE_EVENT`**, **`SAGE_MOBILE_MODE_PREFERENCE_EVENT`**, `setSageMobileUserHoldOpen` for correct mobile overlay + session behavior.
- **`SageWindow`** exposes constants used across shell: e.g. **`SAGE_OPEN_ONBOARDING_FLOW_EVENT`**, **`SAGE_RESUME_FROM_TOUR_EVENT`**, **`SAGE_MOBILE_MODE_PREFERENCE_EVENT`**, **`SAGE_SESSION_KEY`**, **`SAGE_ONBOARDING_COMPLETED_KEY`**, onboarding task nav storage key mirroring `DashboardSageFrame`, etc.

#### `SageWindow` (onboarding UX core)

- **Phases** — `onboardingLinearPhase`: **`intro`** → **`tasks`** → **`outro`**, with **`replay`** after completion for wrap-up / task list replay. Slide indices are partitioned from `messages` + `EXECUTE_ONBOARDING_TODOS_STEP_KEY` / `flowSteps` (lines keyed before vs after execute step; unkeyed tail can be outro).
- **Part-based To Do** — `ONBOARDING_PARTS` groups steps into **Part 1 / 2 / 3** with `minSequence`/`maxSequence` aligned to `lib/sage-onboarding-nav.ts` ordering. UI checklist labels use flow step titles / agent tooltips where present.
- **Progress** — Onboarding uses **`onboardingUnifiedProgressPercent`** so the header progress bar reflects intro + synthetic “tasks hub” slice + outro (not raw server percent only).
- **Mobile/tablet fixed bottom CTAs (`!isDesktop`, onboarding only)** — Intro/outro/replay **Back | step counter | Next** moved to **`fixed bottom-0`** toolbars (`z-[25]`, safe-area padding on wrapper) so they don’t compete with scroll content. **Tasks hub** **Start / Resume Onboarding** duplicated to a full-width fixed bar; inline duplicate hidden; list container gets extra **bottom padding** so rows clear the bar. Desktop keeps inline controls (unchanged).
- **Step counter text** — Shared memo **`onboardingLinearStepProgressText`** feeds both desktop inline and mobile dock (replay / intro / outro formats).
- **Loading / prepare** — Desktop: optional **Preparing Flow** banner (top offset uses `headerOffsetPx` + gaps). Mobile: can hide duplicate preparing strip when `flowPrepareUiOnCta` / pull-drawer CTA owns the spinner.
- **Completed flow** — Users can re-open a **completed** onboarding from the drawer; replay/terminal message behavior adjusted so the last step isn’t “lost” after logout/session edge cases.

#### `DashboardSageFrame` (tour spotlight + task dialog)

- **Highlight selectors** — `SAGE_TARGET_SELECTOR` / `getPreferredSageTargetNode`: **Experiences** (`nav.experience_dashboard`) and **Applications** (`nav.campaigns_dashboard`) highlight **nav buttons** (`#experience-nav-cta`, `#experience-desktop-sage-target`, etc.), not `#experience-dashboard-root` / `#projects-root`.
- **Create Application / Create Pitch tour card (< lg)** — For `campaigns_dashboard.project.create_cta` and `campaigns_dashboard.project.campaign.create_cta`, onboarding task dialog position uses **header-pinned** placement (`headerOffsetPx + padding`, centered) instead of anchor-relative placement. Reason: shared `Dialog` is a **bottom sheet** (`items-end`, `max-lg:h-[80dvh]`); “below panel” overflowed the viewport and **clamp** pulled the tooltip over form fields; `rect.bottom` vs chrome was unreliable.
- **`SAGE_MODAL_STEP_TARGETS` / `SAGE_ONBOARDING_CREATE_SHEET_TARGETS`** — Modal step set still includes publish/create targets for ordering/gaps; create-sheet subset drives the pin behavior above.
- **Copy / buttons** — Profile verification (Part 3) **`PROFILE_VERIFICATION_HINTS` removed**; no extra gray hint paragraph for DB-verified steps. **Primary-action hints** (“Use the highlighted control…”) removed entirely. **`nav.sage_window`** primary CTA stays **Next** (not Skip). Profile skip control label **Skip** (not “Skip Remaining Parts”) where applicable.
- **Events** — Still listens for **`SAGE_PRIMARY_ACTION_DONE_EVENT`**, **`SAGE_PROFILE_VERIFICATION_DONE_EVENT`**, persists task nav context in **`sessionStorage`**, clears `sage_highlight` query param after apply.

#### Profile & onboarding completion (client)

- **`app/dashboard/profile/page.tsx`** — Dispatches **`dispatchSageProfileVerificationDone`** for **`profile.user_name.edit`**, **`profile.resume.upload_cta`**, **`profile.linkedin.connect_cta`** when saves/uploads/LinkedIn state succeed (ties Part 3 to `STEP_DONE` via ack path in `DashboardSageFrame`).

#### Experience / projects / campaigns (onboarding hooks)

- **`app/dashboard/experience/new/page.tsx`** — Sage highlight field IDs unchanged (`#service_class`, `#display_year`, …). **Service class picker**: when **`isServiceClassPickerOpen && !isDesktopPicker`**, calls **`setStudioMobileBottomNavSuppressed(true)`** so **`DashboardHeader`** hides the pill nav (drawer no longer clashes with **`bottom-3 z-30`** chrome).
- **`app/dashboard/projects/page.tsx`**, **`ProjectOverviewClient.tsx`**, **`CampaignOverviewClient.tsx`** — Onboarding dialogs, `data-sage-target` CTAs, `sage_highlight` query handling, **`dispatchSagePrimaryActionDone`** targets (`campaigns_dashboard.project.create_cta`, `campaigns_dashboard.project.campaign.create_cta`, publish, etc.) aligned with **`DashboardSageFrame`** selectors (`#sage-onboarding-project-dialog`, `#sage-onboarding-campaign-dialog`, …).
- **`components/ui/dialog.tsx`** — Responsive shell: **`max-lg:h-[80dvh]`**, **`items-end`** for sheet behavior; informs tour positioning assumptions in `DashboardSageFrame`.

#### New lib module

- **`lib/studio-mobile-nav.ts`** — **`STUDIO_SUPPRESS_MOBILE_BOTTOM_NAV_EVENT`** + **`setStudioMobileBottomNavSuppressed(suppressed)`**. Pattern: **`useEffect`** with **`suppressed`** + cleanup resetting **`false`** on unmount.

#### Marketing / terminology (landing components)

- **`CampaignsShareVisual`**, **`CollectLeadsVisual`**, **`OrganiseCampaignsVisual`**, **`LandingFeatureBento`** — Copy/visuals aligned with **Applications / Pitches / Recruiters** (and related wording) where this branch touched them.

---

### Fixes:
- Onboarding UX: Fixed Back-to-Sage handling, completed-flow reopening behavior, mobile/tablet restart flow entry, and To-Do list/status rendering issues.
- Stability: Reduced onboarding race conditions between UI actions and server acknowledgements; improved skip/done handling compatibility.
- UI: Improved progress bar behavior, Sage FAB dialog behavior, and mascot assets for high-resolution rendering.

## v1.7.0 (Current)
(Jan 16, 2026 - Feb 06, 2026)

- Analytics: End-to-end session, event, and heartbeat tracking wired via Supabase worker and Upstash Redis streams. Implemented Supabase Cron to trigger worker every 30 seconds.
- Campaign Performance: Actual vs Engaged Sessions and Time Spent cards added to Campaign Overview
- Campaign Performance: Analytics cards, loading, and error states refined for Studio dark mode
- Leads API: Upstash Redis rate limiting for campaign flow lead submissions (5 requests/minute per IP)
- Auth: Anonymous sign-in moved to server-side route with secure HttpOnly cookies
- Profile: `api/profile` now returns `profile: null` for new users instead of failing

### Fixes:
- Analytics: Fixed UUID generation and SQL/RPC mismatches for analytics sessions and events
- Analytics: Resolved worker Redis stream issues so queued events and heartbeats process reliably with stream trimming
- Analytics: Corrected heartbeat and session cookie handling for accurate engaged session and time spent calculations
- Security: Tightened permissions on analytics RPCs and `campaign_analytics_view` so only campaign owners can see their metrics
- Header: Profile update dropdown now renders above the back navigation strip in Studio

## v1.6.0
(Jan 10,2026 - Jan 15, 2026)

- Linkedin OAuth Integration
- Profile Page: User can update name manually and save or connect Linkedin via Profile Page
- Profile Enrichment based on Linkedin Data when name or profile pic is empty
- Link LinkedIn to Magic Link Accounts via Dialog Strip or Profile Page CTA
- Fallback to Magic Link Auth when LI does fails due to no verified email
- Encryption for Linkedin Sub Storage as cookie for post Magic Link auth linking
- Header displays Profile Image if LI Connected
- Header Dropdown for Profile Page Nav or Logout

### Fixes:
- Repositioned Back Navigation
- Link Identity methods runs from server side to retrieve user cliams without failure
- View Public Campaign Flows as an Authenticated User without generating a new identity when Social Login is present
- Added Retries and Delays on Profile Enrichment to avoid race conditions
- Added sizes param for Images
- auth/callback implements auth/v1/callback functionalities (might require refactoring)
- P1: Back Navigation Strip hides the Header Dropdown (Pending)
- P1: No Loader when user being redirected to dashboard post auth via Magic Link or OAuth (Pending)
- P2: On Click Link Linkedin via Dialog CTA - no loader is displayed (Pending)

## v1.5.0
(Jan 01, 2026 - Jan 09, 2026)
> Phase 3 in progress: mvp is ready to contest PMF in the market

- Footer copyright year update to 2026
- Updated Changelog till latest v1.5
- refactoring: removed unused key frame for subheading rotation
- disable system theme and provide manual toggle in Studio header (via next-themes)
- added unit test config (vitest)
- OG Metadata addition for Pitch Like This sites and custom project URLs. Custom project URLs read the client name and client summary parameters for active campaigns and display them as og params. Separate og images for marketing website and client used project links.
- Declared www.pitchlikethis.com as the canonical domain, and for client projects the respective non parameterised links are canonical
- Privacy Policy and Terms of Service v0.1.0 drafted and updated in the Home Page Footer, Auth Container, and the Studio Footer
- Created version controlled directories in repo to maintain version of PP and ToS. Any new versions require manual linking for webpages to be updated.

### Fixes:
- Check to verify UUIDs is not temporary before direct save operation for case studies, if temp then queue for batch saving
- Check to not pass tempIDs to APIs for insert operations
- During batch saving ensure client services are saved before attempting case studies to be saved
- Optimistic Updates and Cache Busting implemented for campaign mutations to update Package Overview Page without hard refresh - implementations made to Switch Modals as well to update latest Active Campaigns in the project overview page
- Switch to Current CTA opens a modal with latest Active Campaign details and a preselected current campaign as dropdown
- Updated OG description for custom project links to share first 150 characters of client summary instead of first sentence
- favicon fixes and addition of manifest json for webapp icons

## v1.4.0
(Dec 30, 2025 - Dec 31, 2025)
- Deployed website to pitchlikethis.com hosted via Vercel, latency issue resolved via having database and client on same location
- New Landing Page replaces previous elevator pitch page
- New logo added as favicon, app name updated to 'Pitch Like This'
- Dashboard named as "Studio" with logo in the header
- Dashboard theme partially updated, some buttons are orange, bugs in the rest of CSS
- Secondary CTA for Sample Pitch, opens in new tab a project URL

### Fixes:
- Dynamic Origin for Login and Create Pitch CTAs and all landing pages
- Updated hero page heading copy to "You excel at your skills. We excel at selling them."
- Vercel Bot: dependency version updates

## v1.3.0
(Dec 26, 2025 - Dec 28, 2025)
- Migration, Optimised RLS Policies: Policies for authenticated own data operations, user generated content visibility delivered via RPC functions, Enforced use of RPC in client to retrieve data - RLS policies only govern ownership
- Migration: Implement RPC function for lead insert functionality
- Added Browser Side caching preferences for APIs. GET APIs have 60s browser, all authenticated requests are private and not publicly cached.
- Loading dashboard pages with POST routes as edge runtime

Fixes:
- Modify functions to add public schema to fetch enums
- Case Study datatypes in functions switched to varchar to match schema
- Revoked anon access for rpc functions performing atomic swaps
- Updated RLS policies to enclose helper functions in SELECT operation

## v1.2.0
(Dec 15, 2025 - Dec 17, 2025)
- An elevator pitch inspired website, created specifically for mobile experience
- Made pitch website responsive for tablet and desktop
- Prelude page to explain about elevator pitch
- Added elevator music to the pitch webpage
- Elevator favicon
- Cascading for images
- Google Analytics tag integration

### Fixes
- Create Pitch CTA positioning 15% from bottom of the screen
- Mobile viewport CSS fixes and adjustments
- Preload images to improve LCP
- Compressed audio quality
- Disable minor scroll movement in mobile viewports
- Edge adjoining border clipped for elevator buttons and indicator

## v1.1.0
(Dec 10, 2025 - Dec 12, 2025)
- supabase cli setup for separate backend pipeline for development

### Fixes
- Campaign Flow: Dynamic Loading and Deferred Guest Sign Up to improve LCP Scores
- Campaign Flow: avoid case study redirect if no url
- Camapign Flow: click to copy email or phone to clipboard
- Campaign Flow: remove close cta on summary page
- Campaign Flow: toast messages on lead submission
- Campaign Flow: trim/sanitize lead input parameters post user submission, allow space in Lead Name and Lead Company Name
- Dashboard: Loader on magic link click and post campaign creation
- Dasboard: Avoid browser warning on Campaign Save, show toast messages for save and publish communication
- add padding to service name, delete icon and accordian



## v1.0.0
> Phase 2 Completed. Product Usable on the Internet.

(Dec 09, 2025)

### Fixes
- verifier cookies to be stored as sameSite Lax to avoid auth handshake issues

## v0.9.0
(Dec 08, 2025)
- archieve projects functionality
- global footer for dashboard

### Fixes
- guest user auth code duplication, create a function for anon sign up
- secure cookie functionality verification
- guest sign up: if jwt decoding fails, proceed with token without duplicate anonymous user creation
- leads pagination: setLeadPage only after fetchLeads is success
- remove duplicate archieve modal in Project Overview page
- wrap useSearchParams in suspense boundary
- auth page split into separate server and client files
- build fixes and netlify omition command

## v0.8.0
(Dec 06, 2025 - Dec 07, 2025)
- dashboard: create services and case studies for campaigns
- dashboard: campaign publish and switch functionality
- dashboard: pause campaign functionality
- integrated project URLs to render active campaigns for guest users
- dashboard: leads tab on projects page
- track guest users by JWT fingerprinting - necessary for form insertions

### Fixes
- view details for active campaigns by clicking on the card
- header title click takes users to /dashboard
- verify getUser with supabase before collecting sessions from client

## v0.7.0
(Dec 05, 2025)
- magic link auth
- basic dashboard setup
- cookie setup per environment
- dashboard: project overview page and project creation modal
- global back navigation in header
- dashboard: campaign creation and overview page

### Fixes
- auth.users sync to public.users
- back navigate to the previous page


## v0.6.0
> Phase 1 Completed

(Dec 01, 2025 to Dec 04, 2025)
- Added AGPL 3.0 License to the code
- Integrated DB to fetch campaign data
- widget code and called widget code into campaign pages dynamically
- Setup RLS

## v0.5.0 
(Nov 30, 2025)
- Campaign Flow Screens
- Supabase Setup
