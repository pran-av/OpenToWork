# PRD for Website design and copy

Note: Refer to this PRD on website related designs and copy. Any functionalities in this PRD are specific to the website. Also this PRD will include design language expected for the website development and screenshots to assist with development.

## Agenda of the website

Our Elevator Pitch app helps users create quick shareable links to their elevator pitches. It offers ability for our users to express uniqueness and be specific by communicating relevant data.

Given the agenda of our product, the website needs to have the unique and convincing qualities. As per the name Elevator Pitch which refers to convincing someone before the elevator reaches its destination - we have tried to bring the elevator elements into our design.

## Requirements

**Website page url**: The website will be on '/'

**Functionality of the website**:
The website should be functional on all viewports defined for this app. The following pointers are optimized for mobile, make reasonable decisions to optimize for the tablet and desktop viewports.

**Scroll functionality**: The user action is an up scroll instead of a down scroll. The Ground Floor (hero section) is the bottom most part of the website - the subsequent website sections are above the hero section meaning the user has to scroll upwards to visit them. The website scroll will end when the user reaches on the top floor which is currently the 7th Floor.

Refer attached wireframes for designing the components for the website. All values in pixel. Color values in hex.

### Default Elements of the Website - P0

1. The website has a default elevator background: Image linked, adjust this image for each viewport, for all viewports ensure that the image is centered, the zoom levels can differ based on viewport. For mobile viewport - match the screen size with the height of the image.
![sample image](../../../Downloads/otw-wireframes/elevator-backgrounf.png.png)
2. The image has a overlay filter to adjust the contrast: FFE4B9 at 64% opacity. Every subsequent element in this website should be over this overlay. When the user scrolls the website the background image along with the overlay stays fixed.
3. Other fixed elements to the screen: Elevator Buttons, Floor Indicator, and Elevator Music are fixed to the screen as the user scrolls.
- **Elevator Buttons**: 
    1. These are clickable buttons merged into left side margin of the screen. For mobile they first elevator button starts from 20% above the bottom of the screen. 35 pixel gap between two buttons.
    2. Functionality: The bottom most button is 'G', and continue upwards till the number '7'. Hovering on these buttons expand them rightwards to display context on what floor it is. Each floor will have a title which will be shown on expand. example the ground floor title is "Introduction". Add placholder titles for later updates. 
    3. Wireframe shows: expanded state, expanded button has 25px padding on both sides based on the length of text - hence each button width will differ. side corners have a radius of 15. Color FFFED3, border stroke black, Font Inter bold 16px ![elevator button expand](../../../Downloads/otw-wireframes/floor_buttons_expanded_state.png). 
    3. On click: user is taken to the position of the website indicating that particular floor.
- **Floor Indicator**:
    1. The floor indicator describes the position of the user on the website. The do not display floor title, instead they just say "Ground Floor", "First Floor", uptil "Seventh Floor".
    2. These is just an indicator and hence not clickable.
    3. Dimensions For mobile: W203 center aligned H 45, top corners have a radius of 25. Color FFFED3, border stroke black, Font Inter regular 16px
    4. Wireframe: ![floor indicator](../../../Downloads/otw-wireframes/floor%20indicator.png)
- **Elevator Music**:
    1. A toggle switch which on click enables or disables music. Use a musical note icon - off state with a cancelled slash. Default music is off.
    2. Sample Icon in off state: ![music on and off](../../../Downloads/otw-wireframes/music%20on%20and%20off.png)
    3. Positioning: Top right of the screen. 24 px square icon.

### Hero Section - P0

Wireframe: ![Hero Section](../../../Downloads/otw-wireframes/Elevator%20Pitch%20App%20Hero%20(2).png)

1. Title: Consider ground floor as a hero section. The hero section has a page title "create your own elevator pitch in minutes". This title is divided into different elements described below:
    - "Elevator Pitch" as primary title: Bold 64 Comic Neue color: 2F0057
    - "create your own" above primary title Bold 20 Inter black
    - "in minutes" below the primary title Bold 20 Inter black
    - Beta Tag: after the "Pitch" word. Enclosed in a container with fill color FFF6AC. "BETA" all caps Bold 20 Inter. 10 corner radius all sides.
