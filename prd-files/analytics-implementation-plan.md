# Analytics Implementation Plan

## Clarifying Questions

### 1. UUIDv7 Library
- **Question**: The PRD mentions using UUIDv7 (time sortable). Should we use a library like `uuidv7` npm package, or implement a custom solution?
- **Recommendation**: Use `@paralleldrive/cuid2` or `uuid` with v7 support if available, or implement custom UUIDv7 generator

Use import { v7 as uuidv7 } from 'npm:uuid';

### 2. Upstash Redis Client
- **Question**: Which Upstash Redis client should we use? `@upstash/redis` for REST API or `@upstash/redis-streams` for streams?
- **Recommendation**: Use `@upstash/redis` for REST API (compatible with serverless) and Redis Streams commands

Go as per recommendation

### 3. Rate Limiting
- **Question**: What rate limits should we implement for `/session` and `/events` APIs? (e.g., requests per minute/IP)
- **Recommendation**: 
  - `/session`: 10 requests per minute per IP
  - `/events`: 100 requests per minute per IP

For Sessions: fixed window 5 per min per IP
For Events: sliding window 50 per 10 seconds per IP

### 4. Session Cookie Expiration
- **Question**: PRD mentions 30-minute session expiration, but cookie should expire after 30 mins. Should the cookie expiration match session expiration exactly?
- **Recommendation**: Cookie expires in 30 minutes, session expires after 30 minutes of inactivity

The cookie itself is a session id, hence they should expore together

### 5. User Agent Hash
- **Question**: How should we hash the user agent? SHA-256? Should we store full hash or truncated?
- **Recommendation**: SHA-256 hash, store full hash (64 chars hex)

Go ahead with recommendation

### 6. Session Flag Updates
- **Question**: The PRD mentions a "security definer" should update session flags. Should this be:
  - A database trigger/function that runs automatically?
  - Part of the Edge Function worker that processes events?
  - A separate scheduled job?
- **Recommendation**: Update flags in the Edge Function worker when processing events/heartbeats

Go ahead with the recommendation

### 7. Analytics View/API Security
- **Question**: PRD mentions creating a View with Security Invoker. Should we:
  - Create a view in `public` schema that queries `internal` tables?
  - Use RPC functions with SECURITY DEFINER?
  - Use RLS policies on the view?
- **Recommendation**: Create RPC functions in `public` schema with SECURITY DEFINER that query `internal` tables, with RLS checks for campaign ownership

Since we only require read and under ownership - Create a view in `public` schema that queries `internal` tables for sessions and events

### 8. Heartbeat Accumulation
- **Question**: PRD says "cumulate heartbeats before recording" - should we:
  - Accumulate in Redis before sending to worker?
  - Accumulate in worker before writing to DB?
  - Both?
- **Recommendation**: Accumulate in client (send every 30s), worker processes and increments `active_time_spent` in DB

The hearbeats should increment in the worker before being sent per session to the database. The Redis will simply record all the hearbeats as a queue. The client is already sending events in batches to ensure good latency.

### 9. Edge Function Deployment
- **Question**: Should the Edge Function be deployed via Supabase CLI or manually? What's the preferred structure?
- **Recommendation**: Create in `supabase/functions/analytics-worker/` directory

Yes simply create in the recommended directory. I will manually deploy the function.

### 10. External Link Detection
- **Question**: For button click events with "external link (outbound)", should we:
  - Detect if link href starts with `http://` or `https://` and is not same origin?
  - Use a specific attribute like `data-track-external="true"`?
- **Recommendation**: Auto-detect external links (different origin) + allow manual override via `data-track-external`

Go as per recommendation

### 11. Page Navigation Events
- **Question**: The PRD mentions "Page Navigation" as an event type, but only lists "Link Open" and "Button Click" in Event Types ENUM. Should we:
  - Add "Page Navigation" as a separate event type?
  - Track navigation as part of button clicks (when navigating between steps)?
- **Recommendation**: Track navigation as button click events with metadata `page_navigation: "step1" -> "step2"`

page navigation itself is as well a button click. When user clicks on a Service Button they go to step 2, when they click on Connect they go to step 3. Hence we can keep the type as button click and record the metadata to highlight the step in these events

### 12. Campaign ID Resolution
- **Question**: When session is created, if campaign_id is null, we fetch active campaign. What if:
  - Campaign becomes ACTIVE after session starts?
  - Campaign is switched while session is active?
- **Recommendation**: Update session campaign_id when it becomes available, but don't change it mid-session (start new session if campaign changes)

If User or Campaign changes - a new sessions should start

