# Client deployment configuration (Pitch Like This ↔ Agent Service)

This document is for **web / mobile / desktop** apps that call the Agent Service in **production**. It complements `docs/API_DOCUMENTATION_FOR_CLIENT.md` (endpoint details).

---

## 1. Base URL

- [ ] Configure a single **Agent Service base URL** per environment (e.g. `https://agentservice.pitchlikethis.com/`).
- [ ] Client should call APIs as: `{BASE_URL}/api/v1/...` or `{BASE_URL}/api/v2/...`.
- Note: Some internal docs historically mention `/api/agent/v2/` — **the wired routers in `app/main.py` are `/api/v1` and `/api/v2`**. Align the client with the actual prefix your reverse proxy exposes (if you rewrite paths, document the mapping).

---

## 2. Authentication

- [ ] Send **`Authorization: Bearer <access_token>`** on protected routes (same JWT your IdP issues to users).
- [ ] IdP **`aud`**, **`iss`**, and signing keys (**JWKS**) must match what the Agent Service validates (`JWT_AUDIENCE`, `JWT_ISSUER`, `JWT_JWKS_URL` on the server).
- [ ] **`sub`** (or the claim configured via `JWT_USER_ID_CLAIM`) is the stable user id the server uses for flows, tasks, and storage ACLs.

If auth fails: expect **401**; do not persist partial onboarding state based on speculative IDs.

---

## 3. Onboarding (v2 flows) — behaviour the client must respect

Detailed step list remains in **`docs/CLIENT_ONBOARDING_IMPLEMENTATION.md`**. Deployment-relevant points:

### Idempotent `POST /api/v2/flows/start`

- [ ] Safe to call on **every app launch** without persisting **`flow_instance.id`** first.
- [ ] Inspect response:
  - **`flow_instance.state`** — `FLOW_ACTIVE` vs `FLOW_COMPLETED` vs `FLOW_ABANDONED`.
  - **`start_message`** (only on **start**, **ONBOARDING**): optional human-readable explanation when onboarding is already **completed** or **abandoned**; **`null`** for new/active resume.
- [ ] Persist **`flow_instance.id`** locally when possible for fewer round-trips (`GET /api/v2/flows/{id}`), but do not rely on it as strictly required after the server-side idempotent start change.

### “Back to Sage” / congrat steps

- [ ] Follow **`CLIENT_ONBOARDING_IMPLEMENTATION.md`**: **do not** mark **`execute_onboarding_todos`** as **`STEP_SKIPPED`** via step-ack for navigation back to Sage after Part 1/2; **`ack`** the congrats **`target`** appropriately.

### Completed onboarding UX

When **`start_message`** indicates completion (or **`flow_instance.state === FLOW_COMPLETED`**), gate first-run onboarding UI off and show whatever product experience you define (no second onboarding row will be created for that user by calling start again).

---

## 4. CORS / browser apps

This service’s **`FastAPI`** app (`app/main.py`) does **not** register **`CORSMiddleware`** by default. If the web client runs on another origin:

- [ ] Add CORS **on the Agent Service**, **or**
- [ ] Prefer: same-site BFF proxy so the browser only talks to your app domain (recommended for cookie-aware setups).

Mobile native apps bypass CORS; they still need TLS and correct **`BASE_URL`**.

---

## 5. Timeouts & retries

- [ ] Large uploads may go to **storage** URLs from your main app (`docs/API_DOCUMENTATION_FOR_CLIENT.md`), not necessarily through this service alone — align timeouts per product.
- [ ] Retry **GET idempotent reads** (`GET flow`, health) with backoff; retry **POST** only when documented idempotent (**onboarding start**) or safe per your UX.

---

## 6. Environment-specific client config (examples)

Typically stored in `.env`, build flavours, or remote config—not in repo:

| Client config key | Example | Purpose |
|-------------------|---------|--------|
| `AGENT_SERVICE_BASE_URL` | `https://agents.example.com` | All API prefixes. |
| `AGENT_SERVICE_API_PREFIX` | `/api` | Rarely needed if baked into BASE_URL path. |

Do **not** embed **`SUPABASE_SERVICE_KEY`** or database URLs in clients; reserve those for backend-only deployments.

---

## 7. When server moves infra (GCP Pub/Sub → AWS SQS)

**No client change** is required **if** URLs, JWT issuer, and response JSON contracts stay identical. Notify clients only if:

- Base URL changes, or  
- Breaking API version bumps (prefer new `/api/v3` rather than silently changing `/api/v2` semantics).

Workers (SQS) are invisible to typical HTTP clients unless you add webhook/push semantics later.

---

## 8. Support matrix reference

Keep this table aligned with QA:

| Env | BASE_URL source | Bearer token issuer |
|-----|----------------|---------------------|
| Dev | staging URL | staging IdP JWKS |
| Prod | prod URL | prod IdP JWKS |
