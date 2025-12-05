# Database Setup

## Supabase Project Details

- **Project Name**: OpenToWork
- **Region**: ap-south-1
- **Status**: ACTIVE_HEALTHY
- **PostgreSQL Version**: 17.6.1.054

> **Note**: Sensitive configuration data (Project ID, API Keys, Database URL) is stored in `.env` file. See `.env.example` for required environment variables.

## Database Tables Created

### 1. users
- Primary Key: `user_id` (UUID) - **Foreign Key from `auth.users.id`**
- Fields: user_first_name (nullable), user_last_name (nullable), user_email, is_email_verified, user_location (nullable), created_at, last_login_at, current_payment_plan (nullable, defaults to 'free' via trigger)
- Note: Using Supabase Auth (no password_hash stored)
- **Phase 2 Changes**:
  - `user_id` is a **Foreign Key from `auth.users.id`** - ensures 1:1 mapping
  - `user_first_name`, `user_last_name`, `user_location`, and `current_payment_plan` are now nullable
  - Auto-sync from `auth.users` via triggers:
    - `on_auth_user_created` - Handles new user creation and email-based duplicate detection
    - `on_auth_user_updated` - Syncs login events and email verification status
  - **Duplicate Prevention**: Checks by `user_email` first - if exists, updates instead of inserting
  - **Data Sync**: Automatically syncs `is_email_verified` and `last_login_at` from `auth.users`
  - Trigger sets `current_payment_plan = 'free'` for new users

### 2. projects
- Primary Key: `project_id` (UUID)
- Foreign Key: `user_id` → users.user_id
- Fields: project_name (50 char limit, unique per user), project_url (TEXT, unique, nullable), is_archived (BOOLEAN, default false), created_at
- **Phase 2 Changes**: 
  - Added `project_url`: Stores `/project/<project_id>` path, set when first campaign becomes ACTIVE
  - Added `is_archived`: Boolean flag, once TRUE cannot be set back to FALSE (enforced by trigger)
  - Unique constraint on `(user_id, project_name)` to prevent duplicate project names per user

### 3. campaigns
- Primary Key: `campaign_id` (UUID)
- Foreign Key: `project_id` → projects.project_id
- Fields: campaign_name (25 char), campaign_status (ENUM: DRAFT, ACTIVE, PAUSED), campaign_structure (JSONB), cta_config (JSONB), created_at
- JSONB Constraints: campaign_structure must have client_name (≤25 chars) and client_summary (≤400 chars)
- **Phase 2 Changes**:
  - Removed `slug` column (deprecated)
  - Removed `campaign_url` column (moved to project level)
  - `campaign_status` changed from VARCHAR to ENUM type (`campaign_status_enum`)
  - Default status is `DRAFT` (was 'active')
  - Partial unique index ensures only one `ACTIVE` campaign per project

### 4. client_services
- Primary Key: `client_service_id` (UUID)
- Foreign Key: `campaign_id` → campaigns.campaign_id
- Fields: client_service_name, order_index (default 0), created_at

### 5. case_studies
- Primary Key: `case_id` (UUID)
- Foreign Key: `client_service_id` → client_services.client_service_id
- Fields: case_name (75 char, required), case_summary (150 char, nullable), case_duration (nullable), case_highlights (TEXT, required), case_study_url (nullable), created_at

### 6. leads
- Primary Key: `lead_id` (UUID)
- Foreign Key: `campaign_id` → campaigns.campaign_id
- Fields: lead_name, lead_company, lead_email, lead_phone_isd, lead_phone, meeting_scheduled (default false), created_at

### 7. widgets
- Primary Key: `widget_id` (UUID)
- Foreign Key: `campaign_id` → campaigns.campaign_id
- Fields: widget_name (100 char), is_active (boolean), widget_text (25 char), design_attributes (JSONB), created_at
- JSONB Constraints: design_attributes must have asset_type, color_primary, color_secondary

## Migrations Applied

### Phase 1
1. `create_users_table` - Users table with email verification and payment plan
2. `create_projects_table` - Projects table linked to users
3. `create_campaigns_table` - Campaigns table with JSONB fields for structure and CTA config
4. `create_client_services_table` - Client services table linked to campaigns
5. `create_case_studies_table` - Case studies table linked to client services
6. `create_leads_table` - Leads table for capturing lead information
7. `create_widgets_table` - Widgets table with JSONB for design attributes

### Phase 2
1. `phase2_create_campaign_status_enum` - Created enum type and updated campaigns table
2. `phase2_add_project_fields` - Added project_url and is_archived to projects
3. `phase2_remove_campaign_url_fields` - Removed slug and campaign_url from campaigns
4. `phase2_unique_active_campaign_per_project` - Added partial unique index for one ACTIVE campaign per project
5. `phase2_create_campaign_functions` - Created publish_campaign, switch_campaign, archive_project, and is_campaign_publishable functions
6. `phase2_enable_rls_policies` - Enabled RLS and created policies for all tables
7. `phase2_prevent_unarchive_and_unique_project_name` - Added trigger to prevent unarchiving and unique constraint on project name per user
8. `phase2_auth_user_sync` - Created trigger to sync auth.users to public.users on INSERT
9. `phase2_improve_auth_user_sync` - Improved auth user sync with email-based duplicate detection and UPDATE trigger for login events
10. `phase2_make_case_study_fields_nullable` - Made case_summary, case_duration, and case_study_url nullable in case_studies table

## Indexes Created

