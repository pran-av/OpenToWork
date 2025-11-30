# Database Setup - Phase 1

## Supabase Project Details

- **Project Name**: OpenToWork
- **Region**: ap-south-1
- **Status**: ACTIVE_HEALTHY
- **PostgreSQL Version**: 17.6.1.054

> **Note**: Sensitive configuration data (Project ID, API Keys, Database URL) is stored in `.env` file. See `.env.example` for required environment variables.

## Database Tables Created

### 1. users
- Primary Key: `user_id` (UUID)
- Fields: user_first_name, user_last_name, user_email, is_email_verified, user_location, created_at, last_login_at, current_payment_plan
- Note: No password_hash in Phase 1 (using Supabase Auth)

### 2. projects
- Primary Key: `project_id` (UUID)
- Foreign Key: `user_id` → users.user_id
- Fields: project_name (75 char limit), created_at

### 3. campaigns
- Primary Key: `campaign_id` (UUID)
- Foreign Key: `project_id` → projects.project_id
- Fields: campaign_name (25 char), slug (120 char, unique), campaign_url, campaign_status, campaign_structure (JSONB), cta_config (JSONB), created_at
- JSONB Constraints: campaign_structure must have client_name (≤25 chars) and client_summary (≤400 chars)

### 4. client_services
- Primary Key: `client_service_id` (UUID)
- Foreign Key: `campaign_id` → campaigns.campaign_id
- Fields: client_service_name, order_index (default 0), created_at

### 5. case_studies
- Primary Key: `case_id` (UUID)
- Foreign Key: `client_service_id` → client_services.client_service_id
- Fields: case_name (75 char), case_summary (150 char), case_duration, case_highlights (TEXT), case_study_url, created_at

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

1. `create_users_table` - Users table with email verification and payment plan
2. `create_projects_table` - Projects table linked to users
3. `create_campaigns_table` - Campaigns table with JSONB fields for structure and CTA config
4. `create_client_services_table` - Client services table linked to campaigns
5. `create_case_studies_table` - Case studies table linked to client services
6. `create_leads_table` - Leads table for capturing lead information
7. `create_widgets_table` - Widgets table with JSONB for design attributes

## Indexes Created

- `idx_users_email` on users(user_email)
- `idx_projects_user_id` on projects(user_id)
- `idx_campaigns_project_id` on campaigns(project_id)
- `idx_campaigns_slug` on campaigns(slug)
- `idx_campaigns_status` on campaigns(campaign_status)
- `idx_client_services_campaign_id` on client_services(campaign_id)
- `idx_client_services_order` on client_services(campaign_id, order_index)
- `idx_case_studies_client_service_id` on case_studies(client_service_id)
- `idx_leads_campaign_id` on leads(campaign_id)
- `idx_leads_email` on leads(lead_email)
- `idx_leads_created_at` on leads(created_at)
- `idx_widgets_campaign_id` on widgets(campaign_id)
- `idx_widgets_is_active` on widgets(is_active)

## Notes

- All timestamps use `TIMESTAMP WITH TIME ZONE DEFAULT NOW()`
- All primary keys are UUIDs with `gen_random_uuid()` default
- RLS (Row Level Security) is disabled for Phase 1 (to be implemented in Phase 2)
- Foreign keys use `ON DELETE CASCADE` for data integrity
- JSONB fields have validation constraints to ensure data structure

