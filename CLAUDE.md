# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Xin Utilities is a collection of browser-based utility tools hosted on GitHub Pages. All tools are pure HTML/CSS/JavaScript with no build step required.

## Architecture

```
xin_utilities/
├── index.html                    # Main hub page with tool categories
├── reference.html                # Design reference (Apple-style dark theme)
└── tools/
    └── {category}/
        └── {tool-name}/
            └── index.html        # Self-contained tool page
```

**Key Design Patterns:**
- Each tool is a single self-contained HTML file with inline CSS and JavaScript
- Tools use Tailwind CSS via CDN and Plus Jakarta Sans font
- Dark theme with CSS variables: `--bg: #000`, `--accent: #2997ff`, etc.
- Navigation includes back link to main hub (`../../index.html`)

## Development

No build process. Open HTML files directly in browser or use any local server:
```bash
# Python
python -m http.server 8000

# Node.js
npx serve
```

## Adding New Tools

1. Create directory: `tools/{category}/{tool-name}/`
2. Create `index.html` following existing tool structure (see `tools/image-cropper/index.html`)
3. Add entry to main `index.html` under appropriate category card

## Style Guidelines

- Follow `reference.html` design aesthetic (Apple-inspired dark UI)
- Use existing CSS variables for colors
- Use `.card`, `.btn-primary`, `.btn-secondary` classes
- Tools should have nav bar with back link and tool title