### 13. Deduplication Strategy
- **Question**: How should the worker deduplicate events? By event_id? By (session_id, event_type, timestamp, metadata hash)?
- **Recommendation**: Use UNIQUE constraint on (session_id, event_id) in events table, worker checks before insert

Go ahead with recommendation

### 14. Analytics Refresh
- **Question**: The PRD mentions a "Refresh" button. Should this:
  - Poll the API every X seconds?
  - Manually trigger on button click?
  - Use real-time subscriptions?
- **Recommendation**: Manual refresh on button click, with loading state

Go as per recommendation

### 15. Time Spent Calculation
- **Question**: "Total Time Spent" - should this be:
  - Sum of all `active_time_spent` for all sessions?
  - Only for "Actual Sessions" or "Engaged Sessions"?
- **Recommendation**: Sum of `active_time_spent` for all sessions with flag "Actual Session" or "Engaged Session"

For all session on that particular campaign

---

## Implementation Plan

### Phase 1: Database Schema

#### 1.1 Create Internal Schema Tables Migration
**File**: `supabase/migrations/YYYYMMDDHHMMSS_create_analytics_schema.sql`

**Tables to create:**
- `internal.sessions`:
  - `session_id` UUID PRIMARY KEY
  - `user_id` UUID REFERENCES auth.users(id) NULLABLE
  - `project_id` UUID REFERENCES public.projects(project_id) NOT NULL
  - `campaign_id` UUID REFERENCES public.campaigns(campaign_id) NULLABLE
  - `started_at` TIMESTAMPTZ NOT NULL
  - `ended_at` TIMESTAMPTZ NULLABLE
  - `active_time_spent` INTEGER DEFAULT 0 (seconds)
  - `user_agent_hash` TEXT NULLABLE
  - `session_flag` ENUM('new_session', 'actual_session', 'engaged_session') DEFAULT 'new_session'
  - `created_at` TIMESTAMPTZ DEFAULT NOW()
  - `updated_at` TIMESTAMPTZ DEFAULT NOW()
  - UNIQUE constraint on (session_id)

- `internal.events`:
  - `event_id` UUID PRIMARY KEY
  - `session_id` UUID REFERENCES internal.sessions(session_id) NOT NULL
  - `event_type` ENUM('link_open', 'button_click') NOT NULL 
  - `metadata` JSONB NULLABLE
  - `timestamp` TIMESTAMPTZ NOT NULL
  - `created_at` TIMESTAMPTZ DEFAULT NOW()
  - UNIQUE constraint on (session_id, event_id)

- Create ENUM types:
  - `internal.session_flag_enum`
  - `internal.event_type_enum`

- Create indexes:
  - `internal.sessions(campaign_id, session_flag)`
  - `internal.sessions(project_id)`
  - `internal.events(session_id)`
  - `internal.events(timestamp)`

#### 1.2 Create Security Definer Functions 
**File**: `supabase/migrations/YYYYMMDDHHMMSS_create_analytics_functions.sql`

**Functions to create:**
- `internal.update_session_flag(session_id UUID, new_flag internal.session_flag_enum)` // This is to be merged with Worker as per above answers
  - Updates session flag if conditions are met
  - Security definer function

- `internal.get_active_campaign_for_project(project_id UUID)` // There is already existing security definer named get_active_campaign_by_project, reuse
  - Returns active campaign_id for a project
  - Security definer function

- `public.get_campaign_analytics(campaign_id UUID)`
  - Returns analytics data for a campaign
  - Checks ownership via RLS
  - Security invoker function
  - Returns: total_actual_sessions, total_engaged_sessions, total_time_spent

- `public.check_campaign_ownership(campaign_id UUID)`
  - Checks if current user owns the campaign
  - Security invoker function

#### 1.3 Create Views (if needed)
- Consider creating a view `public.campaign_analytics_view` that joins internal tables
- Apply RLS policies for campaign ownership

---

### Phase 2: Client-Side Tracking

#### 2.1 Install Dependencies
```bash
pnpm add @upstash/redis uuid
pnpm add -D @types/uuid
```

#### 2.2 Create Tracking Utilities
**File**: `lib/utils/analytics-tracker.ts`

**Functions:**
- `generateUUIDv7()` - Generate time-sortable UUID
- `hashUserAgent(ua: string)` - Hash user agent
- `createSession(projectId: string)` - Create session via API
- `trackEvent(eventType, metadata)` - Queue event for batching
- `sendEventBatch()` - Send batched events
- `startHeartbeat(sessionId: string)` - Start heartbeat pings
- `stopHeartbeat()` - Stop heartbeat pings

