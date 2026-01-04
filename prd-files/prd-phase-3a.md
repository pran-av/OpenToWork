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