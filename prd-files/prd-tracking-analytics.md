# Analytics for Pitch Links

## Goal
The creators of pitches should be able to analyse if their links are effective. The creators will use this data to make decisions like if they should create a more better campaign or approach a different lead or if this way of reachout is working for them.

Following are some data parameters that are required from an analytics feature:
1. If a user is sending a pitch link to someone: are these individuals (leads) opening these links
2. If the links are being opened: are the leads reading the content (this can be referenced via active time spent on the page)
3: If the reading is happening: are the leads intrigued to explore deeper (either via link clicks or visiting next pages)

Therefore: Link Opens, Active Time Spent on Pages, Navigating to Next Pages, CTA Clicks for External Links or Form Submission

## Context

A project links looks like `https://www.pitchlikethis.com/project/{project_uuid}`. Each project has only a single link - however the campaign that is loaded depends on the currently set 'Active Camapign'. Hence, same link can load different campaigns. However, the project links do not contain and campaign identification parameters.

When a user clicks on the project link - the user/browser if does not have an exisiting auth cookie, is authenticated as an anonymous user using JWT Fingerprinting. All authenticated users are identified through a UUID in our database.

Note: For tracking or analytics purposes, we should not rely on jwt fingerprinting - we can use the identity of the user as an anchor for our analytics given the analytics is a separate mechanism.

## Engineering Mechanism

Project Links can be publicly shared with a wide number of anonymous user, which are our potential leads.

Every time a link is clicked, it opens in the lead's browser and starts loading the pages. And in the background it also starts authenticating the user anonymously.

### What is a Session

We categorise a Session as a continuous stream of events for a specific Campaign AND for a specific User with less than 30 minutes of inactivity between each event. If the Active Campaign is switched for a particular project - then we should start a new session. If the User changes, start a new session. Otherwise keep the same session until the session expires due to inactivity.

User FK = get user from client
Campaign FK = currently active campaign for project uuid

**Session flag ENUMS:**
Default flags for all sessions when created as "New Session". The flags are overwritten based on following rules:
1. "Actual Session": Sessions with time spent more than 10 seconds (filters bots and accidental clicks)
2. "Engaged Session": Should be an Actual Session with atleast one Page Navigation or Click Events

**Updating Session Flags**
- A session is created with New Session as default flag
- As the analytics data is processed for the session, a security definer should update the session to next flag when triggered. Which might be "Actual Session" which then may or may not progress to "Engaged Session"

### STAR Schema for Database Architecture

The Identity, Sessions and Events tables are separate.
1. We already have `auth.users` recording all the anonymous users with their uuid
2. `internal.sessions`:
```
session id PK
user id FK nullable
project id FK
campign id FK nullable
started at ts
ended at ts
active_time_spent (cumulative heartbeat pings received from worker)
user agent hash
session flag ENUM
```
3. `internal.events`:
```
event id PK
session id FK
event type ENUM
metadata jsonb nullable
timestamp
```

**Event Types ENUM**
1. Link Open
2. Button Click

**Metadata for Button Click event type:** Do not track any metadata anything apart from this
1. page navigation: step1/step2/step3
2. button name or text (Service Name Buttons example: 'Product Management', Connect, Submit, Send an Email)
3. external link (outpbound)

Which Schema to Use?
Use the `internal` schema to create tables related to the analytics. Note that the User IDs will be in the `public` schema and hence will have to be mapped as FK from a foreign schema. The `public` schema can expose a View with Security Invoker so that the RLS policies apply - this would help client fetch the analytics data when the owner requests.

### System Architecture

Lead = anonymous user viewing the campaing pages
User = the owner who created the campaign and wants to track the data

