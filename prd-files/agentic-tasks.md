# Agentic Tasks

These tasks should use the APIs described in @prd-files/api-documentation-resume-scoring.md

All below developments are for the Client Side App - Pitch Like This Studio. Use the already set design language of the platform including Fonts, Colors, Dark and Light Mode and any other elements.

Develop the below features for all Viewports: Desktop, Tablet and Mobile.

## Taske 1: Uploading Resumes

Objective: A User should be able to upload their resumes from the profile section or through the dashboard if no resumes exist in the profile.

Steps:
1. A user logs into the Studio
2. If the user has no uploaded resumes yet, display a section above the 'Projects' section in /dashboard, where user can click "Upload Resume", add a PDF file and save.
3. If the user already has a resume uploaded in the profile the same section now allows the user to enter a JD to score their resume.
4. Update Profile Page now has a list of resumes added to the profile and allows adding any new resumes. The List displays the Resume Name and Upload Date. The list also has a icon to remove the resume from the listing - post removal the resume will be soft deleted.
5. If the resume upload fails: return an error message as a toast. As subsequent resumes are being added, they are verified for idempotency and any only unique are accepted - uploading same resumes should show an error as toast.

## Task 2: Scoring Resumes for a JD

Objective: A User should be able to add a JD in the form of URL or pasted text and receive a score comapring the resume fit to a Job Description.

Steps:
1. Once user has atleast one resume uploaded within their profile, the top section of Studio now is updated to allow the user to enter a Job Description to score their Resume. 2. Provide an input field container which requests JD in the form of a URL or a Pasted Text.
3. Post input - detect URL or text. Show a status label saying "JD Detected" once the input is accessible and then continue connecting with the APIs.
4. As the Task is created and JD is added, show the status of the teask in the status label.
5. The status of the task is to be collected through websockets created by the client.
6. When the scoring is completed, a report is generated and the section updates to show the Score of the Resume on the UI align with the rubrics and provide a CTA to download the report from the resume.