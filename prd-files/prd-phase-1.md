# Phase 1 PRD

## Goal
Post this development we should be able to render multiple lead conversion flows, under separate projects. Example: Project 1 has flow with input parameters as XYZ, while project 2 has a flow with input parameters as ABC. Hence we have two separate renderings of Lead Convsersion Flows.

## Tasks and Priority

1. P0: Create webpages as described in the requirements below. Take reference from the attached wireframes. There are three webpages: Client Summary and Services, Relevant Work, and Call to Action. Temporary hardcode dynamic values.
2. P1: Create a database and setup migrations for all dynamic inputs required from client for rendering lead conversion pages. Also setup the associated tables for users, leads, campaigns, projects, client_services, and widgets. Use Supabase Postgresql - use Supabase MCP which is already enabled.
3. P2: Import previously hardcoded data into lead conversion pages from the newly created database.
4. P3: Create Vanilla JS, HTML and CSS for the default Widget Designs. There are two variations for the widget: 'Available for Hire' and 'Fully Booked'. Import this component for any use in the lead conversion pages.

## Design

### Viewports
Create responsive designs for
- Mobile and Tablet
- Desktop

Set global design preferences for these viewports

### Icons
Use Shadcn components, be consistent with buttons title across the app with global definitions

### Fonts
Primary Poppins - use for Headings and Subheadings
Secondary Inter - use for everything else

### Code
TypeScript, Tailwind CSS and Next JS app

## Modules

### Projects

Requirements:
- A client should be able to Signup to create an account and Login if they already have an account
- Each client is identified with a UUID
- Each client can start a Project
- A project is a collection of campaigns, client is expected to make all similar campaigns or versions of campaigns in the same project

`projects` schema:
```
{
  "project_id": "asads...", (Primary Key - UUID)
  "user_id": "asdasd...", (Foreign Key - UUID) NOT NULL
  "project_name": "OND Campaigns for Portfolio Website" (75 char limit) NOT NULL
  "created_at": 
}
```

`users` schema: PII data needs to be hashed
```
{
  "user_id": "asdadss...", (Primary Key - UUID)
  "user_first_name": "ABC Corp", NOT NULL
  "user_last_name": null,
  "user_email": "xyz@abccorp.com", NOT NULL
  "is_email_verified": false, (default false)
  "password_hash": "sdasdjs898sdjs", (nullable if magic-link only)
  "user_location": "India",
  "created_at": "TIMESTAMP WITH TIME ZONE",
  "last_login_at": "TIMESTAMP WITH TIME ZONE",
  "current_payment_plan": "free", (free/lifetime/pro) DEFAULT 'free'
}
```

### Campaign Pages

How Lead Conversion Pages work:
1. A lead visiting client's website clicks on the widget when its in an active state
2. The widget triggers a campaign URL to open in new tab
3. The lead goes through the campaign where they have better chance of conversion
4. Converted leads connect with the client directly or share their details for client to approach

`campaigns` json schema:
```
{
    "campaign_id": "abc78237...", (Primary Key - UUID)
    "project_id": "hsd237238...", (Foreign Key - UUID) NOT NULL
    "campaign_name": "Portfolio Website", (25 character limit)
    "slug": "asddsads", VARCHAR(120) UNIQUE NOT NULL (for /u/:slug)
    "campaign_url": "https://example.com/redirect-page", VARCHAR(255) NOT NULL (or full URL)
    "campaign_status": "active", (active/paused), DEFAULT 'active'
    "created_at": ""
    "campaign_structure": {
        "client_name": "Pranav", (25 character limit)
        "client_summary": "Pranav has 5 years of exp..", (400 characters limit)
        "client_service_id": "sjdhhj..."
    }, (JSONB)
    "cta_config": {
      "schedule_meeting": "calendly/",
      "mailto": "mailto:abc@email.com",
      "linekdin": "LI url",
      "phone": "+91 98239838238"
    } (JSONB)
}
```

`client_services` json schema
```
{
  "client_service_id": "abc78237...", (Primary Key - UUID)
  "campaign_id": "hsd237238...", (Foreign Key - UUID)
  "client_service_name": "Product Management",
  "order_index": INT DEFAULT 0,
  "created_at": ""
}
```

`case_studies` json schema
```
{
  "case_id": "",
  "client_service_id": "",
  "case_name": "Multimedia Search Tool", (limit 75 characters)
  "case_summary": "Added a search bar to android...", (limit 150 characters)
  "case_duration": "12th Sep, 2024 to 13th Nov, 2024",
  "case_highlights": "highlight 1;highlight 2;highlight3",
  "case_study_url": "https://example.com",
  "created_at": ""
}
```


`leads` json schema
```
{
  "lead_id": "asdadssd...", (PK - UUID)
  "campaign_id": "asdad...", (FL)
  "lead_name": "Vijay B",
  "lead_company": "Acme Foundation",
  "lead_email": "example@example.com",
  "lead_phone_isd": "+91",
  "lead_phone": "97621233829",
  "meeting_scheduled": BOOLEAN DEFAULT false
  "created_at": ""
  
}
```

Requirements:

Note: Create a temporary campaign URL for this flow. In Phase 2 as URLs are created via dashboard, we will add slugs to make them unique.

