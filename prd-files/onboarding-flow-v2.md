# Onboarding Flow V2

The UI SageWindow functionality will remain unchanged. However, new v2 flow APIs will be integrated for the Onboarding Flow operations.

Whenever a New User is detected, the onboarding flow v2 should be automatically started. On first authenticated app load, call POST /api/agent/v2/flows/start with { "flow_type": "ONBOARDING", "conversation_id": null }.

To Do List will only display CLIENT or USER type steps or UI Actions and not the SERVER Steps.

Use the same UI-UX for Onboarding highlights. However following optimizations:
1. While highlighted, the user should be able to click or engage with that UI component.
2. In the information modals that display tooltip and message, remove the CTAs "Got It" and "I'll Do It Later" (and the legacy v1 ack logic) and instead add a "Next" CTA for sequential progression.
3. Client progression model: client receives the server list of `ui_actions` and progresses through it sequentially as user clicks or presses the modal button.
4. Contract wording for client acknowledgements:
   - UI Action done: send `ui-actions/ack` with `state: "STEP_DONE"` and the action `target`.
   - UI Action skipped: send `ui-actions/ack` with `state: "STEP_SKIPPED"` (or `ui-actions/nack` if that route is used by proxy).
   - **Do not** call `steps/execute_onboarding_todos/ack` with `STEP_SKIPPED` for "Back to Sage". On the server that **bulk-skips every remaining onboarding UI action**, runs the closing summary, and ends the flow—so the user gets a fresh onboarding after re-login instead of resume. For "Back to Sage", **`ack` only the checkpoint target** (`onboarding.congrats.*`) with **`STEP_DONE`** (preferred) and navigate to Sage; leave `execute_onboarding_todos` **unchanged** until Parts 2–3 are actually done or individually skipped via UI action acks.
5. Resume model for To Do List:
   - Single CTA: "Start Onboarding" or "Resume Onboarding".
   - Show "Resume Onboarding" when any action under `execute_onboarding_todos` is already `STEP_DONE` or `STEP_SKIPPED`.
6. On returning to SageWindow mid-todo-list, `execute_onboarding_todos` remains **`STEP_ISSUED`** until all UI actions under it are done or skipped per-item; Sage then continues with remaining items or server close steps.
6. For Mobile and Tablet Viewports - SageWindow will be fullscreen (unlike Desktop Viewport which keeps the existing design)
    - A Switch would be available to enable and disable "Sage Mode". Clicking enable opens SageWindow full screen with all its features. The same switch is available to disable Sage Mode. If the user wishes navigate to the app - they first disable Sage Mode.
    - A vertical switch is positioned on the background Canvas in center-right of the screen - adjusted to responsiveness of screen sizes. The switch remains at same position if the user wants to switch back to the app functionalities.
    - When onboarding is trigerred in these viewports, automatically turn off switch for Sage Mode and then sequentially start the onboarding flow. Note: The positions of CTAs and UI elements would differ from desktop - so note that.
    - Post onboarding actions are done, enable Sage Mode again so user goes back to the SageWindow

The UI Action related to the client app are following (develop for all viewports):

Part 1: Experience Creation
1. target="nav.experience_dashboard": Highlights the Nav button leading to Experience Dashboard.
2. target="experience_dashboard.experience.create_cta": Highlight the Add Experience button
3. target="experience.form.service_class": Highlight the Service Class Dropdown, let user select a service before proceeding to next step
3. target="experience.form.display_year": Highlight display year field. Prefill it to 2026 for the user.
4. target="experience.form.case_title": When highlighted Prefill to "Sample Onboarding Experience". User can edit if they wish.
5. target="experience.form.case_summary": When highlighted prefill to "Sample Case Summary for Onboarding Flow"
6. target="experience.form.prototype_link": Just highlight and show info - no prefill as its optional
7. target="experience.form.highlights": Prefill as "Add a Quantitative Impact here"
8. target="experience.form.save": User has to click Save or can Click Next CTA for the Save to happen during onboarding flow
9. target="onboarding.congrats.experience_recorded": Highlight the created experience. The info modal will have an extra secondary button that says "Back to Sage": **`ack` this target with `STEP_DONE`**, then navigate to SageWindow. Do **not** step-ack `execute_onboarding_todos` as skipped.

Part 1 + Part 2 completion rule:
- These are intentionally guidance-first actions. For these targets, completion may be marked `STEP_DONE` on highlight-click or explicit "Next" CTA, as designed.
- Save/publish helper behavior remains allowed where client automates save on "Next".

Part 2: Campaign Launch
10. target="nav.campaigns_dashboard": Highlight the Campaign Dashboard nav button
11: target="campaigns_dashboard.project.create_cta": Highlight Create Project, user clicks to open, modal Opens, prefill "Onboarding Sample Project" - highlight Create Project - user can click Next to proceed too
12. target="campaigns_dashboard.project.campaign.create_cta": Highlight Create New Campaign CTA, user clicks, modal opens prefill "Onboarding Campaign", highlight Create Campaign - user can click Next to proceed too
13. target="campaign.form.title": highlight and prefill with "Hire Me for XYZ Role"
14. target="campaign.form.summary": highlight and prefill with "Summary about me"
15. target="campaign.form.call_to_action": highlight and prefill email with "youremail@example.com"
16. target="campaign.form.link_experiences": Highlight the Recently Added Experience so user can click add button to add it.
17. target="campaign.form.publish": Highlight the Publish button
18.  target="campaigns.project_url.copy": On Projects page highlight the Project URL that user can copy and share
19. target="onboarding.congrats.campaign_launched": Highlight the Active Campaign. The info modal will have an extra secondary button that says "Back to Sage": **`ack` this target with `STEP_DONE`**, then navigate to SageWindow. Do **not** step-ack `execute_onboarding_todos` as skipped.

Part 3: Update Profile
20. target="nav.profile": Highlight Profile Navigation cta
21. target="profile.user_name.edit": Detect if Display Name already present. If yes auto ack as completed. If no, highlight the panel where user adds First Name and Last Name. Allow user to edit while highlighted and save. Instead of Next, allow only Skip button. Mark completed only after backend-compatible success condition (Display Name persisted).
22. target="profile.resume.upload_cta": Detect if at least one resume already exists. If yes auto ack as completed. Highlight the Resume upload panel in profile section. Allow the user to upload resume. Instead of Next, allow only Skip button. Mark complete only after backend-compatible success condition (successful upload detected).
23. target="profile.linkedin.connect_cta": Detect if LinkedIn is already connected. If yes, auto ack as completed. Otherwise highlight the LinkedIn connect section and let the user proceed through the connection. Instead of Next, allow only Skip button. Mark complete only after backend-compatible success condition (connection success detected).

Part 3 completion rule:
- Part 3 is data-quality sensitive and must not be marked done on generic click.
- Client must ack `STEP_DONE` only after verification condition is met; otherwise keep pending or ack `STEP_SKIPPED` if user intentionally skips.

24. target="nav.sage_window" Takes user automatically back to SageWindow once all UI Actions are completed.
