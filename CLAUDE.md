# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Xin Utilities is a collection of browser-based utility tools hosted on GitHub Pages. All tools are pure HTML/CSS/JavaScript with no build step required. Supports Chinese/English i18n.

## Architecture

```
xin_utilities/
├── index.html                    # Main hub page with tool categories
├── reference.html                # Design reference (Apple-style dark theme)
├── shared/
│   ├── api-config.js             # Shared API configuration for backend calls
│   └── i18n/
│       ├── i18n.js               # i18n core: language detection, translation
│       ├── zh.js                 # Chinese translations
│       └── en.js                 # English translations
└── tools/
    ├── image-cropper/            # Crop, rotate, flip, resize images
    ├── image-pixelate/           # Pixelate images with 7 color algorithms
    ├── image-bg-remove/          # AI background removal (requires backend)
    ├── video-to-gif/             # Convert video clips to GIF
    ├── image-annotate/           # Draw and annotate on images
    ├── text-diff/                # Compare text differences (git-style)
    ├── whiteboard/               # Online whiteboard for doodling
    ├── qr-generator/             # QR codes with optional short links
    └── kanban/                   # Kanban board with drag-and-drop
```

## Current Tools

### Image Tools
- **Image Cropper**: Rectangle/circle/polygon crop, rotate (preserves edges), flip H/V, resize
- **Image Pixelate**: 7 algorithms (Average, Median, Center, Mode, Dominant, Luminance, Min/Max)
- **Image Background Remove**: AI-powered background removal, requires backend API
- **Video to GIF**: Frame selection via timeline, custom width/quality/frame count
- **Image Annotate**: Draw/brush, shapes (rect, circle, arrow), adjustable color/size per shape

### Text Tools
- **Text Diff**: Side-by-side comparison, click to select version, download merged result

### Canvas Tools
- **Whiteboard**: Full-screen canvas, brush/eraser, shapes, drag-and-drop images, auto-save to localStorage

### Share & Productivity Tools
- **QR Code Generator**: QR codes with qr-code-styling library, optional backend short links with click stats
- **Kanban Board**: Drag-and-drop task management, three columns (Todo/In Progress/Done), task attachments

## Key Design Patterns

- Each tool is a single self-contained HTML file with inline CSS and JavaScript
- Tools use Tailwind CSS via CDN and Plus Jakarta Sans font
- Dark theme with CSS variables: `--bg: #000`, `--accent: varies by category`
- Navigation includes back link to main hub (`../../index.html`)
- i18n support via `data-i18n`, `data-i18n-placeholder`, `data-i18n-title` attributes
- Color accents per category:
  - Blue: Image tools (#2997ff)
  - Purple: Text tools (#bf5af2)
  - Green: Canvas tools (#30d158)
  - Orange: Share/Productivity tools (#ff9f0a)

## Development

No build process. Open HTML files directly in browser or use any local server:
```bash
# Python
python -m http.server 8000

# Node.js
npx serve
```

## Adding New Tools

1. Create directory: `tools/{tool-name}/`
2. Create `index.html` following existing tool structure
3. Include i18n scripts and add translations to `shared/i18n/zh.js` and `en.js`
4. Add entry to main `index.html` under appropriate category card
5. Use category-specific accent color in CSS variables

## Style Guidelines

- Follow `reference.html` design aesthetic (Apple-inspired dark UI)
- Use existing CSS variables for colors
- Use `.card`, `.btn-primary`, `.btn-secondary` classes
- Tools should have nav bar with back link and tool title
- Upload zones use dashed borders with hover/dragover states
- Results displayed in `.card` containers

## Technical Notes

- **i18n**: Auto-detects browser language, stores preference in localStorage, translations in `shared/i18n/`
- **Video to GIF**: Custom inline GIF encoder (no Web Workers) for file:// compatibility
- **Image Cropper**: Rotation uses bounding box calculation to preserve full image
- **Text Diff**: LCS-based diff algorithm with opcode merging
- **Image Annotate**: Shape selection with hit testing, drag handles for resize
- **Whiteboard**: Layer-based object system, localStorage persistence, image drag-and-drop
- **Image Background Remove**: Binary file upload via FormData, requires backend with CORS headers
- **QR Code Generator**: Uses qr-code-styling library, optional backend for short links and click statistics
- **Kanban**: Drag-and-drop cards between columns, file attachments, localStorage persistence
