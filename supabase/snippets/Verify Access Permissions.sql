-- Overall Access Permissions
SELECT
    n.nspname AS schema_name,
    p.proname AS function_name,
    p.proacl AS access_privileges
FROM
    pg_catalog.pg_proc p
LEFT JOIN
    pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE
    n.nspname = 'public' -- Replace 'public' with your schema name if different
ORDER BY
    schema_name,
    function_name;

SELECT 
    nspname AS schema_name,
    pg_catalog.pg_get_userbyid(nspowner) AS owner,
    nspacl AS access_privileges
FROM pg_catalog.pg_namespace
WHERE nspname NOT LIKE 'pg_%' 
  AND nspname <> 'information_schema';

-- Function Execute Permissions for anon, authenticated, postgres and service_role
SELECT 
    p.proname AS function_name,
    r.rolname AS role_name,
    has_function_privilege(r.rolname, p.oid, 'execute') AS has_access
FROM 
    pg_proc p
JOIN 
    pg_namespace n ON n.oid = p.pronamespace
CROSS JOIN 
    pg_roles r
WHERE 
    n.nspname = 'public' -- Filter for public schema only
    AND r.rolname IN ('postgres','public','anon', 'authenticated', 'service_role') -- Target Supabase roles
ORDER BY 
    function_name, role_name;

-- Verify Function Execute Permissions for PUBLIC

SELECT 
    p.proname AS function_name,
    has_function_privilege('public', p.oid, 'execute') AS is_granted_to_public
FROM 
    pg_proc p
JOIN 
    pg_namespace n ON n.oid = p.pronamespace
WHERE 
    n.nspname = 'public'
ORDER BY 
    function_name;


-- Table Access Permissions
SELECT 
    t.table_name,
    r.rolname AS role_name,
    has_table_privilege(r.rolname, t.table_schema || '.' || t.table_name, 'SELECT') AS can_select,
    has_table_privilege(r.rolname, t.table_schema || '.' || t.table_name, 'INSERT') AS can_insert,
    has_table_privilege(r.rolname, t.table_schema || '.' || t.table_name, 'UPDATE') AS can_update,
    has_table_privilege(r.rolname, t.table_schema || '.' || t.table_name, 'DELETE') AS can_delete,
    (SELECT relrowsecurity FROM pg_class WHERE oid = (t.table_schema || '.' || t.table_name)::regclass) AS rls_enabled
FROM 
    information_schema.tables t
CROSS JOIN 
    (SELECT rolname FROM pg_roles WHERE rolname IN ('public', 'anon', 'authenticated')) r
WHERE 
    t.table_schema = 'public' 
    AND t.table_type = 'BASE TABLE'
ORDER BY 
    t.table_name, r.rolname;

-- Verify Extensions

SELECT 
    e.extname AS extension_name, 
    e.extversion AS version, 
    n.nspname AS schema_name
FROM pg_extension e
JOIN pg_namespace n ON e.extnamespace = n.oid
ORDER BY schema_name;
