# Phase 3

## Objective
The product has to be regorously tested in the market to identify a niche where we could later layout monetization. So the primary goals would be,
1. Make the product modular to resolve as many pain points
2. Create marketing collaterals like website, etc
3. Improve User Experience - Fix Bugs

## Features
Apart from bug and performance fixes, the core feature will include
1. Modularity for Campaign Flows
2. Website that can improve Signup Conversions
3. Analytics for Dashboard to track churn
4. Count Page Views and Events for Campaign Pages

## Batch 1 Bug Fixes - Done

1. P0: Campaign Flow Pages: The LCP score for campaigns pages is high, between 2 to 5 seconds.
- Some elements in the page are causing delay. Example: 3 Years as a Product Manager for Infinity Learn - driving Monetisation Roadmap `<p class="text-base leading-relaxed text-gray-700">` in https://elevateyourpitch.netlify.app/project/1afa893f-68ed-41e2-87e7-907f9278b68d
- Reduce unused JavaScript and defer loading scripts until they are required to decrease bytes consumed by network activity. 
2. P1: Campaign Flow CTA Page: On click phone or email CTAs should copy the field value to clipboard with a cursor message saying "copied to clipboard"
3. P1: Campaign Flow Case Study Page: The Case Study Cards with no url attached should not be clickable
4. P2: Remove the "close" button on the first page of Campaign Flow
5. P3: The Name and Company input fields are not allowing user to add a space - allow the user to add a space
6. P3: When a lead is successfully submitted or their is a submission error. Show a red or green toast message instead of the browser based dialogue that is there right now.

## Batch 2 Bug Fixes - Done
1. Dashboard: When the user clicks on magic link and is redirected to /auth/callback - add a loader until the dashboard opens or signup failure screen is populated
2. Dashboard: When user creates a new campaign, add a loader screen until the newly created campaign opnes
3. Dashboard: When the user clicks "Save Campaign" post adding some campaign data - the browser shares a message saying "Reload site? Changes that you made may not be saved." This message is only sent by browser when atleast some campaign data is added before saving. Desired UX: The campaign should successfully save and a toast message should communicate about successful save operation. In case of failure, the toast message shall mention the failure reason. No dialogues from Browser should be received.
4. Dashboard UI: Post adding service, the Service Name, Delete Button, and Chevron should have padding and margins to fit it orderly in the same line within the service container. Currently they crammed.

## Optimising Database Performance and Security

Performance
1. Wrapped the RLS policy functions in a Select Operation to make caching feasible
2. Limited RLS policies to ownership chains only
3. Created RPC Functions to handle display of campaigns, client services, case studies and widgets with a mandatory input argument of project_id.
4. Using RPC function for insert lead operation - core function in non exposed schema, and executor function in public schema with only authenticated user priviledge for execution (this works because anonymous signin users are authenticated users).
5. Created additional helper functions in non exposed schema in case we need to simplify ownership RLS policies further 

Security
1. Added project_id as arguments to all anon accessible RPC functions
2. Revoked access for functions that were created for switching, publishing, and archiving
3. Added explicit search_path to all public schema functions
4. Revoked Public Execute access for all functions in public schema
5. Campaign ID as mandatory input to insert leads to avoid abuse.
6. Created exclusive (false) RLS policy for non-owner requests to force use of RPC functions

Observed Bugs:
1. Recurring Hydration Issue
2. Refresh Issue when Campaigns are created - they are not visible without refresh
3. Switch to Current does not work as expected
4. Token changes during dashboard use which leads to ungraceful handling and showing 404. Can implemnt autologout.

Should first verify production speed improvments and security patches before fixing bugs.


## Link Usability Improvements
1. When a link for a particular project is shared, that link should have a preview where it displays the title of summary page "Hire abc", and a partial summary is displayed first few lines.
2. The project link browser tab title says "OpenToWork" change it to "Elevator Pitch"


## TO DO
1. Website PRD and Development
2. Make the Database Fast
3. Onboarding for Dashboard
4. Privacy Policy
5. Link Previews