2. Call To Action: A button "Create Pitch" all caps Inter Semi Bold 20. White button with black border stroke. 5 corner radius all sides.
    - Mobile Positioning: post 30% height from bottom.
    - On CTA click: In same tab take user to 'https://elevateyourpitch.netlify.app/auth'
3. Scroll Up Indicator: Three upward chevrons with 48px square each for mobile.
    - add animation the chevron, preferable a wave like animation amongst the chevron
    - "scroll up" written below the chevron Inter 12px regular
4. How to Use Cards: Set of three cards that on mobile are horizontally on infinite autoscroll. Snap scroll - 6 second per card. Corner radius for cards 10px. Cards should have drop shadow. Wireframes: ![how to cards](../../../Downloads/otw-wireframes/how-to-cards%20new.png)
    - per card W177 H207 for mobile. background color FFE3E3 title text black semibold 20 Inter
    - Card 1: Title "Create a Pitch". ![create pitch card image](../../../Downloads/otw-wireframes/case_study_cta_modified_3d%20(1)%201.png)
    - Card 2: Title "Publish the Pitch". ![publish pitch image](../../../Downloads/otw-wireframes/publish_cta_3d%201.png)
    - Card 3: Title "Copy and Share Pitch". ![copy share pitch image](../../../Downloads/otw-wireframes/copy_share_url_3d%201.png)

### Prelude Screen - P2

Before the hero section loads, I want a loading screen that fills the page with following content as in the wireframe:

Sentence 1: Imagine being in an elevator with someone who might hire you or be your future client.

Sentence 2: What would you do to **convince them** before the elevator reaches its destination?

Sentence 3: You would craft a story, add convincing pointers, be quick and be unique to  keep their attention.

Sentence 4: **Elevator Pitch** is an app that helps you make that pitch!

1. Each sentence appears on the screen through a slow outwards diffusion one by one - from top to the bottom. Based on its position.
2. The jumbled tags storytelling, convincing, being unique, and time discipline appear at the very end in the postion meant for them.
3. This prelude is should be responsive for mobile, tablet and desktop, refer the wireframes for each.
4. Top right has the same music icon that can be muted or unmuted. Default mute.
5. Once all the content involved in the prelude is loaded - we automatically move to the Hero section (aka ground floor). The prelude and the rest of the website can be the same page file, the prelude screen can act as preloader or opening animation while the main website loads.

![wireframe-mobile](../../../Downloads/otw-wireframes/elevator%20pitch%20prelude.png)

![wireframe-desktop](../../../Downloads/otw-wireframes/prelude-desktop.png)

![wireframe-tablet](../../../Downloads/otw-wireframes/prelude%20tablet.png)

## Desktop ViewPort - P1

Wireframe: ![Desktop Site](../../../Downloads/otw-wireframes/elevator-pitch-desktop.png)

Changes compared to mobile viewport:
1. The fixed element sizes and positioning remain the same: this includes floor indicator, floor buttons, music and switch.
2. The hero section elements change scale their sizes for desktop viewport
    - The How to Cards are not autoscrolling horizontally. Instead they are static to the center. The dimensions of the cards have increased - h265 w208. The images within the cards also scale proportionally.
    - "Elevator Pitch" font size is 96 and center aligned to the desktop screen. The "create your own" and "in minutes" font size becomes 32.
    - CREATE PITCH cta is center aligned with w277 and h67. Font size 24.
    - Scroll Up indicator has moved towards the bottom right corner

Anything not mentioned here remains the same.


## Tablet ViewPort - P1

Wireframe:  ![Tablet Site](../../../Downloads/otw-wireframes/elevator-app-tablet.png)

Changes compared to mobile viewport:
1. The fixed elements remain of the exact same sizes and positioning
2. The title fonts are same as Desktop viewport which is 96 and 32
3. The How to Cards sizes are also exactly same as the desktop version
4. The CREATE PITCH CTA size is also exactly same as the desktop version
5. The scroll up indicator is center aligned to the tablet screen - this property remains similar to mobile.

Anything not mentioned here remains the same.

## Other Floors - P0
As part of P0 do not create other sections of the website. If the user hovers on the floor buttons the text will say "Under Construction". On click the user stays on the hero section.

For testing purposes add a dummy first floor with placeholder content so that we can test the upwards scrolling

# Future Optimizations
1. Image delivery through CDN