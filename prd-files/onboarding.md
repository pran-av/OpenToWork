# Onboarding

Onboarding is not just to inform the user but to get them activated. And the best way to have them activated is to first understand their specific wants. Since we have LLMs that can converse in natural language - we can transform tranditional onboarding into a much pint point implementaiton. The metric remains same as traditional: Activation.

## Goal
1. Get the user activated - identify their intent of joining and based on that suggest them activities they can immediately perform.
2. Inform the user about long term benefits and how to leverage those using available features.
3. User should know where to access which feature and how to ask for help.

## Flows

### New User Sign Up - First Time Visitor

1. The User needs to complete their profile so that our agent has enough context to serve. So the first duty of the onboarding agent would be to get the User Profile completed.
2. Profile Completion Tasks:
    - Verify if the User has connected their Linkedin, if not share them the CTA to proceed with the connection. Users who have signed up using magic links will have to do this additional step.
    - Verify if the user's First Name and Last Name is updated. If not ping them to do so.
    - The user should select their objective (user type): If they wish to convert a job (Job Seeker) or wish to convert a client (Freelancer).
    - If the user is a Job Seeker and their is no resume uploaded yet: Request them to upload their Resume. Share them a CTA within conversation for them to upload.
    - 

### Repeat User