**Features:**
- Event batching (50-60 events, flush every 30-60s)
- Immediate flush on `visibilitychange` hidden or `pagehide`
- Heartbeat every 30 seconds (paused when tab not focused)
- Session cookie management (30 min expiration)
- Deduplication prevention

#### 2.3 Create Tracking Hook
**File**: `hooks/useAnalytics.ts`

**Features:**
- Initialize tracking on mount
- Handle session creation
- Manage event queue
- Handle heartbeat
- Cleanup on unmount

#### 2.4 Add Tracking Attributes to Components
**Files to modify:**
- `components/campaign/ClientSummaryPage.tsx` - Add `data-track-id` and `data-track-location="step1"`
- `components/campaign/RelevantWorkPage.tsx` - Add `data-track-id` and `data-track-location="step2"`
- `components/campaign/CallToActionPage.tsx` - Add `data-track-id` and `data-track-location="step3"`

**Attributes to add:**
- `data-track-id="element_name"`
- `data-track-location="step1|step2|step3"`
- `data-track-external="true"` (for external links)

#### 2.5 Create Global Event Listener
**File**: `lib/utils/analytics-listener.ts`

**Features:**
- Global click listener
- Extract tracking attributes
- Detect external links
- Prevent duplicate events
- Queue events for batching

#### 2.6 Integrate Tracking in Campaign Flow
**File**: `app/campaign/[id]/CampaignFlowClient.tsx` (modify)

**Changes:**
- Import and initialize `useAnalytics` hook
- Pass projectId and campaignId to hook
- Ensure tracking starts after DOMContentLoaded and visibility check

---

### Phase 3: API Routes

#### 3.1 POST /api/analytics/session
**File**: `app/api/analytics/session/route.ts`

**Features:**
- Rate limiting (10 req/min per IP)
- Validate project_id
- Create session in `internal.sessions`
- Resolve campaign_id if null (fetch active campaign)
- Resolve user_id from session (retry if null)
- Store session_id in secure cookie (30 min expiration)
- Return session_id

**Request:**
```typescript
{
  project_id: string;
  user_agent_hash?: string;
}
```

**Response:**
```typescript
{
  session_id: string;
  campaign_id: string | null;
}
```

#### 3.2 POST /api/analytics/events
**File**: `app/api/analytics/events/route.ts`

**Features:**
- Rate limiting (100 req/min per IP)
- Validate batch payload (max 60 events)
- Validate required fields (session_id, event_type, event_id, timestamp)
- Validate payload size
- Send to Upstash Redis Stream
- Retry twice on failure
- Return 200 if success or 202 Accepted for partial success with accepted/rejected counts

**Request:**
```typescript
{
  session_id: string;
  events: Array<{
    event_id: string;
    event_type: 'link_open' | 'button_click';
    metadata?: {
      page_navigation?: string;
      button_name?: string;
      external_link?: string;
    };
    timestamp: string;
  }>;
}
```

**Response:**
```typescript
{
  accepted: number;
  rejected: number;
}
```

#### 3.3 POST /api/analytics/heartbeat
**File**: `app/api/analytics/heartbeat/route.ts`

**Features:**
- Rate limiting (per session)
- Validate session_id exists
- Send to Redis Stream for worker processing
- Return 202 Accepted

**Request:**
```typescript
{
  session_id: string;
  time_increment: number; // seconds (typically 30)
}
```

#### 3.4 GET /api/analytics/[campaignId]
**File**: `app/api/analytics/[campaignId]/route.ts`

**Features:**
- Authenticate user (must be campaign owner)
- Call `public.get_campaign_analytics(campaign_id)`
- Return analytics data

**Response:**
```typescript
{
  total_actual_sessions: number;
  total_engaged_sessions: number;
  total_time_spent: number; // seconds
}
```

---

### Phase 4: Upstash Redis Integration

#### 4.1 Create Redis Client Utility
**File**: `lib/utils/redis-client.ts`

