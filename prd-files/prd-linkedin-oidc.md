# Linkedin OAuth

## Goal
All existing and new users should be able to signup or login with LinkedIn OAuth Flow or the Magic Link Flow.

## Expected Impact

Pain Points:
1. With Magic Links - users frequently make mistakes of have separate devices or switch between incognito tab causing authentication failures.
2. Magic Links require hoping through multiple tabs or apps on mobile
3. Magic Links are not widely used and hence do not promote trust

North Star:
Improved Authentication Conversions and Decreased Churn. (Indirect trust factor contrbuted by LinkedIn)

Other Benefit:
Enrich existing public.users with Linkedin profile data, avoiding extra steps for users.

## Second Order Impacts

1. Users may end up creating duplicate accounts in case they do not remember their last login -> Requires automatic linking and manual linking flows.
2. For cases with no verified email matches - a separate account merge functionality will be required

## Prioritisation

P0: Linkedin OAuth Implementation - Backend (create migration files)
P0: Linkedin OAuth Implementation - Client Side
P1: Link Identity Flow post Magic Link Logins
P2: Profile Page for user to manually add data or display synced LI data

## Flow

Sample LI OIDC Response:
```
{
    "sub": "Ta4sample",
    "email_verified": true,
    "name": "Pranav Mandhare",
    "locale": {
        "country": "US",
        "language": "en"
    },
    "given_name": "Pranav",
    "family_name": "Mandhare",
    "email": "example@gmail.com",
    "picture": "https://sample.link.wow"
}
```
Note:
1. Ensure email exists and email_verified = true to confirm email is verified
2. Emails may simply not exist at all or may show email_verified = false in case not verified
3. Any data apart from sub can be null

### An Existing User

1. previously signed up with Magic Link -> logs in this time with Linkedin -> Linkedin verified email = existing account with same verified email -> account automatically linked with Linkedin via Supabase (no duplicate account created)

2. previously signed up with Magic Link -> logs in this time with Magic Link -> user successfully logs into Studio as usual -> Post auth user can opt to link to LinkedIn via manual linking -> 
If manual linking opted yes, user is taken through a linkidentity() flow
    a. Link successfully: means user has a single account that can be accessed via Magic Link or LI both login processes going ahead
    b. Link failed due to LI already linked: user might have already signed up with LI separately where the verified emails did not match or LI did not have a verified email, hence the user now has two accounts

If manual linking opeted no, nothing to be done. User continues using account without LI linking. They option will be available to them. (In public.users we would require a column to record boolean on if user has opted for manual linking or not - client can display the linking option based on this data)

3. previously signed up with Magic Link -> logs in this time with Linkedin -> Linkedin verified email != any existing account with same verified email -> Supabase does not initiate auto linking -> User ends up with two separate accounts

4. previously signed up with Magic Link -> logs in this time with Linkedin -> Linkedin does not return a verified email -> Supabase does not initiate any kind of autolinking of existing accounts and abort any user creation without verified identity -> Store the Linkedin sub temporarily and encrypted in the browser -> Communicate to user "Your Linkedin account did not provide a verified email, please signup separate using magic link" -> User enters email and completes magic link flow -> Authenticate user inside the Studio -> Dialog displays message to link Likedin -> If user triggers linkidentity() -> Check if sub exists as a cookie -> If yes, pass the sub stored to fastrack the process, otherwise trigger fresh linkidentity() without sub -> If success and sub exists, mark as used = true and delete it from browser storage

Temporary Storage should be as follows:
1. An encrypted cookie: HttpOnly, Secure, Same Site Lax
2. store provider, sub, created_at, expires_at, used = false
3. TTL for sub should be less than 15 mins, delete automatically post timeout or if used = true, whichever first

UX Preference for Auth Screen with LinkedIn OAuth
1. LinkedIn OAuth displayed as first option in the container with an OR divider,
2. below which we have the Magic Link section

UX Preference for Link Identity Flow: 
1. A Dialog strip below the Studio Header with Text and a Button to initiate linkidentity()
2. A 15 minute countdown timer on this strip and a cross button. If the user clicks cross remove the dialog. If the countdown reaches zero, remove dialog.

### UX to handle users with two accounts

There are two cases above where users have ended up with two accounts. One where existing user signed up with LI and their email did not match. Second where they signed with Magic Link but there LI is already linked to another account.

Both these cases lead us to an issue where the user is confused about which account to use every time they try to signup (since there are two accounts), and might also lead to data spread across accounts.

