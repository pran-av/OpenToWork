# Epic: Segregating Service Classes and Case Studies

Service Classes (or Types) and Case Studies have been strictly campaign and project specific until now. We wish to make them independant so that user can have more flexibility to create these cases outside of the camapign flows.

Hence going forward the uses cases of Pitch Like This will not only be campaign management, but also experience record keeping.

## Goals
1. P0: The user should be able to create case studies and their service classes/types on a  independant of projects and campaigns.
2. P0: The user should get a separate dashboard for CRUD related to services and case studies.
3. P0: The user need not create the same service classes multiple times, they can create them once and then assign/create all other relevant case studies within them.
4. P0: During the process of campaign creation, the user should be able to search (by title) and re-use the already existing case studies (mapped to a service class) into a campaign or multiple campaigns.
5. P1: During campaign creation flow, if a user does not have the necessary case study available on search - they can create a new one by invoking case study creation flow during the campaign creation flow.

## Design System

Strictly follow the following design system for all elements part of the landing page.

**Fonts**
Primary Poppins - use for Headings, Subheadings, Logos
Secondary Inter - use for CTA text, everything else

**Colour**
1. Primary - #FF8C00
2. Secondary - #FFB800
3. Tertiary - #E07B39
4. Neutral - #74777F

Can use shades of above for appropriate use cases.

All design change should be strictly responsive.

## Flows

### A User wants to record new experiences as case studies

1. The user logs onto Pitch Like This
2. The home page dashboard (which currently shows a list of projects) - should display a vertical expansion of user's career timeline. Imagine the entire window to be a canvas - wherein the experiences are placed (in the form of case studies and maybe other artifacts later). The timeline is arranged by year (yyyy - latest first) from the information received through Duration field within the case study - if the duration is May 2025 to May 2026 - always start year is where the case study is mapped. (timeline year scale should be on left)
4. If there are 12 cases in 2025 arrange them in rows and columns for the year 2025 on the timeline. The arrangement should be spacious so that the background canvas is visible.
5. All experiences will be mapped out on the same timeline, even if they are from different service classes. The Experinece Cards for the purpose of dashboard will have a Label describing the service class.
6. The Projects List is moved to a separate page, users can access it via a Navigaton button "View Projects" in the header. The UI and functionality for Projects Dashboard remain same.
7. In the experience timeline which is now the home dashboard - the user gets a button which is hover and fixed on the bottom center of canvas which allows them to "Add New Experiences" - the user should mandatorily select a service class from existing classes through a dropdown or have an option to create a new service class.
8. The names of service classes should be unique
9. Post selecting service class the case study is written with existing creation flow. On click Save the case study is avaialble on canvas and ready to use in any campaigns.
10. All already created cases should be visible on the canvas.

Sample UI for the Canvas Dashboard:
Note: only for reference and representation - do not copy exactly. Instead of grids use dotted canvas.

[Experience Canvas](../../../Downloads/otw-wireframes/wireframe-experience-dashboard.png)


