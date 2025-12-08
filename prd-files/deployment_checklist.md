# Deployment Checklist

1. Check if there are any Linting Errors. If there are fix them.
2. Ensure the project builds successfully in a clean environment
3. Ensure all dependencies are listed in package.json
4. Upgrade Next JS to 16.0.7
5. Ensure there are no potentially sensitive/environment variables leaked in the code
6. Ensure production cookies are configured to HttpOnly true, Secure true, and Same Site Strict
7. Comment any console logs or console warn statements
8. Ensure no API routes have Supabase Service role keys in use
9. Identify any functions or variables not in use and highlight them (do not remove them directly without notifying or warning)