We cannot immediately solve for this as the solutions are out of scope for current dev. This will require unlinking identities or merging accounts with data.

Hence the temporary solution will be,
The browser remembers what Login method a user successfully used last time and the UI suggest the last used method in Signup/Login screen.

Note: 
1. Only register the data when the user is successfully authenticated.
2. Overwrite the latest login on every successful login
3. Deafult Auth UI when no data available

Storage Mechanism:
- Local Storage
- last_login_provider, last_login_at, confidence (boolean)

UX Preference: Show a badge saying "last sign in with" for the respective method

### A New User
can use any methods to create an account 
-> if magic link is opted, user gets a dialog strip to link Linkedin identity
-> if linkedin was opted, nothing else required to be done

The successive flow same as existing user, including cases where error is shown if no verified email found in response from LI.

UI/UX remain same as in existing user flow

### Profile Section

UI:
1. If no name or avatar exists: The top right of Studio header shows a secondary CTA saying "Update Profile".
2. If LI is alraady connected and profile data was empty, the linkedin profile is automatically enriched with LI data. Display circular profile icon with a down chevorn on right.
3. User has already manually updated data: Full Name is visible instead of the CTA or avatar circle. Manually user cannot upload avatar. Avatar only imported when LI connected. (Truncate full name for UI display in header)
4. Display Preference: Avatar > Display Name > CTA

UX:
1. On click avatar/name/cta or down chevron - a profile page opens.
2. The profile page requests user inputs for: first name, last name, on save clubs both into display_name.
3. A common save button that saves any input fields that are input and ignores null ones. Sanitise before saving.
4. User cannot manually upload avatar. Display Avatar in circular UI on profile page if LI connected.
5. If LI not already connected, display a Secondary CTA "Connect Linkedin" which triggers linkidentity flow
6. Use the global Studio header and footer for profiles page

Database flow:
1. User connects linkedin: record `public.provider_profiles` -> if empty enrich `public.users` -> post succesful save of every field, write record in `public.user_identity_meta`

Note: If any profile data is already filled, it should never be overwritten.

### Database Management

We need a table for:
1. New `public.provider_profiles`: Recording data received from provider post successful authentication
2. Existing `public.users`: Additional columns to enrich profiles
3. New `public.user_identity_meta`: Tracks history for profile fields updates

Supabase handles any linking and additions to the `auth.users` table - no requirements for us.

Data to capture and store. We can add more columns to `public.users` to record this:
1. display_name
2. first_name
3. last_name
4. avatar_url
5. country
6. language
7. profile_completed boolean -- for UX
8. linkedin_id (sub)
9. profile last updated timestamp

All these are optional items. The Magic Link users can go to profile screen and input these manually. We need a separate meta table to identify if the above columns are populated via linkedin import or user input `public.user_identity_meta`
- source
- field (name)
- confidence
- saved_at timestamp

Store prvider response as jsonb in `public.provider_profiles` table

### Other Tasks
1. (To be done manually) Update the Privacy Policy for Linkedin Oauth and link new policy in the webpages


### Resources

**Troubleshooting linkIdentity() issues**

Supabase code for linkIdentity method. The linkIdentity is not able to fetch the JWT by itself and hence verify the authenticated user. On manual trial errors we understand that getUser() needs to be specifically passed with JWT as a param to be able to identify the sub.

If the following code fetches JWT in headers we can explore if we can pass it via headers while running this method. Or identify if any other intel we receive from this code.

```
private async linkIdentityOAuth(credentials: SignInWithOAuthCredentials): Promise<OAuthResponse> {
    try {
      const { data, error } = await this._useSession(async (result) => {
        const { data, error } = result
        if (error) throw error
        const url: string = await this._getUrlForProvider(
          `${this.url}/user/identities/authorize`,
          credentials.provider,
          {
            redirectTo: credentials.options?.redirectTo,
            scopes: credentials.options?.scopes,
            queryParams: credentials.options?.queryParams,
            skipBrowserRedirect: true,
          }
        )
        return await _request(this.fetch, 'GET', url, {
          headers: this.headers,
          jwt: data.session?.access_token ?? undefined,
        })
      })
      if (error) throw error
      if (isBrowser() && !credentials.options?.skipBrowserRedirect) {
        window.location.assign(data?.url)
      }
      return this._returnResult({
        data: { provider: credentials.provider, url: data?.url },
        error: null,
      })
    } catch (error) {
      if (isAuthError(error)) {
        return this._returnResult({ data: { provider: credentials.provider, url: null }, error })
      }
      throw error
    }
  }

```