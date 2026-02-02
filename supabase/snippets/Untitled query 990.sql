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
