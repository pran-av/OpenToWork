# PLT Agent Service – API Documentation for Client

**Base URL:** `https://<agent-service-host>/api/v1`  
**Version:** 2.1.0

---

## 1. Authentication

All endpoints below (except health) require a valid **JWT** in the `Authorization` header:

```http
Authorization: Bearer <JWT_ACCESS_TOKEN>
```

- **Algorithm:** RS256 (asymmetric)
- **Validation:** Agent Service validates the token against the configured JWKS URL and checks `audience` and `issuer`.
- **User identification:** User ID is taken from the configured claim (default: `sub`) and used for scoping all resources.

**Responses:**
- `401 Unauthorized` – Missing or invalid token, or invalid JWT format.

---

## 2. System

### Health check (no auth)

```http
GET /health
```

**Response:** `200 OK`

```json
{ "status": "ok" }
```

---

## 3. Tasks

### Create resume scoring task

Creates a resume–JD scoring task and enqueues it for async processing. Client receives a `task_id` and can poll status or subscribe via WebSocket (see WebSocket section).

```http
POST /api/v1/tasks/resume-scoring
Content-Type: application/json
Authorization: Bearer <token>
```

**Request body:**

| Field           | Type   | Required | Description |
|----------------|--------|----------|-------------|
| `jd_source_type` | string | Yes      | `"url"` or `"paste"` |
| `jd_url`       | string | No       | JD URL when `jd_source_type` is `"url"` |
| `jd_text`      | string | No       | Raw JD text when `jd_source_type` is `"paste"` |
| `resume_id`    | string (UUID) | No  | Resume to score; if omitted, default resume is used |

**Example (paste):**

```json
{
  "jd_source_type": "paste",
  "jd_text": "Senior Product Manager. 5+ years... Python, AWS."
}
```

**Example (URL):**

```json
{
  "jd_source_type": "url",
  "jd_url": "https://jobs.example.com/listing/123"
}
```

**Response:** `202 Accepted`

```json
{
  "task_id": "uuid",
  "task_type": "resume_scoring",
  "status": "queued"
}
```

---

### Get task status

```http
GET /api/v1/tasks/{task_id}
Authorization: Bearer <token>
```

**Response:** `200 OK`

```json
{
  "task_id": "uuid",
  "task_type": "resume_scoring",
  "status": "queued | in_progress | completed | failed | cancelled",
  "created_at": "ISO8601",
  "started_at": "ISO8601 | null",
  "completed_at": "ISO8601 | null"
}
```

**Errors:** `400` (invalid `task_id`), `404` (task not found or not owned by user).

---

## 4. Resume scoring reports

### Get scoring report

Returns report metadata for a completed score (e.g. after task status is `completed`). Full report PDF is available via the report URL stored with the score (see notifications / task response).

```http
GET /api/v1/resume-scoring/reports/{score_id}
Authorization: Bearer <token>
```

**Response:** `200 OK`

```json
{
  "score_id": "uuid",
  "task_id": "uuid",
  "resume_id": "uuid",
  "jd_id": "uuid",
  "final_score": 78.5,
  "score_bucket": "good",
  "computed_at": "ISO8601",
  "status": "ready"
}
```

**Errors:** `400` (invalid `score_id`), `404` (score not found).

---

## 5. Resumes

### Upload resume

Upload a PDF resume; it is parsed, chunked, and vectorized.

```http
POST /api/v1/resumes/upload
Content-Type: multipart/form-data
Authorization: Bearer <token>
```

**Form fields:**

| Field          | Type   | Required | Description |
|----------------|--------|----------|-------------|
| `file`         | file   | Yes      | PDF file |
| `resume_name`  | string | No       | Display name; defaults to filename |

**Response:** `201 Created`

```json
{
  "resume_id": "uuid",
  "resume_name": "My Resume",
  "status": "ingested",
  "message": "Resume uploaded and processed successfully"
}
```

**Errors:** `400` (e.g. not a PDF).

---

### List resumes

```http
GET /api/v1/resumes/?include_inactive=false
Authorization: Bearer <token>
```

**Query:** `include_inactive` (boolean, default `false`) – include soft-deleted/inactive resumes.

**Response:** `200 OK`

```json
{
  "resumes": [
    {
      "id": "uuid",
      "resume_name": "string",
      "file_name": "string",
      "storage_url": "string",
      "pages": 2,
      "is_active_for_context": true,
      "created_at": "ISO8601"
    }
  ],
  "total": 1
}
```

---

### Get resume

```http
GET /api/v1/resumes/{resume_id}
Authorization: Bearer <token>
```

**Response:** `200 OK` – single resume object (same shape as list items).  
**Errors:** `400`, `404`.

---

### Update resume

Update display name or active-for-context flag.

```http
PATCH /api/v1/resumes/{resume_id}
Content-Type: application/json
Authorization: Bearer <token>
```

**Body:** `{ "resume_name": "string?", "is_active_for_context": boolean? }`

