# Client Side Cyber Security Rules

## Principle
Client is untrusted, always.

## Key Verifications

Note: These are rules apart from secure authentication and authorization.

1. Input Validation at both client and server side. Validate types, length, and format on server side.
2. Escape all user generated content.
3. Avoid `dangerouslySetInnerHtml`
4. Sanitize HTML Inputs
5. Ensure all write endpoints are authenticated
6. Ensure no service role keys or admin endpoints are exposed 
7. Only return required fields
8. Validate type and size for file uploads