1. Lead -> Client App: Lead clicks on the Pitch Link and the browser loads it
2. Client App -> public POST /session API -> internal DB: Create a UNIQUE Session and Initial Event post page load. Fetch and update Campaign ID. Update User ID whenever available. API is rate limited
3. Lead -> Client App: Engages with the webpages.
4. Client App -> public POST /events API: Batches and buffers the events and sends them to backend. API is rate limited.
5. public POST /events API -> Event Queue (Upstash Redis Stream): BE validates all required data received before sending to the event queue. Retries twice and drops batch if multiple fails. Send 202 Accepted with accepted and rejected event counts.
6. Queue Worker (Supabase Edge Function) -> internal DB: Pulls the events, processes, dedups and write to DB.
7. User -> Client Dashboard/Studio: Fetch campaign analytics
8. Client Dashboard/Studio -> public GET /analytics API: Requests latest analytics with the campaign id param. Implement retries. Display data when received.
9. public GET /analytics API -> internal DB: Fetches the data via security invoker based on flags or as per requirement

### Tracking Link Opens
1. On DOMContentLoaded & document.visibilityState === 'visible', client generates the identifiers for sessions and events. Utilise UUIDv7 (time sortable).
2. Session is created synchronously via the /session API. Session ID stored as a secure cookie that expires after 30 mins. DB ensures idempotency via UNIQUE check.
- Determining the campaign id: detect if campaign id is null if yes, use the project id from the pitch link url to determine the "ACTIVE" campaign and its id and update it into the existing session table.
- Determining the user id: fetches the user ID of the current user session through get user method call. Retry incrementally if user ID not received or null.
3. Initial event 'link_open' is queued using the /events API. DB ensures idempotency via UNIQUE check.

### Tracking Button Clicks
1. Add HTML elements to the pitch related pages - add them dynamically as these pages are generated based on a template. Include data-track-id="element_name" and data-track-location="step1". There are three steps/pages in the pitch links identified by step 1 step 2 and step 3.
2. Setup a global listener to find the elements, extract metadata and capture them as events
3. Use MDN Beacons to tranmit these events. Implement ways to prevent duplicate events in case of special clicks.
4. Batch Transmit events from browser to avoid latency issues. Queue the events - use a serverless redis stream via UpStash. Worker should write events to database.
- Batch upto 50 to 60 events. Flush them every 30 to 60 seconds. Immediate flush when visibilitychange becomes hidden or pagehide is trigerred. Flush should maintain session id.
- Backend API /events should validate mandatory fields exist, types and payload size. Send them to event queue post validation.
- If queuing fails on 2 retries, drop the events batch and reprocess the next batch. Send a 202 Accepted. 
5. Create a Supabase Edge Function for Worker
- The worker should dedup and do other necessary tasks and write to the db.

### Tracking Time Spent
1. Implement hearbeat pings for every 30 second interval
2. Check for idle behaviour and cases like tab not focused, pause the pings so that we do not cumulate them as time spent
3. Fire the ping using beacon and wrap it in our activity logic
4. Cummulate the hearbeats for a session before recording data in the database: do not send individual pings to the database. Verify if a session exists -> Update and Increment the session -> Check for session expiry. The Worker a Supbase Edge Function should increment before recording the total time spent in `internal.sessions` table.
5. If session expires, record the data for the previous and any overflow pings are cumulated under the new session.
6. Flush hearbeat: If user closes tab, this can be noted by a trigger like visibilityChange that can indicate when the tab goes out of focus - send a flush hearbeat when the tab goes hidden.

## User Requirements

1. In the Studio/Dashboard, divide the Campaign page into two sections, at top "Performance" and "Content". These would be the titles.
2. The Performance Section: An Owner of the Campaign visiting the Campaign Page (in their dashboard) should be able to see three cards at the top of the page that displays "Total Actual Sessions", "Total Engaged Sessions", and "Total Time Spent" 
- Total Actual Sessions are Sessions with flag Actual Sessions
- Total Engaged Sessions are Sessiosn with flag Engaged Sessions
- Total Time Spent is cummulative time spent by all users on actively viewing the camapign 
3. Add a "Refresh" button inline Performance section. On click refresh to the latest analytics data for that campaign.
4. The "Switch Campaign" or "Make Active" button should be inline positioned in the Content section.
5. Draft Campaigns will not have a Performance section as they have never been Active. While a Paused campaign indicates its previously been active and hence should show its Performance data.
6. Only the owner of the campaign should be able to view the analytics data for that campaign.