### Phase 1
- `idx_users_email` on users(user_email)
- `idx_projects_user_id` on projects(user_id)
- `idx_campaigns_project_id` on campaigns(project_id)
- `idx_campaigns_status` on campaigns(campaign_status)
- `idx_client_services_campaign_id` on client_services(campaign_id)
- `idx_client_services_order` on client_services(campaign_id, order_index)
- `idx_case_studies_client_service_id` on case_studies(client_service_id)
- `idx_leads_campaign_id` on leads(campaign_id)
- `idx_leads_email` on leads(lead_email)
- `idx_leads_created_at` on leads(created_at)
- `idx_widgets_campaign_id` on widgets(campaign_id)
- `idx_widgets_is_active` on widgets(is_active)

### Phase 2
- `idx_campaigns_one_active_per_project` on campaigns(project_id) WHERE campaign_status = 'ACTIVE' (partial unique index)
- `idx_projects_user_name_unique` on projects(user_id, project_name) (unique per user)

## Database Functions

### Phase 2 Functions

1. **is_campaign_publishable(p_campaign_id UUID)**
   - Returns BOOLEAN
   - Checks if campaign has all mandatory fields:
     - client_name and client_summary in campaign_structure
     - At least one CTA in cta_config
     - At least one client_service
     - Each service has at least one case_study

2. **publish_campaign(p_project_id UUID, p_campaign_id UUID)**
   - Returns JSONB with success status
   - Publishes a DRAFT campaign to ACTIVE
   - Only works when no ACTIVE campaign exists for the project
   - Sets project_url if not already set
   - Validates campaign is publishable before activation

3. **switch_campaign(p_project_id UUID, p_target_campaign_id UUID)**
   - Returns JSONB with success status
   - Atomically switches from current ACTIVE to target campaign
   - Current ACTIVE becomes PAUSED, target becomes ACTIVE
   - Validates target is DRAFT or PAUSED and publishable

4. **archive_project(p_project_id UUID)**
   - Returns JSONB with success status
   - Archives a project (sets is_archived = TRUE)
   - Pauses all ACTIVE campaigns in the project
   - Once archived, project cannot be unarchived (enforced by trigger)

## Row Level Security (RLS)

**Status**: Enabled on all tables (Phase 2)

### Policy Strategy
- **Ownership Chain**: `auth.uid()` → `users.user_id` (FK from `auth.users.id`) → `projects.user_id` → `campaigns.project_id` → related tables
- **FK Mapping**: `public.users.user_id` is a Foreign Key from `auth.users.id`, ensuring 1:1 relationship
- **RLS Chain**: RLS policies use `auth.uid() = user_id`, which works because:
  - `auth.uid()` returns the authenticated user's ID from `auth.users.id`
  - `public.users.user_id` is the FK from `auth.users.id` (synced via trigger)
  - This creates a secure ownership chain from authentication to application data
  - **Verified**: RLS policies on `users` table use `auth.uid() = user_id`, correctly mapping authenticated user to public user record
- **Authenticated Users**: Can only see/manage their own data through the ownership chain
- **Public Access**: 
  - Anonymous users can SELECT ACTIVE campaigns for non-archived projects
  - Anonymous users can INSERT leads for ACTIVE campaigns in non-archived projects
  - Anonymous users can SELECT related data (services, case studies, widgets) for ACTIVE campaigns

### Tables with RLS Enabled
- users (select/update own) - Uses `auth.uid() = user_id` where `user_id` is FK from `auth.users.id`
- projects (select/insert/update/delete own) - **NOT publicly accessible**
- campaigns (select own + public active, insert/update/delete own)
- client_services (select own + public, insert/update/delete own)
- case_studies (select own + public, insert/update/delete own)
- widgets (select own + public, insert/update/delete own)
- leads (select own, insert public, update/delete own)

## Triggers

1. **trigger_prevent_unarchive** on projects
   - Prevents changing `is_archived` from TRUE to FALSE
   - Raises exception if unarchive attempt is made

2. **on_auth_user_created** on auth.users (AFTER INSERT)
   - Executes: `handle_new_auth_user()`
   - Syncs new auth users to `public.users` table
   - **FK Mapping**: `public.users.user_id` = `auth.users.id` (1:1 relationship)
   - **Duplicate Prevention**: 
     - Checks by `user_email` first - if exists, updates the record
     - Updates `user_id` to match `auth.users.id` (ensures FK consistency)
     - **Note**: If user exists by email with different `user_id`, the FK is updated to match `auth.users.id`
   - **Data Sync**: Sets `user_email`, `is_email_verified`, `last_login_at`, `current_payment_plan`
   - **RLS Integration**: RLS policies use `auth.uid() = user_id`, which works because `user_id` is FK from `auth.users.id`

3. **on_auth_user_updated** on auth.users (AFTER UPDATE)
   - Executes: `handle_auth_user_update()`
   - Syncs updates from auth.users (login events, email verification)
   - Updates: `user_email`, `is_email_verified`, `last_login_at`
   - Only triggers when email, email_confirmed_at, or last_sign_in_at changes

## Notes

- All timestamps use `TIMESTAMP WITH TIME ZONE DEFAULT NOW()`
- All primary keys are UUIDs with `gen_random_uuid()` default
- Foreign keys use `ON DELETE CASCADE` for data integrity
- JSONB fields have validation constraints to ensure data structure
- Campaign status enum: `DRAFT` (default), `ACTIVE`, `PAUSED`
- Project URL format: `/project/<project_id>` (stored in projects.project_url)
- Only one ACTIVE campaign per project (enforced by partial unique index)
- Project names must be unique per user (enforced by unique index)
- **Public Project URLs**: `/project/[projectId]` routes directly render the active campaign flow (projects table is NOT publicly accessible, only ACTIVE campaigns are)