- All campaigns have a Campaign Name, Campaign URL, Campaign Status (Active or Paused).

- The campaign currently has only one default 3 page structure: The three pages are Client Summary and Services Page, Relevant Work Page, and Call To Action Page.

- Client Summary and Services Page aims at providing context to the lead. Hence it pitches Client Name to be hired, describes the client through summary and requests the lead to select a relevant service provided by the client.
The image below describes the design for this page

![Client Summary and Services Page](../../Downloads/otw-wireframes/OTW%20-%20Client%20Summary%20and%20Services.png)

- When the lead clicks on any one of the services, the lead is taken to the Relevant Work Page where the lead is suggested some reading material related to the service they selected. The reading material can be fetched from client_services - it includes name, discription, duration of the case study, highlights and external link

- Highlights are arranged seperated by semicolon, each semicolon signifies a new highlight which needs to be displayed as a new line with a new checkbox icon

- All the relevant work details are enclosed in an experience card, on click experience card open in new tab the external link

- The Relevant Work page has a primary CTA on lower right asking the lead if they wish to connect further. On click the user is taken to next page which is Call to Action Page.

![Relevant Work Page](../../Downloads/otw-wireframes/OTW%20-%20Relevant%20Work%20Updated.png)

- The Call to Action page does two things - displays all the CTA mechanisms through which lead can directly connect with client or two share their details so that client can connect with the leads.

- If the lead clicks on the CTAs they are taken to the relevant links in the new tab. Otherwise if the lead submits their personal details the data is stored for client to reachout to them.

![Call To Action Page](../../Downloads/otw-wireframes/OTW%20-%20Call%20To%20Action.png)

- sensitise all lead input fields to avoid script insertions or similar attacks

- all pages have a close button on top right, the last two pages have a previous button which on click takes user to previous page where they can change thier selections

- all pages have a progress bar at top filling 1/3rd everytime the user goes next page

### Widget

How the widget works:
1. Client website loads in a browser, embedded `<script>` tag is found in the client website
2. The `<script>` tag leads to the client website fetching a widget loader script from our CDN
3. The widget loader extracts the widget id and makes an API call to our server to fetch the widget configuration
4. API returns JSON with active/inactive state, destionation url, customised css and other parameters
5. The widget loader script further creates a Shadow DOM element to unroll the css and sets event listeners to that will redirect user to conversion flows on click

json schema:
```
{
  "widget_id": "a0eebc99...", (Primary Key - Use UUID v4)
  "campaign_id": "b1eebc10..." (Foreign Key)
  "widget_name": "Default Widget", (String limit 100 characters)
  "availability_status": "active", (boolean active/inactive)
  "widget_text": "Get Started Today", (limit 25 characters)
  "design": {
    "asset_type": "default_button",
    "color_primary": "#0066cc",
    "color_secondary": "#FFFFFF",
    "custom_icon_url": null,
    "custom_css": ".widget-button { border-radius: 8px; font-weight: bold; }"
  }
}
```
`widgets` table:
| Column Name       | Data Type    | Constraints/Notes                                                    |   |   |
|-------------------|--------------|----------------------------------------------------------------------|---|---|
| widget_id         | UUID         | Primary Key, NOT NULL                                                |   |   |
| campaign_id       | UUID         | Foreign Key (references campaigns table PK)                          |   |   |
| widget_name       | VARCHAR(100) | NOT NULL                                                             |   |   |
| is_active         | BOOLEAN      | NOT NULL (boolean is more efficient than a string 'active/inactive') |   |   |
| widget_text       | VARCHAR(25)  | NOT NULL                                                             |   |   |
| design_attributes | JSONB        | Stores the nested design object                                      |   |   |

Requirements:
- The widget is a design component that communicates Client's ability to pick new projects. If the client is available, the widget acts as a CTA button. If the client is not available, the widget only communicates and no Call to Action is integrated.

- The widget can have any custom CSS or HTML, however its behaviour should be consistent. When status is switched to 'active' - the click should open the 'Lead Conversion Flow URL' in a new tab. When the status is 'inactive', the widget is not clickable and does not redirect.  

- The widget has two versions with default designs as per wirefreames attached below. Available for Hire button has a green blinking dot signifying Live status and Available for Hire as text. The inactive status would be greyed with the dot no more blinking and text saying Fully Booked.

![Available for Hire](../../Downloads/otw-wireframes/OTW%20Widget%20-%20Available%20for%20Hire.png)

![Fully Booked](../../Downloads/otw-wireframes/OTW%20Widget%20-%20Booked.png)

- The mandatory requirements for any widget are: It has to be a button component, It needs to have a binary status - Active or Inactive - to define the button's functionality, there must be some non NULL text (widgetText) to show on the button, and there should be conversionFlowUrl assigned to each widget to direct user on click.

- Optional parameters that can be part of the widget are: any icons or css animations or additional texts.

- The widget will render wherever the client pastes the code snippet.

- Performance: Use async attribute in script tag to load the widget asynchronously. Design the widget to render within ShadowDOM to have no effect on other elements of client CSS.

- The HTML code snippet that client embeds in their website and the widget loader script that inputs the widget CSS and configuration should be under MIT license and should not inherit the license from rest of the code.




