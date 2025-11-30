# OpenToWork Widget

## Overview

The OpenToWork Widget is a lightweight, embeddable component that displays a client's availability status and provides a call-to-action button to their lead conversion flow.

## Features

- ✅ **Shadow DOM Isolation** - No CSS conflicts with host page
- ✅ **Async Loading** - Doesn't block page rendering
- ✅ **Responsive Design** - Works on all screen sizes
- ✅ **Accessible** - ARIA labels and keyboard navigation
- ✅ **MIT Licensed** - Free to use and modify

## Widget States

### Available for Hire (Active)
- Green blinking status dot
- Clickable button
- Opens campaign URL in new tab
- Text: "Available for Hire" (or custom text)

### Fully Booked (Inactive)
- Grey status dot (no animation)
- Non-clickable
- Text: "Fully Booked" (or custom text)

## Embedding the Widget

### Step 1: Get Your Widget ID

Your widget ID is a UUID that you'll receive when creating a widget in the OpenToWork dashboard.

### Step 2: Add Embed Code

Add the following code to your website where you want the widget to appear:

```html
<div id="my-action-button-widget" data-widget-id="YOUR_WIDGET_ID_HERE"></div>
<script src="https://yourdomain.com/widget-loader.js" async></script>
```

**Important:** Replace:
- `YOUR_WIDGET_ID_HERE` with your actual widget ID
- `https://yourdomain.com` with your OpenToWork domain

### Step 3: Customize (Optional)

You can customize the widget container:

```html
<div 
  id="my-action-button-widget" 
  data-widget-id="YOUR_WIDGET_ID_HERE"
  style="display: inline-block;"
></div>
<script src="https://yourdomain.com/widget-loader.js" async></script>
```

## Widget Configuration

Widgets are configured in the database with the following properties:

- **widget_text**: Text displayed on the button (max 25 characters)
- **is_active**: Boolean determining if widget is clickable
- **design_attributes**: JSON object with:
  - `color_primary`: Primary color (hex)
  - `color_secondary`: Secondary/background color (hex)
  - `custom_css`: Additional CSS rules

## API Endpoint

The widget loader fetches configuration from:
```
GET /api/widgets/{widgetId}
```

Response format:
```json
{
  "widget_id": "uuid",
  "campaign_id": "uuid",
  "is_active": true,
  "widget_text": "Available for Hire",
  "destination_url": "https://...",
  "design": {
    "asset_type": "default_button",
    "color_primary": "#0066cc",
    "color_secondary": "#FFFFFF",
    "custom_css": "..."
  }
}
```

## Testing

### Test Widget ID
For the test campaign, use widget ID: `236d9fef-df4d-4e01-beed-edcc1381f95b`

### Test Embed Code
```html
<div id="test-widget" data-widget-id="236d9fef-df4d-4e01-beed-edcc1381f95b"></div>
<script src="http://localhost:3000/widget-loader.js" async></script>
```

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

The widget loader script (`widget-loader.js`) is licensed under the MIT License. See `widget-loader.js.LICENSE` for details.

## Support

For issues or questions, please contact support or refer to the main project documentation.

