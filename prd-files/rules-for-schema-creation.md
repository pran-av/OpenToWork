# Rules for Schema Management in Supabase

# RLS Policies
1. Always enclose the ownership chain in select statmenet to make the queries faster `( SELECT auth.uid() AS uid)`
2. Do not complicate RLS policies, create a Security Invoker for complexities.
3. Security Definer function access should only be provided to postgres and service_role as they bypass RLS policies. If access is required to anon, authenticated, or public - then prefer Security Invoker with RLS policies.

# Schema Access
1. `public` should be the only exposed schema
2. unexposed schemas like `internal` and `agents` should never be exposed to role types public or anon.
3. To access data from unexposed schema a Security Definer should be created in `public` schema with a strict REVOKE FUNCTION EXECUTE for public and anon roles.
4. Any Views created in `public` schema should not be accessible directly to public and anon roles

# Database Functions
1. Always explicitly set the `search_path = ''`
2. Always explicitly REVOKE and GRANT FUNCTION EXECUTE access to roles
3. Avoid nested $$ notations in a single functions, name the notations if multiple are required
4. Add 'Comments on Functions and Views' for documenetation
5. When creating functions for internal workers, use Security Invokers with service_role access as Security Definers may not run on service_role
6. When Security Invoker is created as a worker only function - in that case access to function only available with role postgres and service_role and all other role access should be revoked

# Views
1. Prefer Database Views when data is to be collected from unexposed schemas to be displayed on UI
2. The Views should only be accessible to roles service_role and postgreas and strictly revoked access for anon, authenticated, and public
3. The Security Invoker should be used to access data from Views to ensure that RLS policies (ownership) is verified before access