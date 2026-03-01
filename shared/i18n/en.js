// English Translations
I18n.register('en', {
  // Common
  common: {
    back: 'Back to Tools',
    backShort: 'Back',
    download: 'Download',
    downloadPng: 'Download PNG',
    downloadGif: 'Download GIF',
    clear: 'Clear',
    reset: 'Reset',
    close: 'Close',
    cancel: 'Cancel',
    confirm: 'Confirm',
    save: 'Save',
    saved: 'Saved',
    saving: 'Saving...',
    export: 'Export',
    upload: 'Upload',
    dragHere: 'Drag files here',
    orClick: 'or click to select',
    supportedFormats: 'Supports {formats}',
    processing: 'Processing, please wait...',
    pleaseWait: 'Please wait...',
    error: 'Error',
    success: 'Success',
    undo: 'Undo',
    redo: 'Redo',
    delete: 'Delete',
    preview: 'Preview',
    compare: 'Compare',
    single: 'Single',
    original: 'Original',
    result: 'Result',
    size: 'Size',
    width: 'Width',
    height: 'Height',
    quality: 'Quality',
    color: 'Color',
    thickness: 'Thickness',
    opacity: 'Opacity'
  },

  // Main Index Page
  index: {
    title: 'Xin Utilities',
    subtitle: "Xin's Utilities",
    toolCount: '{count} tools',

    // Categories
    imageTools: 'Image Tools',
    imageToolsDesc: 'Crop, annotate, remove background, convert',
    textTools: 'Text Tools',
    textToolsDesc: 'Compare, convert, format',
    canvasTools: 'Canvas Tools',
    canvasToolsDesc: 'Whiteboard, doodle, create',
    shareTools: 'Share Tools',
    shareToolsDesc: 'QR codes, link sharing',

    // Tool counts
    imageToolsCount: '5 tools',
    textToolsCount: '1 tool',
    canvasToolsCount: '1 tool',
    shareToolsCount: '2 tools',

    // Badges
    badgeEdit: 'Edit',
    badgeCollab: 'Collab',
    badgeEffect: 'Effect',
    badgeConvert: 'Convert',
    badgeAnnotate: 'Annotate',
    badgeAI: 'AI',
    badgeCompare: 'Compare',
    badgeDoodle: 'Doodle',
    badgeGenerate: 'Generate',

    // Tool Cards
    cropperTitle: 'Image Cropper',
    cropperDesc: 'Rectangle, circle, polygon cropping. Rotation auto-extends canvas. Supports flipping and resizing.',
    pixelateTitle: 'Image Pixelate',
    pixelateDesc: '7 color algorithms including average, median, mode, dominant color, etc. Real-time preview.',
    videoGifTitle: 'Video to GIF',
    videoGifDesc: 'Visual timeline segment selection. Custom frames, width, quality. Pure browser encoding.',
    annotateTitle: 'Image Annotate',
    annotateDesc: 'Brush drawing, add rectangles, circles, arrows. Adjustable shape size and position. Ctrl+Z undo.',
    bgRemoveTitle: 'Background Remover',
    bgRemoveDesc: 'AI-powered background removal for people, objects, and various scenes.',
    textDiffTitle: 'Text Diff',
    textDiffDesc: 'Side-by-side diff display, like Git Diff. Choose which side to use, download merged result.',
    whiteboardTitle: 'Whiteboard',
    whiteboardDesc: 'Doodle anytime. Brush, eraser, shapes, drag-and-drop images. Auto-saves to browser.',
    qrGeneratorTitle: 'QR Code Generator',
    qrGeneratorDesc: 'Quickly generate QR codes for links, text, WiFi, etc. Adjustable size, download PNG.',
    kanbanTitle: 'Kanban Board',
    kanbanDesc: 'Simple task board with drag-and-drop. Share with others via board code.',

    startUsing: 'Use Tool'
  },

  // Image Cropper
  cropper: {
    title: 'Image Cropper',
    upload: {
      dragHere: 'Drag image here',
      orClick: 'or click to select file',
      supportedFormats: 'Supports JPG, PNG, WebP, GIF'
    },
    actions: {
      reset: 'Reset',
      applyCrop: 'Apply Crop',
      clear: 'Clear Image'
    },
    cropMode: {
      title: 'Crop Mode',
      rectangle: 'Rectangle',
      circle: 'Circle',
      polygon: 'Polygon',
      hintRect: 'Drag the box on canvas to select crop area',
      hintCircle: 'Drag the circle on canvas to select crop area',
      hintPolygon: 'Click on canvas to add vertices'
    },
    aspectRatio: {
      free: 'Free',
      apply: 'Apply',
      width: 'W',
      height: 'H'
    },
    polygon: {
      hint: 'Click on canvas to add vertices, at least 3 points required',
      undo: 'Undo Point',
      clear: 'Clear'
    },
    rotate: {
      title: 'Rotate',
      ccw90: 'Rotate 90° CCW',
      cw90: 'Rotate 90° CW'
    },
    flip: {
      title: 'Flip',
      horizontal: 'Flip Horizontal',
      vertical: 'Flip Vertical'
    },
    resize: {
      title: 'Resize',
      width: 'Width',
      height: 'Height',
      lockAspect: 'Lock Aspect Ratio',
      apply: 'Apply'
    },
    export: {
      title: 'Export',
      png: 'PNG (Lossless)',
      jpeg: 'JPEG (Compressed)',
      webp: 'WebP (Recommended)',
      quality: 'Quality',
      download: 'Download Image'
    }
  },

  // Image Pixelate
  pixelate: {
    title: 'Image Pixelate',
    upload: {
      drag: 'Drag image here',
      click: 'or click to select file'
    },
    canvas: {
      original: 'Original',
      result: 'Pixelated'
    },
    blocks: {
      title: 'Block Count',
      horizontal: 'Horizontal Blocks',
      vertical: 'Vertical Blocks',
      auto: 'Auto',
      description: 'Auto-calculated based on image ratio, 1 = original',
      count: '{cols} × {rows} blocks'
    },
    algorithm: {
      title: 'Color Algorithm',
      average: {
        name: 'Average',
        desc: 'Calculate average RGB of all pixels in block, balanced effect'
      },
      median: {
        name: 'Median',
        desc: 'Take median of each channel, more robust to noise'
      },
      center: {
        name: 'Center Pixel',
        desc: 'Take center point color directly, fastest speed'
      },
      mode: {
        name: 'Mode',
        desc: 'Take most frequent color, suitable for solid color images'
      },
      dominant: {
        name: 'Dominant Color',
        desc: 'Find dominant color in block, best effect'
      },
      luminance: {
        name: 'Luminance Weighted',
        desc: 'Weighted by human eye sensitivity, more natural'
      },
      minmax: {
        name: 'Brightest/Darkest',
        desc: 'Take brightest or darkest pixel, artistic effect',
        brightest: 'Brightest Pixel',
        darkest: 'Darkest Pixel'
      }
    },
    export: {
      title: 'Export',
      format: {
        png: 'PNG (Lossless)',
        jpeg: 'JPEG (Compressed)',
        webp: 'WebP (Recommended)'
      },
      download: 'Download Image'
    }
  },

  // Background Remove
  bgRemove: {
    title: 'Background Remover',
    dragImage: 'Drag image here',
    supportedFormats: 'Supports JPG, PNG, WebP',
    removeBackground: 'Remove Background',
    downloadOriginal: 'Download Original Size',
    downloadCropped: 'Download Cropped',
    processingFailed: 'Processing failed'
  },

  // Video to GIF
  videoGif: {
    title: 'Video to GIF',
    dragDrop: 'Drag video here',
    orClick: 'or click to select file',
    supportedFormats: 'Supports MP4, WebM, AVI, MOV',
    previewSelection: 'Preview Selection',
    timeRange: 'Time Range',
    start: 'Start',
    end: 'End',
    duration: 'Duration',
    seconds: 'sec',
    gifSettings: 'GIF Settings',
    frames: 'Frames',
    framesUnit: 'frames',
    width: 'Width',
    quality: 'Quality',
    qualityBest: 'Best',
    qualityHigh: 'High',
    qualityMedium: 'Medium',
    qualityLow: 'Low',
    generateGif: 'Generate GIF',
    generating: 'Generating...',
    encoding: 'Encoding...',
    result: 'Generated Result',
    downloadGif: 'Download GIF'
  },

  // Image Annotate
  annotate: {
    title: 'Image Annotate',
    dragHere: 'Drag image here',
    orClick: 'or click to select file',
    brush: 'Brush',
    rectangle: 'Rectangle',
    circle: 'Circle',
    arrow: 'Arrow',
    strokeSize: 'Stroke Size',
    selectedShape: 'Selected shape:',
    deleteShape: 'Delete shape',
    resetEdit: 'Reset edits',
    deleteImage: 'Delete image',
    hint: 'Tip: Ctrl+Z to undo | Drag shape center to move, drag edges to resize',
    red: 'Red',
    orange: 'Orange',
    yellow: 'Yellow',
    green: 'Green',
    blue: 'Blue',
    white: 'White',
    undo: 'Undo (Ctrl+Z)',
    reset: 'Reset edits',
    clear: 'Delete image'
  },

  // Text Diff
  textDiff: {
    title: 'Text Diff',
    pasteText: 'Paste Text',
    uploadFile: 'Upload File',
    originalText: 'Original Text',
    modifiedText: 'Modified Text',
    originalFile: 'Original File',
    modifiedFile: 'Modified File',
    dragOrClick: 'Drag or click to select',
    leftPlaceholder: 'Enter or paste left text here...',
    rightPlaceholder: 'Enter or paste right text here...',
    originalPlaceholder: 'Paste or enter original text...',
    modifiedPlaceholder: 'Paste or enter modified text...',
    compareDiff: 'Compare Diff',
    compare: 'Compare',
    clearAll: 'Clear All',
    diffResult: 'Diff Result',
    clickToSelect: 'Click line to select version',
    defaultSelect: 'Default select:',
    leftSide: 'Left',
    rightSide: 'Right',
    additions: 'Additions',
    deletions: 'Deletions',
    deleted: 'Deleted',
    added: 'Added',
    selected: 'Selected',
    downloadMerged: 'Download Merged',
    diffBlock: 'Diff #{num}',
    clickSelectLeft: 'Click to select left',
    clickSelectRight: 'Click to select right',
    selectedLeft: '✓ Selected left',
    selectedRight: '✓ Selected right',
    diffCount: '{count} differences',
    addedLines: '+{count} lines',
    deletedLines: '-{count} lines'
  },

  // Whiteboard
  whiteboard: {
    title: 'Whiteboard',
    controls: {
      strokeSize: 'Stroke Size',
      fontSize: 'Font Size',
      opacity: 'Opacity',
      bold: 'Bold'
    },
    actions: {
      download: 'Download PDF',
      clear: 'Clear Canvas',
      clearFrame: 'Clear frame',
      undo: 'Undo',
      redo: 'Redo'
    },
    tools: {
      select: 'Select',
      brush: 'Brush',
      eraser: 'Eraser',
      rectangle: 'Rectangle',
      rect: 'Rectangle',
      circle: 'Circle',
      arrow: 'Arrow',
      stickyNote: 'Sticky Note',
      sticky: 'Sticky Note',
      textBox: 'Text Box',
      text: 'Text Box',
      image: 'Image',
      shapes: 'Shapes',
      laser: 'Laser Pointer'
    },
    colors: {
      black: 'Black',
      blue: 'Blue',
      yellow: 'Yellow'
    },
    page: {
      previous: 'Previous Page',
      next: 'Next Page',
      add: 'New Page'
    },
    hint: 'Drag to select | Shift+click for multi-select | Ctrl+C/V copy paste | Ctrl+Z undo | Delete to remove | Double-click to edit text',
    placeholder: {
      sticky: 'Enter sticky note content...',
      text: 'Enter text...'
    },
    status: {
      saving: 'Saving...',
      saved: 'Saved',
      storageFull: 'Storage full'
    },
    // Collaboration
    collab: {
      selectBoard: 'Select Board',
      createNew: 'Create New Board',
      joinExisting: 'Join Existing Board',
      boardName: 'Board Name',
      boardNamePlaceholder: 'Enter board name...',
      create: 'Create',
      join: 'Join',
      boardNotFound: 'Board not found',
      boardExists: 'Board already exists. Please join it or use a different name',
      connecting: 'Connecting...',
      connected: 'Connected',
      disconnected: 'Disconnected',
      reconnecting: 'Reconnecting...',
      liveSync: 'Live Sync',
      usersOnline: '{count} online',
      you: 'You',
      localMode: 'Local Mode',
      switchToLocal: 'Switch to Local',
      yourName: 'Your Name',
      namePlaceholder: 'Enter your name...',
      randomName: 'Random Name',
      userJoined: '{name} joined the board',
      userLeft: '{name} left the board',
      follow: {
        clickToFollow: 'Click to follow',
        following: 'Following',
        exit: 'Exit follow (ESC)'
      },
      clickToCopy: 'Click to copy',
      copied: 'Copied'
    },
    menu: {
      edit: 'Edit',
      duplicate: 'Duplicate',
      delete: 'Delete',
      bringToFront: 'Bring to Front',
      sendToBack: 'Send to Back'
    },
    background: {
      title: 'Background'
    }
  },

  // QR Generator
  qrGenerator: {
    title: 'QR Code Generator',
    inputLabel: 'Enter URL or text',
    inputPlaceholder: 'https://example.com or any text',
    size: 'Size',
    foregroundColor: 'Foreground (dots)',
    backgroundColor: 'Background',
    dotShape: 'Dot Shape',
    cornerShape: 'Corner Shape',
    square: 'Square',
    rounded: 'Rounded',
    dots: 'Dots',
    extraRounded: 'Extra Rounded',
    classy: 'Classy',
    classyRounded: 'Classy Rounded',
    circular: 'Circular',
    centerLogo: 'Center Logo (optional)',
    uploadLogo: 'Click to upload logo',
    logoHint: 'Square images recommended',
    logoWillShow: 'Logo will appear in QR center',
    removeLogo: 'Remove',
    generate: 'Generate QR Code',
    enterContent: 'Please enter URL or text',
    generateFirst: 'Please generate QR code first',
    placeholderHint: 'Enter content and click generate',
    logoSize: 'Logo Size',
    safeZoneShape: 'Safe Zone Shape',
    rectZone: 'Rectangle',
    circleZone: 'Circle',
    logoMargin: 'Margin',
    logoMarginHint: 'Positive extends whitespace, negative shows QR dots',
    logoRotation: 'Rotation',
    logoPosition: 'Position Offset',
    resetPosition: 'Reset Position',
    dragToMove: 'Drag logo to adjust position',
    // Tracking
    enableTracking: 'Enable Scan Tracking',
    trackingDesc: 'Track scan count and device info for this QR code',
    viewStats: 'View Stats',
    trackingEnabled: 'Tracking enabled, short link:',
    trackingServiceError: 'Cannot connect to tracking service, using original URL',
    // Stats modal
    scanStats: 'Scan Statistics',
    loading: 'Loading...',
    loadFailed: 'Load failed, please check backend service',
    totalScans: 'Total Scans',
    uniqueVisitors: 'Unique Visitors',
    deviceDistribution: 'Device Distribution',
    noData: 'No data yet',
    targetUrl: 'Target URL',
    createdAt: 'Created At'
  }
});
