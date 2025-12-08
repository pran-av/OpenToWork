# Handling of Permanent (Authenticated) and Guest (Anonymous) Users

Note: Both the above types are treated as `authenticated` in our databases (supabase).

## Flow for permanent user creation
1. User lands on `/auth` page and enters their email id for requesting Signup or Login
2. The server receives the request and triggers a magic link sent on email for verification
3. User clicks on the link and token gets verified at server end, the client exchanges a session directly with the server
4. Now this session token a JWT is being set as a cookie to persist the session for the permanent user further

## Flow for guest users
1. A guest users lands on public pages which are the campaign flows, so the following flow triggers at the very first rendering of any campaign flow
2. The system should first check if this is an already permanent user, this should be done by extracting the browser cookies and checking if these tokens are for anonymous or permanent user. An anonymous user token will have an is_anonymous = true flag
4. If cookies for neither guest or permanent user exist - then only we should run the anonymous user Sign In to have a User ID alloted to this new guest user and share the access token as response (is_anonymous = true coded). This token again gets stored for persistence and to avoid multiple anonymous users on each refresh.

Possible flaw in current flow:
1. In the current implementation of anonymous Sign in, I am observing the server returning a set cookie parameter in response header. This cookie when set in the browser is not the same as the anonymous user token but is a permanent user cookie under name 'sb-auclxctmtyzosafbyxff-auth-token'
2. Consider we are logging in as different permanent users with separate UserIDs, its observed that the cookie under name 'sb-auclxctmtyzosafbyxff-auth-token' stored post successful signup is exactly the same for both users, however the magic-link sends a different 'sb-auclxctmtyzosafbyxff-auth-token-code-verifier' for each request
3. We need to recheck our cookie logics based on above two points. Note that for permanent user sign in we are using the PKCE method.