**Response:** `200 OK` – updated resume object.  
**Errors:** `400`, `404`.

---

### Delete resume (soft)

Resume and its vectors are kept but marked inactive/deleted.

```http
DELETE /api/v1/resumes/{resume_id}
Authorization: Bearer <token>
```

**Response:** `200 OK` – `{ "success": true, "message": "..." }`.  
**Errors:** `400`, `404`.

---

## 6. Job descriptions

### Update JD applied outcome

Record outcome for a JD (e.g. applied, interviewed, rejected).

```http
PATCH /api/v1/job-descriptions/{jd_id}/outcome
Content-Type: application/json
Authorization: Bearer <token>
```

**Body:**

```json
{ "applied_outcome": "applied | interviewed | rejected | offer_received | ..." }
```

**Response:** `200 OK` – `{ "success": true, "jd_id": "...", "applied_outcome": "..." }`.  
**Errors:** `400`, `404`.

---

### Get JD details

```http
GET /api/v1/job-descriptions/{jd_id}
Authorization: Bearer <token>
```

**Response:** `200 OK`

```json
{
  "id": "uuid",
  "role_title": "string",
  "company_name": "string",
  "location": "string",
  "role_archetype": "string",
  "seniority": "string",
  "company_context": "string",
  "applied_outcome": "string | null",
  "created_at": "ISO8601"
}
```

**Errors:** `400`, `404`.

---

## 7. Onboarding (server-led, v2 only)

Onboarding is **not** exposed under `/api/v1/onboarding` anymore. Use **Flows v2** (`POST /api/v2/flows/start` with `flow_type: "ONBOARDING"`).

- **Sage copy** for the first server steps is returned under `flow_instance.sage_messages` (markdown strings keyed by `step_key`). The server completes `introduce_sage_objectives` and `introduce_app_brief` immediately after the flow is created.
- **Client work** is driven by `ui_actions` on step `execute_onboarding_todos`: acknowledge each with `POST /api/v2/flows/{id}/ui-actions/ack` or `.../nack` (see §7A).
- **Closing** runs when all those UI actions are done or skipped (execute step auto-completes) or when the client skips the execute step via step ACK; the server then appends the summary message and may mark the flow `FLOW_COMPLETED`.

Optional `conversation_id` on start links the flow row to an existing Sage conversation id for correlation only.

---

## 7A. Flows v2 (Breaking, versioned)

`v2` introduces generalized server-led flows and is the preferred contract for new clients.

### Start flow

```http
POST /api/v2/flows/start
Content-Type: application/json
Authorization: Bearer <token>
```

```json
{
  "flow_type": "ONBOARDING",
  "conversation_id": "uuid-or-null"
}
```

### Get flow

```http
GET /api/v2/flows/{flow_instance_id}
Authorization: Bearer <token>
```

### List flows

```http
GET /api/v2/flows?status=FLOW_ACTIVE&type=ONBOARDING
Authorization: Bearer <token>
```

### Acknowledge step

```http
POST /api/v2/flows/{flow_instance_id}/steps/{step_key}/ack
Content-Type: application/json
Authorization: Bearer <token>
```

```json
{ "state": "STEP_DONE" }
```

### Acknowledge UI action

```http
POST /api/v2/flows/{flow_instance_id}/ui-actions/ack
POST /api/v2/flows/{flow_instance_id}/ui-actions/nack
Content-Type: application/json
Authorization: Bearer <token>
```

```json
{
  "target": "nav.experience_dashboard",
  "state": "STEP_DONE",
  "metadata": { "source": "client" }
}
```

### Complete flow

```http
POST /api/v2/flows/{flow_instance_id}/complete
Authorization: Bearer <token>
```

### v2 response envelope

All `v2` flow endpoints return:

```json
{
  "flow_instance": {
    "id": "uuid",
    "flow_type": "ONBOARDING",
    "flow_key": "onboarding_v2",
    "state": "FLOW_ACTIVE | FLOW_COMPLETED | FLOW_ABANDONED",
    "conversation_id": "uuid | null",
    "started_at": "ISO8601",
    "expires_at": "ISO8601 | null",
    "ended_at": "ISO8601 | null",
    "sage_messages": [
      {
        "step_key": "introduce_sage_objectives",
        "role": "sage",
        "content": "markdown",
        "created_at": "ISO8601"
      }
    ]
  },
  "steps": [
    {
      "step_key": "introduce_sage_objectives",
      "actor_type": "SERVER | CLIENT | USER",
      "state": "STEP_ISSUED | STEP_DONE | STEP_SKIPPED",
      "is_skippable": true
    }
  ],
  "ui_actions": [
    {
      "target": "nav.experience_dashboard",
      "tooltip": "Visit Experience Canvas",
      "message": "Experience canvas is your timeline of work and achievements.",
      "state": "STEP_ISSUED | STEP_DONE | STEP_SKIPPED",
      "is_skippable": true,
      "parent_action_id": null
    }
  ],
  "progress": {
    "completed_count": 0,
    "pending_count": 0,
    "percent": 0,
    "blocking_items": []
  }
}
```

