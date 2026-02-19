# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Xin Utilities is a collection of browser-based utility tools hosted on GitHub Pages. All tools are pure HTML/CSS/JavaScript with no build step required.

## Architecture

```
xin_utilities/
├── index.html                    # Main hub page with tool categories
├── reference.html                # Design reference (Apple-style dark theme)
├── file_diff.py                  # Streamlit reference implementation
└── tools/
    ├── image-cropper/
    │   └── index.html            # Crop, rotate, flip, resize images
    ├── image-pixelate/
    │   └── index.html            # Pixelate images with 7 color algorithms
    ├── video-to-gif/
    │   └── index.html            # Convert video clips to GIF
    ├── image-annotate/
    │   └── index.html            # Draw and annotate on images
    ├── text-diff/
    │   └── index.html            # Compare text differences (git-style)
    └── whiteboard/
        └── index.html            # Online whiteboard for doodling
```

## Current Tools

### Image Tools (gradient-blue)
- **Image Cropper**: Rectangle/circle/polygon crop, rotate (preserves edges), flip H/V, resize
- **Image Pixelate**: 7 algorithms (Average, Median, Center, Mode, Dominant, Luminance, Min/Max)
- **Video to GIF**: Frame selection via timeline, custom width/quality/frame count
- **Image Annotate**: Draw/brush, shapes (rect, circle, arrow), adjustable color/size per shape

### Text Tools (gradient-purple)
- **Text Diff**: Side-by-side comparison, click to select version, download merged result

### Canvas Tools (gradient-green)
- **Whiteboard**: Full-screen canvas, brush/eraser, shapes, drag-and-drop images, auto-save to localStorage

## Key Design Patterns

- Each tool is a single self-contained HTML file with inline CSS and JavaScript
- Tools use Tailwind CSS via CDN and Plus Jakarta Sans font
- Dark theme with CSS variables: `--bg: #000`, `--accent: varies by category`
- Navigation includes back link to main hub (`../../index.html`)
- Color gradients per category:
  - `gradient-blue`: Image tools (#2997ff)
  - `gradient-purple`: Text tools (#bf5af2)
  - `gradient-green`: Media tools (#30d158)
  - `gradient-orange`: Developer tools (#ff9f0a)

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
3. Add entry to main `index.html` under appropriate category card
4. Use category-specific accent color in CSS variables

## Style Guidelines

- Follow `reference.html` design aesthetic (Apple-inspired dark UI)
- Use existing CSS variables for colors
- Use `.card`, `.btn-primary`, `.btn-secondary` classes
- Tools should have nav bar with back link and tool title
- Upload zones use dashed borders with hover/dragover states
- Results displayed in `.card` containers

## Technical Notes

- **Video to GIF**: Uses custom inline GIF encoder (no Web Workers) for file:// compatibility
- **Image Cropper**: Rotation uses bounding box calculation to preserve full image
- **Text Diff**: LCS-based diff algorithm with opcode merging
- **Image Annotate**: Shape selection with hit testing, drag handles for resize
- **Whiteboard**: Layer-based object system, localStorage persistence, image drag-and-drop with base64 storage
