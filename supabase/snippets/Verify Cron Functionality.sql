SELECT net.http_post(
    url := 'http://127.0.0.1:54321/functions/v1/analytics-worker',
    headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer SERVICE_ROLE_KEY'
    ),
    body := jsonb_build_object('name', 'worker-1770308826')
);

SELECT 
    status_code,      -- e.g., 200, 404
    content,          -- The actual response body (replaces 'response_body')
    timed_out,        -- Boolean if request hit the timeout
    error_msg         -- Error if the request failed to send
FROM net._http_response
WHERE id = 4;
