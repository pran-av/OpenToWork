# Phase 2 PRD

## What's currently deployed
- A default campaign tempelate
- A default widget tempelate
- A database that stores all users, projects, campaigns, leads, widgets and other subsequent details required for a campaign
- An API that pulls the widget and campaign details to load a requested campaign

## Goal for Phase 2
- Build an authentication system for users to login/signup
- Build a dashboard for users to create projects and campaigns
- Enable users to manage campaigns by publishing them or pausing them.
- Enable users to switch campaigns
- Enable users to archive projects
- Enable client to copy and share project URL so that users can access their pitch

By the end of phase 2 any client user should be able to create an account, create their own project and campaign, and publish it to get project URL for sharing.

## Flow
- Client visits the dashboard - logs into their account. Otherwise signup.
- Once inside the dashboard, they open an existing project or create a new project.
- While within a specific project, client creates a campaign and fill all mandatory fields.
- Within campaign creation flow - client adds general campaign details, adds services and case studies, adds cta config. And optionally designs a widget for the campaign.
- Client publishes a campaign to make it Active. A project URL is generated when a campaign is active for a project.
- Once published, client cannot edit a campaign but can Pause it or create a new campaign to switch the old with new.

## Design
- The dashboard should be minimal in terms of UI but reponsive for all default viewports
- Use default fonts, weights, colors, etc as in the global css

## Detailed Requirements for each module

### Dashboard Navigation Structure - P0
- Home/Projects Dashboard: List of Projects (Archived + Active)
- Home > Project Overview: Lists the details of the selected project along with the list of campaigns within this project.
- Home > Project Overview - Leads Tab: Lists down cumulative leads across all campaigns filterable by campaign name. Table includes - Leads Name, Company Name, Contact, Campaign Name. 
- Home > Project Overview > Campaign Overview: List the details of the individual campaign. It includes separate sections for Campaign Structure, Campaign Services and Case Studies, CTA Configuration, and Widget Condiguration

### Schema Change - P0
- Instead of each campaign having an independant URL - a project should have a single URL. This project routes Active campaign from within the project. This ensures a shared link on internet need not be replaced to change the pitch.
- A project can have only Single Active campaign at a point of time.
- A project can have multiple drafts with none of them in Active state, in such case the shareable URL would not be generated for the project.
- Once a campaign is published - the status changes to ACTIVE and hence a URL is generated for the project. This URL can now be shared.
- When a campaign is already ACTIVE, user cannot publish or activate another campaign in the same project.
- To Pause one campaign and activate another, the user has to use a Switch Campaign functionality where they mention they select from dropdown the name of a new Draft campaign to be switched while pausing the current active one.
- To avoid a No ACTIVE Campaign condition at any given point of time - use atomic updation of the service pointer (blue green strategy). The old campaign becomes Paused and new campaign becomes Active post switch.
- A Paused campaign can be reactivated by the same Switching functionality any number of times.
- A Project can be ARCHIVED in case the user wants to stop running all the campaigns. For such cases implement Graceful Exit, redirect all leads requisting data for Archieved project links to a page mentioning "Owner has archieved this campaign".
- CTA Config, Widget Config and Leads remain part of campaign - only URL is moved to project level. The URL has to remain same per project irrespective of the current active campaign within the project. The URL slug can be modified to projects/UUID.
- The default campaign status should be 'Draft'. The default project is_archive switch should be false. Project URL can be null when there are no published campaigns.

### Signup and Login - P1

Note: Since we are using Supabase for authentication, a lot of points below might be managed by Supabase. In such case simply verify all requirements are met and only build modules that are not part of supabase auth system.

- Integrate Supabase passwordless Magic Link signup process, user will have to add their email id and press Continue button to get a link everytime in their email inbox. The user is expected to click on the link in their email to successfully be authenticated as a user.
- Once the user clicks on the Continue button, a dynamic message should be display saying "an authentication link is being sent to your email inbox" (in black color) which then changes to "an authentication link has been sent to your email inbox" (in green color). Add an information panel saying "visit your inbox, open received email and click on the link to login/signup to the app"
- The user should be able to trigger a 'Resend Email' button in case they do not receive an email. Ensure that the old token is invalidating before starting a new resend cycle. The resend button should only appear after 1 minute of sending the previous email.
- Any authentication token used for magic link should only last for 5mins if unused and inauthenticated post the lapse of this time. Otherwise it should be immediately inauthenticated on successful or failed use or if resend is requested.
- If the user successfully logs in or signs up - the user is assigned a session cookie managed with HttpOnly and Secure flag.
- Always hash any tokens stored in database
- Keep the user logged in for 24hrs without refresh unless they specifically logout. Use refresh tokens processed with HttpOnly cookies with Secure flag. If supabase has a refresh token functionality - use the same
- Use JWTs for tokens
- Do not store any login/signup data like emails or tokens in local or session storage
- Provide a Logout button on top right header bar of the dashboard. When the user clicks logout show them a message that they have been logged out. Below the message show a panel to re-enter details to login again.
- Use supabase email sending mechanism for development purpose. For production, Resend will be configured for sending emails.
- Ensure RLS is enabled for users table
- Enable RLS for all existing tables in database

