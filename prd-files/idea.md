# Goal
Provide freelancers and agencies with tools that would improve lead conversions within their personal website. This tool acts as a dedicated sales consultant to help leads figure your skills and what to hire you for. This tool will know more about you than any other generic job boards like Linkedin or Naukri.

# Future of this idea

The MVP would be a basic Open To Work indicator that can be placed anywhere on the website and track leads received. However later on the product will integrate AI that can pitch you based on specific use cases or roles that your visitors are looking for.

# MVP Structure

Let's call the recruiters, hiring managers, or founders landing on your website as leads. While the owner of the website is the client.

## Lead Conversion Flow

A page or multiple pages that sell the skills of the client to convert the lead. They may pitch client case studies, might collect lead inputs and make suggestions and finally help leads take actions.

Includes,
### Phase 1: Campaigns, Widget and Lead Capture
- Dynamic user pages /u/[username]/[projectID]/[pageID]
- Pagewise metadata like professional summary, services provided, skills, etc
- CTAs like calendar link, email button, etc
- Customisations like animations, themes, etc to make the pages look unique

### Lead Capture API
- Validate and save data submitted by the leads
- Trigger alerts or Process actions

### Lead Input Storage
- database schema
- migration and storage
- security and privacy

### Widget
- vanilla JS script that loads an indicator in UI for "Open To Work" with custom text
- onclick trigger lead conversion flow

## Phase 2: Client Dashboard

This is a dashboard that the client uses to create their own widget, copy code snippet and place in their website. This also holds other metadata that the client intends to be displayed in the flow.

Includes,
### Client Dashboard UI
- create a project
- within project collect mandatory and optional metadata fields
- save to db

### Widget Config Panel
- link widget to a project
- define CTAs
- define color theme

### Embed Code Generator
- generate code as per widget config
- displays preview

### Leads page
- list of lead details filtered by projectID
- export to sheets/excel

## Phase 3: Accessibility

These are secondary features that allows clients to make purchase of our service and access dashboard.

Includes,
### Auth
- Email Login
- user profile - free and paid
- user payment plan
- Store user data
- Privacy policy and delete account

### Payments
- Integrate dodo payments
- Start with a single lifetime plan
- User plan update

### Serviceability Guard
- Verify user plan
- Free User access
- Paid User access

## Phase 4: Marketing Site

A website for this tool mentioning features and pricing and CTA to make payments

Includes,
### Home Page
- Hero Section with CTA
- Testimonials
- Features
- Pricing
- FAQs
- Privacy Policy, Service Terms and Conditions

### User Joruney
- Free User trying out the product
- Free User making a Payment
- User Signup to dashboard
