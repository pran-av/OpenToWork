# Phase 3a

## Goals

Goal is to make fixes and small improvements to make the product more marketable. Hands on marketing on the side to test hypothesis. Predict PMF and get more confidence on the product. Pivot if needed towards PMF.

### Fixes
Fix: the Studio CSS errors
Fix: Instant Update on UI post Insert Operations
Fix: Switch to Current - campaign list is not visible
Fix: Website LCP and other scores

### Features
- Link Previews
- Use Shadcn to figure out a overall theme
- Try to component-ise the website theme behaviour
- OAuth Signups: Google Mail and Linkedin. Link multiple auth to single user.
- Onboarding Flow
- Explore Encryption Requirements
- Privacy Policy considering how things work
- Add a Waitlist if people wish to be notified on full release
- Add more material to landing page

## Requirements

### Studio/Dashboard CSS Fixes
Note: Studio already has tailwind css coded for light as well as dark mode. Ensure tailwind version is greater than 3.4.1

1. Use next-themes library to manage the theme switching
2. Default mode for new users should be light mode. For returning users, persist their preferred mode based on the latest mode they switched into last time they visited. Manage using next-themes.
3. The tailwind config should set the dark mode property to "selector".
4. Add `ThemeProvider` to our Studio pages root and set the `attribute = "class"`
5. Sync theme after client mount to avoid hydration issues
6. Since we do not want a system theme, ignore system preference explicitly `<ThemeProvider enableSystem={false}>`. Now the library keeps default theme as light.
5. Create a toggle icon on Studio header, position on the right side of the header.

### Bug: Temp UUID being passed while inserting (save cta) case studies
Request:
```
POST curl 'http://localhost:3000/api/campaigns/800779d0-0b02-4845-ac76-5842d64c3a41/case-studies'
```
Payload:
```
[
    {
        "type": "create",
        "tempId": "temp-case-1767518732889",
        "serviceId": "temp-1767518731078",
        "data": {
            "case_id": "temp-case-1767518732889",
            "client_service_id": "temp-1767518731078",
            "case_name": "Case",
            "case_summary": "Cs",
            "case_duration": "",
            "case_highlights": "H1",
            "case_study_url": ""
        }
    }
]
```
Response: `Failed to process operation: Failed to create case study: invalid input syntax for type uuid: "temp-1767518731078"` temp-1767518731078 is client-service-id

Note: Operation does not always fails and error occurs in few cases. Identify the root cause before determining the fix.

### Bug: Real Time Updates on Project Overview Page

Issue:
1. When I create a new campaign, save it and return back the Project Overview Page, the new campaign is not visible unless I hard refersh the page.
2. When we switch from Campaign A to Campaign B, the latest campaign statuses are not updated on the Project Overview page until hard refresh.
3. When we open the Switch Campaign modal, the 'Current Active Campaign' and 'Switch to Campaign' dropdown list is not latest.

Expected Functionality:
The campaigns and its data should be instantly visible for the user post any mutations like creating new campaigns and switching of campaigns statuses.

Improvements to ensure latest state while not affecting performance:
1. Implement Optimistic Updates:
- When a new campaign is created: an object can store the new campaign and display it optimistically in the project overview UI
- When a campaign status is updated via the switch functionality, the optimisitic update object can record the status changes and display the UI based on latest changes always
2. Fetch from server:
- The server fetch should occur in the background to revalidate the data and update the caches accordingly. When a fetch is successful the optimistic data can now be updated with server side data which acts as a single source of truth.
- Fetch from server only when mutations are trigerred, in the above scenario it happens when a Campaign is Saved, when a Campaign status is updated via the Switch funtionality or if a campaign is published - which then makes it Active from Draft state
- Optional if architecture supports: fetch only the specific tags that have been modified via mutations keeping the rest same. For new campaign creations/save the same old cache can be updated with new campaign. In case of status change, only status can be fetched and change.
- All campaign related mutations and its cache can be managed by a function to avoid multiple parallel cache instances.
- Verify if caching headers are ideal and not causing the issues.

### Enhancement: Page Specific Metadata and Canonical URLs
Let's divide our strategy into two parts.
Part 1: Sharing the root url (like pitchlikethis.com) should preview content about the tool that is Pitch Like This
Part 2: Sharing of project URLs (ex project/{project_id}) should preview the custom campaign specific data (i.e currently active campaign of the project)

For Part 1
1. Add or verify if OG tags for title, description, image and url.
2. Use the same og meta and image for all social media cards including twitter
3. Use public/og_image.png

For Part 2
1. The OG title and description should be the {Client Name} and the first sentence of {Client Summary}
2. The above parameters will change based on url which will follow projects/{project_id} style
3. The Client Name and Client Summary should be of based on the current active campaign for the project
4. Do not use an og image for these independent URLs

Canonical URL
1. www.pitchlikethis.com is our primary url
2. Add a link based tag to pitchlikethis.com to be canonical of the primary which is www

### Enhancement: Add Privacy Policy and Terms of Service

**Home Page:**
1. Add links to access PP and ToS to the footer of the root webpage. PP is available at policies/privacy/v0.1.0-2026-01-07.md. ToS is available at policies/terms-of-service/v0.1.0-2026-01-07.md
2. For mobile and tablet viewports, avoid a new line to include these policies, instead add a pipe and mention these in front of "Created by Pranav".
3. On click the policies should open in a new tab and display content as in the markdowns. Take user automatically to the new tab.
4. Make sure the same headers and footers are available for the privacy and terms of service webpages. Clicking on the logo in the header should take user onto the home page. Provide a 'Back to Home' hyperlink at the bottom of the page post the ToS or PP ends. Besides this provide a hyperlink for 'Review Policy Versions' that points to the github repo https://github.com/pran-av/OpenToWork
5. When new policies are launched the PP and ToS pages are manually linked with the latest markdown file from the repo.

**Auth Flow:**

For All Users
1. The /auth page mentions the latest PP and ToS below the email collection field and above the Continue CTA. The text says "By continuing, you agree to the Pitch Like This Terms of Service and Privacy Policy." - the ToS and PP should be hyperlinked with the  policy webpages.
2. When a new policy is launched the hyperlinks are changed while the webpage remains the same.
3. (Manual Task) The Supabase magic link email copy is added the webpage URLs that display the latest copy of PP and ToS.

### Feature: Add a Github Star Button on Header

Display the CTA on left of the primary Login or Create Pitch button. On click the user is taken to 
Mobile: Githun logo and Star

### Optimizations:

1. P3 - Hero section images for home page. Do not preload desktop image for mobile viewport and vice-versa.
2. P0 - In metadata: “We expertise” → incorrect English Better: “We specialize in selling your skills.”
3. P0 - The favicon should fallback to png instead of just svg.