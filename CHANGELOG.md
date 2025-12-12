# CHANGELOG

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
