# Optimization of RLS Policies and RPC functions

Following are a list of issues and context where optimizations are required. Use Supabase MCP (http://127.0.0.1:54321/mcp) to connect with local database server to implement any changes.

## Documenting what is working and what needs to be modified

### `public.users` - Working as Expected
1. All database operations are linked to an ownership chain.
2. delete and insert policies are not added meaning those operations are under total lockdown. Only entry to user insert are via rpc functions `handle_new_auth_user` and `handle_auth_user_update`. Users are synched when authentication is successful in `auth.users`
3. Current policies added for select and update: `(( SELECT auth.uid() AS uid) = user_id)`
4. Testing: Running select * users with Postman gives an empty array


### `public.projects` - Working as Expected
1. All database operations are linked to an ownership chain.
2. Since `user_id` is a foreign key in projects as well as users, we do not need to traverse across ownership chains joining tables `(user_id = ( SELECT auth.uid() AS uid))`
3. Projects table has a Security Definer that archives the project - this is implemented on database level as an atomic swap to avoid any race scemarios. The rpc function is named as `archive_project`, it first checks if the project is already archived, if not is proceeds to archive and ensures all campaigns within the project are updated 'PAUSED'
4. Testing: Running select * projects with Postman gives an empty array. Attempting Select insert a row gives RLS error.
5. A security invoker rpc function ensures that an archived project cannot be reverted to be unarchived `prevent_project_unarchive`

### `public.campaigns` - Needs Improvements
1. All owners should be able to perform all operations on their own campaigns: this is implemented via 
```
(EXISTS ( SELECT 1
   FROM projects
  WHERE ((projects.project_id = campaigns.project_id) AND (projects.user_id = ( SELECT auth.uid() AS uid)))))
```
2. When it comes to SELECT operation, we need to ensure that any anonymous or authenticated users are able to view the campaigns data if the campaign is in ACTIVE state. So we make another Permissive (OR based) SELECT policy with `(campaign_status = 'ACTIVE'::campaign_status_enum)`. Now this ensures all ACTIVE campaigns are publicly visible with.

Improvements Required:
1. A user not using the client for requests can get a list of all active campaigns that contains personal data. We want to ensure that only an ACTIVE campaign with a specified project_id returns data only for that project_id.
2. project_id should be a required parameter here which will make sure even if select * API is called, it only exposes a single row. A project can have only single Active campaign hence only single row gets exposed.
3. Preferred way of implementing this is via an RPC function that verifies if a project_id is specified before querying any select operations. The client needs to ensure all campaign related select operations are passing project_id so that they pass.

### `public.client_services` - Not Working
1. All owners should be able to perform operations for their client services. This is implemented via:
```
(EXISTS ( SELECT 1
   FROM (campaigns
     JOIN projects ON ((projects.project_id = campaigns.project_id)))
  WHERE ((campaigns.campaign_id = client_services.campaign_id) AND (projects.user_id = ( SELECT auth.uid() AS uid)) AND (projects.is_archived = false))))
```
2. All Anonymous and Authenticated users should be able to VIEW Client Services for a specific project_id, where the project_id guides to the active campaign for which the services should be visible. Note that the active campaign_id might change by time, but project_id remains same. To implement this we have added another Permissive (OR based) SELECT policy:
```
(EXISTS ( SELECT 1
FROM (campaigns
    JOIN projects ON ((projects.project_id = campaigns.project_id)))
WHERE ((campaigns.campaign_id = client_services.campaign_id) AND (campaigns.campaign_status = 'ACTIVE'::campaign_status_enum) AND (projects.is_archived = false))))
```
3. On testing apart from the ownership visibility - no public users is able to view Client Services which is not expected.

Improvements Required:
1. Since there are Joins coming from campaigns as well as projects. Campaigns is visible for Active Campaigns only while Projects is visible only under ownership. Hence any logic in RLS is better to be executed under a Security Definer so that the quries execute fully.
2. 'Projects is archived' need not be checked as we already have a atomic swapping rpc that makes sure there are no active campaigns in an archived project. So there shall not be a scenario where a campaign is active but its project is archieved.
3. While we want Client Services to be visible for Active Campaigns, we do not wish to have a listed access to all client services, hence we need to a function that ensures Select operations only run on a mandatory project_id. Ensure the client side implementation is sending project_id for all client services related select queries.

### `public.case_studies` - Not Working
1. Case Studies is a child table of Client Services. All operations are supposed to be allowed only on ownership except for case studies related to active campaigns (same requirement as client services).
2. The ownership chain is one level deeper resulting to:
```
(EXISTS ( SELECT 1
FROM ((client_services
    JOIN campaigns ON ((campaigns.campaign_id = client_services.campaign_id)))
    JOIN projects ON ((projects.project_id = campaigns.project_id)))
WHERE ((client_services.client_service_id = case_studies.client_service_id) AND (projects.user_id = ( SELECT auth.uid() AS uid)))))

```
3. The Select Operation has a single merged policy with OR clause making it behave like two permissive policies. However this functionality fails to deliver view access to case studies for anon and authenticated non ownership users.
```
  ((EXISTS ( SELECT 1
   FROM ((client_services
     JOIN campaigns ON ((campaigns.campaign_id = client_services.campaign_id)))
     JOIN projects ON ((projects.project_id = campaigns.project_id)))
  WHERE ((client_services.client_service_id = case_studies.client_service_id) AND (campaigns.campaign_status = 'ACTIVE'::campaign_status_enum) AND (projects.is_archived = false)))) OR (EXISTS ( SELECT 1
   FROM ((client_services
     JOIN campaigns ON ((campaigns.campaign_id = client_services.campaign_id)))
     JOIN projects ON ((projects.project_id = campaigns.project_id)))
  WHERE ((client_services.client_service_id = case_studies.client_service_id) AND (projects.user_id = ( SELECT auth.uid() AS uid))))))
```

Improvements Required:
1. There are three joins campaigns, projects, and client services. Better to have a security definer privieges to verify this chain.
2. For same reason as client services, the project is_archived false check can be removed
3. We do not want select * to list down all case studies related to active campaigns, hence a function should ensure only rows with a matching project_id are returned where project_id param becomes mandatory. Client side requests should ensure project_id is passed for all use cases so that this particular security definer function does not fail it.

### `public.widgets` - Not Working
1. Same implementation as client services table as widget is a child table of campaigns. Following query shows a merged OR for SELECT operation to ensure ownership for all widgets but public visibility for only active campaigns.
```
((EXISTS ( SELECT 1
   FROM (campaigns
     JOIN projects ON ((projects.project_id = campaigns.project_id)))
  WHERE ((campaigns.campaign_id = widgets.campaign_id) AND (campaigns.campaign_status = 'ACTIVE'::campaign_status_enum) AND (projects.is_archived = false)))) OR (EXISTS ( SELECT 1
   FROM (campaigns
     JOIN projects ON ((projects.project_id = campaigns.project_id)))
  WHERE ((campaigns.campaign_id = widgets.campaign_id) AND (projects.user_id = ( SELECT auth.uid() AS uid))))))

```

Improvements Required:
1. Joins warrant a security definer to ensure full execution privileges
2. project is archived false need not be checked
3. project_id should be a mandatory parameter and a function should ensure select * only returns rows for a specific project_id. Ensure our client side usage passes project id.

### `public.leads` - Not Working
1. The SELECT UPDATE and DELETE operations are supposed to be strictly under ownership. Leads is a child table of campaigns.
```
  (EXISTS ( SELECT 1
   FROM (campaigns
     JOIN projects ON ((projects.project_id = campaigns.project_id)))
  WHERE ((campaigns.campaign_id = leads.campaign_id) AND (projects.user_id = ( SELECT auth.uid() AS uid)))))
```
2. The INSERT operation should be possible for anon and authenticated users that may or may not be owners. This functionality is not working when the ownership check fails, the current policy is simply configured as `true`.

Improvements Required:
1. The ownership should be preserved for SELECT UPDATE and DELETE operations
2. Non ownership users should be able to successfully insert leads when the campaign status is active. Ensure a project_id is necessary and verified via a function to avoid cases of bulk insert.

## Ensure Following Implementation while Creating any Security Definer functions
1. Prefer an Invoker Function where it would make sense
2. Do not use service role keys to execute any functions
3. Always explicitly set the search_path to public
4. Revoke execute access to public for security definer functions unless that would break requirements
5. Sanitize client inputs
6. When adding functions to RLS policies, always wrap them in a SELECT query
7. All new security definer functions which are made explicitly to be called for RLS purposes should be created in a new non-exposed 'internal' schema.
8. All existing security definer functions, mainly archive, publish and switch project should have a Revoke Execution access for Public.

## Modifications made to creaeted migrations files
1. Setting all function search_path to empty string as suggested by Supabase
2. Added Revert Execute on function to all functions defined in public
3. Restricted access to anon role for function execution and schema usage as all services are either consumed by authenticated users or anonymous but authenticated users
4. Wrapped all RLS policies auth.uid() into select operation for caching
5. Question: How are we using the RPC functions in `internal` schema?
6. Question: If we have public RPC functions defined for client - why do we need RLS policies to as well separately? Can we have RLS policies as (false) so that only rpc function based access is available for client as well as those using public APIs?

## Review Round 2
1. The client side code is using `check_*_access_by_project` RPC functions to display campaign flow pages. What is the intended purpose of `check_*_row_access`? Both these are saying to use RPC functions for public access but have them returning either false or the check for public has been removed.
2. Prefer keeping `check_*_access_by_project` and remove the recently added `check_*_row_access` if not useful. In `check_*_access_by_project` what is the reasoning behind checking the ownership if RLS policies are meant for that? If it is going to work as a simple OR check then its fine, but otherwise non owner users should be able to view campaigns, client services, case studies and widgets with project_id inputs
3. Ensure that client is properly parsing and passing input parameters that are requested by RPC functions

## Error List A
1. Case Studies are not visible publicly for Active Campaigns in Campaign Flow Pages
2. Failed to create lead. Role Anonymous Sign In
details: 
"Campaign not found: Cannot coerce the result to a single JSON object"
error: 
"Failed to create lead"
curl 'http://localhost:3000/api/leads' \
  -H 'Content-Type: application/json' \
  -b '_ga=GA1.1.175708471.1766687582; sb-127-auth-token={token}' \
  -H 'Origin: http://localhost:3000' \
  -H 'Referer: http://localhost:3000/project/94cb2de5-c2e5-43ad-87e5-83b9c1266c1c' \
  -H 'Sec-Fetch-Mode: cors' \
  -H 'Sec-Fetch-Site: same-origin' \
  --data-raw '{"campaign_id":"c7044cd5-60de-4a49-ab29-da9becbb52e9","lead_name":"Testing with Anon User","lead_company":"Post Recent Migration","lead_email":"25thDec@email.com","meeting_scheduled":false}'

  ## Possible Solution to the Insert Leads returning RLS Restriction
  1. The Campaign Flow pages authenticate users using JWT fingerprinting before they submit a link. So from database context, every user that attempts to Insert Link is 'authenticated'
  2. Anonymous Sign Ins can be identified with is_anaonymous = true flag from their JWT payload. Refer @auth.ts file where functions are defined for this identification.
  3. Modify the `check_lead_insert_allowed` RPC function to allow insert when user is_anonymous = true