Migration note:
- Legacy `/api/v1/onboarding/*` chat onboarding has been removed; onboarding is **v2 flows only**.

---

## 8. Notifications

### List notifications

```http
GET /api/v1/notifications/?unread_only=false&limit=50
Authorization: Bearer <token>
```

**Query:** `unread_only` (boolean), `limit` (1–100).

**Response:** `200 OK`

```json
{
  "notifications": [
    {
      "id": 1,
      "type": "task_completed | task_started | task_failed | report_ready",
      "task_id": "uuid | null",
      "payload": {},
      "read_at": "ISO8601 | null",
      "created_at": "ISO8601"
    }
  ],
  "total": 1
}
```

---

### Mark notification read

```http
POST /api/v1/notifications/{notification_id}/read
Authorization: Bearer <token>
```

**Response:** `200 OK` – `{ "success": true, "notification_id": 1 }`.  
**Errors:** `404`.

---

### Mark all notifications read

```http
POST /api/v1/notifications/read-all
Authorization: Bearer <token>
```

**Response:** `200 OK` – `{ "success": true, "marked_read": 5 }`.

---

## 9. Profiles

### Get my profile

```http
GET /api/v1/profiles/me
Authorization: Bearer <token>
```

**Response:** `200 OK`

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "user_type": "job_applicant | freelancer | sales_person",
  "current_version": 1,
  "experience_summary": "string | null",
  "goals_summary": "string | null",
  "references_json": {} | null,
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

**Errors:** `404` if profile not found (e.g. onboarding not completed).

---

### Update my profile

```http
PATCH /api/v1/profiles/me
Content-Type: application/json
Authorization: Bearer <token>
```

**Body:** `{ "experience_summary": "string?", "goals_summary": "string?", "references_json": {}? }`

**Response:** `200 OK` – updated profile object.  
**Errors:** `404`, `500`.

---

## 10. WebSocket requirements (for client implementation)

The PRD specifies that **task status is communicated live back to the Client App using a WebSocket**. The Agent Service currently does **not** expose a WebSocket endpoint. The following is the **recommended contract** for the client and for a future WebSocket implementation.

### 10.1 Client responsibilities

- **Connect:** Establish a WebSocket connection to the Agent Service (or to a BFF that proxies to the service) after the user is authenticated.
- **Authenticate:** Send authentication (e.g. JWT in first message or query param) so the server can associate the connection with a user.
- **Subscribe to task updates:** After creating a task (e.g. `POST /api/v1/tasks/resume-scoring`), the client should listen for status updates for that `task_id` until terminal state (`completed`, `failed`, `cancelled`).
- **Handle events:** On `task_completed` or `report_ready`, the client can fetch the report (e.g. via `GET /api/v1/resume-scoring/reports/{score_id}` or the report URL in the notification payload) and refresh the UI.
- **Reconnect:** Implement reconnect and backoff if the WebSocket drops; use polling of `GET /api/v1/tasks/{task_id}` as fallback when WebSocket is unavailable.

### 10.2 Recommended WebSocket API (to be implemented)

- **Endpoint (example):** `wss://<agent-service-host>/ws/tasks` or `wss://<agent-service-host>/api/v1/ws`.
- **Authentication:** Query param `token=<JWT>` or first message `{ "type": "auth", "token": "<JWT>" }`.
- **Server → Client message shape (example):**

```json
{
  "type": "task_status",
  "task_id": "uuid",
  "status": "queued | in_progress | completed | failed | cancelled",
  "payload": {}
}
```

For `completed` resume_scoring tasks, `payload` could include `score_id` and optionally `report_pdf_url` (or signed URL) for immediate download.

- **Optional client → server:** `{ "type": "subscribe", "task_id": "uuid" }` if the server supports explicit subscription; otherwise server may push all task updates for the authenticated user.

### 10.3 Current workaround

Until a WebSocket endpoint is available, the client should:

1. **Poll** `GET /api/v1/tasks/{task_id}` at an interval (e.g. every 2–5 seconds) after creating a task.
2. **Poll** `GET /api/v1/notifications/?unread_only=true` to discover task completion and report-ready events.
3. Use **report_ready** notification payload (e.g. `score_id`, `report_url`) to fetch or display the report.

---

## 11. Error responses

- **400 Bad Request** – Invalid input (e.g. invalid UUID, missing required field).
- **401 Unauthorized** – Missing or invalid JWT.
- **404 Not Found** – Resource not found or not owned by the current user.
- **500 Internal Server Error** – Server error (e.g. DB, external service).

Error body shape (typical):

```json
{ "detail": "string or list of errors" }
```

---

## 12. OpenAPI / Swagger

Interactive docs are available at:

- **Swagger UI:** `GET /docs`
- **ReDoc:** `GET /redoc`

These reflect the same base URL and require a valid JWT for protected endpoints (use “Authorize” and paste the Bearer token).