**Features:**
- Initialize Upstash Redis client
- Use `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
- Stream operations (XADD, XREAD, XACK)

#### 4.2 Redis Stream Structure
- Stream name: `analytics:events`
- Stream name: `analytics:heartbeats`
- Message format:
  ```json
  {
    "session_id": "uuid",
    "event_id": "uuid",
    "event_type": "link_open" | "button_click",
    "metadata": {},
    "timestamp": "ISO string"
  }
  ```

---

### Phase 5: Supabase Edge Function Worker

#### 5.1 Create Edge Function
**Directory**: `supabase/functions/analytics-worker/`

**File**: `supabase/functions/analytics-worker/index.ts`

**Features:**
- Poll Redis Streams for events and heartbeats
- Deduplicate events (check UNIQUE constraint)
- Process events:
  - Insert into `internal.events`
  - Update session flags (new -> actual -> engaged)
- Process heartbeats:
  - Increment `active_time_spent` in session
  - Check session expiration (30 min inactivity)
  - Update session flags
- Acknowledge processed messages
- Error handling and retries

**Configuration:**
- Set environment variables for Upstash Redis
- Set Supabase service role key for internal schema access

---

### Phase 6: Dashboard Analytics UI

#### 6.1 Create Analytics Components
**File**: `components/dashboard/AnalyticsCards.tsx`

**Features:**
- Display three cards:
  - Total Actual Sessions
  - Total Engaged Sessions
  - Total Time Spent (formatted as hours/minutes)
- Loading states
- Error states

#### 6.2 Create Analytics Hook
**File**: `hooks/useCampaignAnalytics.ts`

**Features:**
- Fetch analytics data
- Refresh functionality
- Loading/error states
- Retry logic

#### 6.3 Update Campaign Overview Page
**File**: `app/dashboard/projects/[projectId]/campaigns/[campaignId]/CampaignOverviewClient.tsx`

**Changes:**
- Add "Performance" section at top
- Add "Content" section below
- Show analytics cards for ACTIVE/PAUSED campaigns
- Hide analytics for DRAFT campaigns
- Add "Refresh" button in Performance section
- Move "Switch Campaign" button to Content section

---

### Phase 7: Testing & Validation

#### 7.1 Test Scenarios
- Session creation and cookie management
- Event batching and flushing
- Heartbeat accumulation
- Session flag updates
- Campaign ID resolution
- User ID resolution
- Rate limiting
- Deduplication
- Analytics data accuracy
- Dashboard refresh

#### 7.2 Edge Cases
- Multiple tabs (same session)
- Tab switching (pause/resume heartbeat)
- Network failures (retry logic)
- Session expiration
- Campaign switching mid-session
- Bot detection (10 second filter)

---

## Dependencies to Add

```json
{
  "dependencies": {
    "@upstash/redis": "^1.0.0",
    "uuid": "^10.0.0"
  },
  "devDependencies": {
    "@types/uuid": "^10.0.0"
  }
}
```

---

## Environment Variables Required

```env
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

---

## File Structure

```
OpenToWork/
├── app/
│   ├── api/
│   │   └── analytics/
│   │       ├── session/
│   │       │   └── route.ts
│   │       ├── events/
│   │       │   └── route.ts
│   │       ├── heartbeat/
│   │       │   └── route.ts
│   │       └── [campaignId]/
│   │           └── route.ts
├── lib/
│   └── utils/
│       ├── analytics-tracker.ts
│       ├── analytics-listener.ts
│       └── redis-client.ts
├── hooks/
│   ├── useAnalytics.ts
│   └── useCampaignAnalytics.ts
├── components/
│   ├── campaign/
│   │   ├── ClientSummaryPage.tsx (modify)
│   │   ├── RelevantWorkPage.tsx (modify)
│   │   └── CallToActionPage.tsx (modify)
│   └── dashboard/
│       └── AnalyticsCards.tsx (new)
├── supabase/
│   ├── functions/
│   │   └── analytics-worker/
│   │       └── index.ts (new)
│   └── migrations/
│       ├── YYYYMMDDHHMMSS_create_analytics_schema.sql (new)
│       └── YYYYMMDDHHMMSS_create_analytics_functions.sql (new)
└── prd-files/
    └── analytics-implementation-plan.md (this file)
```

---

## Implementation Order

1. **Database Schema** (Phase 1) - Foundation
2. **Redis Client & API Routes** (Phase 3, 4) - Backend infrastructure
3. **Client-Side Tracking** (Phase 2) - Frontend tracking
4. **Edge Function Worker** (Phase 5) - Event processing
5. **Dashboard UI** (Phase 6) - Analytics display
6. **Testing** (Phase 7) - Validation

---

## Notes

- All analytics data is stored in `internal` schema for security
- Public API uses RPC functions with SECURITY DEFINER/INVOKER. Revoke public access to these APIs and keep search path as null.
- Session cookies are secure and httpOnly
- Events are batched to reduce API calls
- Heartbeats are accumulated client-side before sending // as per above answers the hearbeat is incremented only on worker end. The Redis simply stores the heartbeat until the worker increments and writes processed output to db. The client only does the job of collected, batching, biffering and sending to queue via the API
- Worker processes events asynchronously for performance
- Analytics only visible to campaign owners (RLS enforced). Ensure that RLS policies enclose the methods for one time fetch only `(select auth.uid()) = user_id`