### Projects Page: Create a Project - P2

- The user should see list of all their projects post logging into the dashboard, arrange the list by latest project first
- If the user has no projects they should see a button center aligned to screen saying 'create a project'. If there are already a list of projects add the button on top right of the section saying 'create a new project'
- On click user is prompted a dialog box to add project name, validate that the project name is not empty and unique amongst all projects of the user. The dialog has a 'Create Project' - on click leads to creation of the projects, otherwise a close cta to abort creation
- When a project is created take user to the Project Overview Page
- A back navigation should be available to take user back to the projects page 
- In case a list of projects is displayed, each list item will have Project Name, and Project URL. When a project is clicked from the list, take user to the Project Overview Page.

### Project Overview: Create a Campaign - P3

- Top sections sumarises the project details: Name, Created Date URL with copy functionality (URL only visible if atleast one campaign is ACTIVE).
- The Project Details section will have a settings symbol on top right - on click user gets a dropdown option to Archive the Project.
- The next section will mention Currently active campaign for the project (if any). If no campaign is active yet - the section gives an info panel saying "Publish atleast one campaign to generate shareable link"
- The currently active campaign section has - Campaign Created Date, Campaign Name, Campaign Status (Active), and a CTA saying 'Swtich Campaign'
- The following section lists remaining campaigns within the project along with the Active or Paused status (all rest should be Paused). Order this list by latest created.
- Display a Create Campaign CTA center aligned to screen if no campaigns are available, otherwise the CTA will be available on top right.

### Campaign Overview - P3
- User can click on any campaign to open the campaign overview page where all of the campaign details are summarised.
- The first section of this page lists down all the basic Campaign Details which are, Campaign Name, Campaign Status, Client Name, Client Summary (with see more for 4 lines)
- A campaign can have following statuses: DRAFT, ACTIVE, and PAUSED.
- A campaign in DRAFT status will always open in edit mode, while an ACTIVE or PAUSED campaign always opens in view mode as it cannot be edited as they were published
- A Draft Campaign lists down all the fields mandatory and optional required to be filled for a campaign to be published. The primary CTA should be 'Publish'/'Switch to Current', however it is frozen until all mandatory fields are filled by the user. The secondary CTA should be 'Save' which is always available and save the entered field data while keeping the campaign in Draft status.
- Note: Add a flag for all draft campaigns to identify when they are publishable, they are publishable only when all mandatory fields are not null.
- When to display Publish CTA and when to display 'Switch to Current'? If there is already an Active campaign for the project then display 'Switch to Current' CTA, otherwise 'Publish' CTA. 
- An Active campaign list down all the campaign sections with a primary CTA on top allowing user to 'Switch Campaign'. An active campaign will not have any CTA to switch or pause it if it is the only campaign in the project.
- Difference between 'Switch to Current' vs 'Switch Campaign' CTA: 'Switch Campaign' CTA is only displayed in campaign overviews where the campaign is already a ACTIVE one. 'Switch to Current' is displayed in either PAUSED or DRAFT campaigns when another campaign is already ACTIVE for the project. The functionality for Switch CTAs is described in further tasks - only add CTAs in this task.
- A Paused Campaign will list all the sections in view mode and have a primary CTA of 'Switch Campaign'.
- Section wise fields for a campaign,
    - The header of this page include general details like campaign name, status, campaign url, created date, and the primary and secondary CTAs (as applicable).
    - The next section includes the Campaign Structure: Client Name, Client Summary, and CTA Configuration
    - The next section lists all client services related to the campaign, and for each service there is a case study configuration. This can be implemented in dropdown format.
    - All mandatory fields should have an astrick symbol and should display red when empty. Use the draft campaign flag 'publishable', display red when draft campaign is not publishable.  

