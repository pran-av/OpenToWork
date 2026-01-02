# Phase 3a

## Goals

Goal is to make fixes and small improvements to make the product more marketable. Hands on marketing on the side to test hypothesis. Predict PMF and get more confidence on the product. Pivot if needed towards PMF.

### Fixes
Fix: the Studio CSS errors
Fix: Instant Update on UI post Insert Operations
Fix: Switch to Current - campaign list is not visible
Fix: Website LCP and other scores

### Features
- Link Previews
- Use Shadcn to figure out a overall theme
- Try to component-ise the website theme behaviour
- OAuth Signups: Google Mail and Linkedin. Link multiple auth to single user.
- Onboarding Flow
- Explore Encryption Requirements
- Privacy Policy considering how things work
- Add a Waitlist if people wish to be notified on full release
- Add more material to landing page

## Requirements

### Studio/Dashboard CSS Fixes
Studio already has tailwind css coded for light as well as dark mode

1. Add a theme provider for react so that we have a mechanism to switch between dark and light mode
2. Default to light mode
3. Persist them update in local storage
4. Sync theme after mount to avoid hydration issues
5. Create a toggle icon on Studio header, position on the right side of the header
