# CHANGELOG

## v1.5.0 (Current)
(Jan 01, 2026 - )
> Phase 3 in progress: mvp is ready to contest PMF in the market

- Footer copyright year update to 2026
- Updated Changelog till latest v1.5
- refactoring: removed unused key frame for subheading rotation
- disable system theme and provide manual toggle in Studio header (via next-themes)
- added unit test config (vitest)
- OG Metadata addition for Pitch Like This sites and custom project URLs. Custom project URLs read the client name and client summary parameters for active campaigns and display them as og params. Separate og images for marketing website and client used project links.
- Declared www.pitchlikethis.com as the canonical domain, and for client projects the respective non parameterised links are canonical

### Fixes:
- Check to verify UUIDs is not temporary before direct save operation for case studies, if temp then queue for batch saving
- Check to not pass tempIDs to APIs for insert operations
- During batch saving ensure client services are saved before attempting case studies to be saved
- Optimistic Updates and Cache Busting implemented for campaign mutations to update Package Overview Page without hard refresh - implementations made to Switch Modals as well to update latest Active Campaigns in the project overview page
- Switch to Current CTA opens a modal with latest Active Campaign details and a preselected current campaign as dropdown
- Updated OG description for custom project links to share first 150 characters of client summary instead of first sentence

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
