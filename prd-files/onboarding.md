# Onboarding

Onboarding is not just to inform the user but to get them activated. And the best way to have them activated is to first understand their specific wants. Since we have LLMs that can converse in natural language - we can transform tranditional onboarding into a much pint point implementaiton. The metric remains same as traditional: Activation.

## Goal
1. Get the user activated - identify their intent of joining and based on that suggest them activities they can immediately perform.
2. Inform the user about long term benefits and how to leverage those using available features.
3. User should know where to access which feature and how to ask for help.

## Desktop Viewport

1. When any user sign up or log into PLT Studio, run the onboarding API call to initiate profile fetching in the background. The UI should diplay a notification strip below the header saying that Sage (the mascot that acts like an agent in background). [Wirefream shows a small strip below header with a loader icon](../../../Downloads/otw-wireframes/wireframe-desktop-onboarding-strip.png)
    - loading icon lucide react and the text saying some details are being fetched
2. Once Onboarding is ready then increase the strip height gradually for user to give space to complete the onboarding (remove the side container for agent and implement this UI instead). [Wireframe displays the expanded hortizontal window for Onboarding](../../../Downloads/otw-wireframes/wireframe-desktop-onboarding-started.png)
    - skip onboarding at top right
    - add overlay on the background Experience Canvas to make the onboarding screen prominent when open. 
    - On skipping onboarding the onboarding strip goes back to original height and shows a CTA to restart onboarding. Sage can be visible on the strip.
3. Use the [Sage](../../../Downloads/otw-wireframes/sage_mascot.png) mascot for conversations started by agent 

## Mobile and Tablet Viewports

Do not implement onboading