### Campaign Overview: Client Services and Case Studies - P3
- The Client Services container should have a CTA to saying 'Add Service', on click a modal opens requesting Service Name with 50 Character Limit
- User can click Close the exit the modal, otherwise enter the name and click 'Add' CTA. Show error if service name is empty. There are no unique checks on service name, two services can have same name.
- Add an accordian for each service added. If there is only one service the accordian can be default open, as more services are added the latest added service has the accordian open while the other accordians are in closed state. If user opens a particular accordian, keep the other accordian open unless user closes it.
- The Order Index for services will be based on sequence of addition. Meaning the first added will have index 1 and show at top followed by the sequence.
- Each accordian mentions the service name and has a delete CTA on Top right within the accordian card. Clicking delete, deletes the service along with other case study information within the service.
- On opening each accordian, the user can click another CTA to 'Add Case Study'. Below the CTA it should mention atleast one case study is required.
- On click populate all fields requiring user input for case study. This includes Case Name, Case Summary, Case Duration, Case Highlights, and Case Study URL. Name and Highlights are mandatory, the rest is optional.
- Case Name should have a 50 Character limit. Error if empty. Does not have to be unique.
- Case Summary should have a Character limit of 100.
- Case Duration can be a simple string and limit of 50 characters
- Case Highlights should be collected as multiple pointers. User can see a field by default, atleast one highlight is mandatory per case study. Besides this highlight the user can click a square button with plus icon to add another highlight.
- If muliple highlights are received, they should be stored separated by a semicolon
- Clicking the 'Save Campaign' button should save all the entered/updated fields at that instant of the campaign
- When the campaign is in draft stage, it will be editable and hence these sections will be editable. However in any other stages - these sections would be in view only mode


### Switch Campaign - P4
- A switch campaign allows user to pause and old campaign to activate a new campaign in the same project without the project URL changing. This is done in a atomic fashion reducing any chances of reace conditions.
- The switch CTAs are available on the Project Overview page as well as individual Campaign Pages, this tasks describes what happens when the user intiates switching.
- The basic mechanism of switch functionality is: The system already knows the current ACTIVE campaign - the user inputs the campaign they want to switch to. The system post receiving this input initiates an atomic switch as per blue green strategy avoiding any race condition. The URL of the project is not affected and remains same.
- Switch functionality is not available within a project when, A. There is only one campaign in a project. B. There are no campaigns in a project. In such cases, Draft campaigns show Public CTA instead of Switch and an already Active campaign has this CTA frozen.
- 'Switch Campaign' CTA functionality in Project Overview section and Campaign Overview section when the active campaign is viewed. User clicks on CTA: A modal opens displaying current active campaign, a switch to dropdown lists all other campaigns that can be switched to, they can be in draft or paused state. User selects from this campaign and 'Confirms'. 'Cancel' is available if user wants to exit modal, but post clicking Confirm user cannot cancel and has to wait for switch to execute.
- 'Switch to Campaign' CTA is available in Campaign Overview screens of Paused or Draft campaign, the system already knows current active campaign, hence clicking on this CTA automatically opens the modal where 'Switch To' campaign is already selected. Hence user only has to confirm or cancel. Once confirm is clicked proceed to switching.
- During the Switching process, execute a buffer on screen until the switch is successful.
- Post switching the old campaign is now Paused and the new campaign is Active state.


### Lead Lists - P5
- Within Project Overview create a separate tab where users can see a tabular list of all leads acquried from all combined campaigns from the project
- The table should include the Lead Name, Comapny Name, Contact, and Campaign Name
- User should be able to navigate back to the Project Overiview tab

### Archive Project - P6
- User can archive a campaign from Project Overview page. The CTA is available on dropdown from settings icon on top right.
- On click, display a warning modal with a clear message "once archived a project cannot be activated again, all users currently clicking shared links will be taken to a end of life page". Additionally mention if there are any already Active Campaigns within this project.
- When a project is archived the user should still be able to access all Overview Pages for the project and campaigns within the project. However New campaign creation or publish/switch or pause CTAs will be disable. User cannot edit any Draft campaigns within this project either.

### Footer
- Copyright statement 'All rights reserved. 'copyright symbol' 2025 Pranav Mandhare'. Link Pranav Mandhare to 'https://x.com/pranavdotexe'

### Header
- Top left of header mentions 'Dashboard'
- Top right has a logout CTA