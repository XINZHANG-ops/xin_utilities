/**
 * State Module - Global State Variables
 *
 * This module contains all global state variables used throughout the whiteboard application.
 * State is organized into logical sections:
 * - Collaboration state (WebSocket, users, board info)
 * - Follow mode state
 * - Canvas/drawing state (tools, colors, sizes)
 * - Multi-page state
 * - Selection state
 * - Undo/redo stacks
 * - Reference dimensions and zoom
 * - Clipboard state
 * - Laser pointer state
 * - Remote drawing cache
 */

// ========== Collaboration State ==========
let socket = null;
let currentBoard = null;
let currentUser = null;
let remoteUsers = {};
let isLocalMode = false;

// ========== Follow Mode State ==========
let followingUserId = null;
let isFollowingUser = false;
let followScrollDebounceTimer = null;

// ========== User ID (Persistent) ==========
// Persistent user ID to avoid duplicates on reconnect
let userId = localStorage.getItem('wb-user-id');
if (!userId) {
  userId = 'user_' + Math.random().toString(36).substr(2, 9);
  localStorage.setItem('wb-user-id', userId);
}

// ========== User Colors ==========
const userColors = [
  '#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#30d158',
  '#00c7be', '#007aff', '#5856d6', '#af52de', '#ff2d55'
];

// ========== Canvas Reference Dimensions ==========
// Fixed reference size for coordinate normalization (independent of zoom/screen)
const REF_WIDTH = 1920;
const REF_HEIGHT = 1080;

// ========== Canvas Display Size ==========
// Canvas display size - fixed to reference size for consistency
let canvasLogicalWidth = REF_WIDTH;
let canvasLogicalHeight = REF_HEIGHT;

// ========== DPI Support ==========
const dpr = window.devicePixelRatio || 1;

// ========== Zoom State ==========
let canvasZoom = 100;

// ========== Local Storage Key ==========
const STORAGE_KEY = 'xin-whiteboard-state';

// ========== Drawing Tool State ==========
let currentTool = 'select';
let currentColor = '#1d1d1f';
let brushType = 'pen';  // 'pen' or 'highlighter'
let strokeSize = 3;
let eraserSize = 20;  // Separate size for eraser
let opacity = 1;
let isDrawing = false;
let startX, startY;

// ========== Multi-Page State ==========
const MAX_PAGES = 5;
let pages = [{
  objects: [],
  background: { pattern: 'none', color: '#ffffff' },
  history: [],
  historyIndex: -1,
  historySeq: []
}];
let currentPageIndex = 0;
let pageThumbnailFocused = false;

// ========== Current Page Data (References) ==========
// These are references to the current page's data
let objects = pages[0].objects;
let history = pages[0].history;
let historyIndex = pages[0].historyIndex;

// Sequence numbers for local mode history entries (parallel array)
let historySeq = [];

// ========== Selection State ==========
let selectedObjects = [];
let dragHandle = null;
let dragStartX, dragStartY;
let dragPrevStates = {}; // Object ID -> previous state for undo tracking
let editingObject = null;
let editingObjectPrevState = null; // For undo tracking
let currentDrawingId = null;

// ========== Selection Box State (Marquee Selection) ==========
let isSelectingBox = false;
let selectBoxStart = null;
let selectBoxEnd = null;

// ========== Undo/Redo Stacks ==========
// Global operation sequence counter for tracking undo order
let globalOpSequence = 0;

// Local operation log for user-specific undo/redo (only tracks current user's operations)
let localUndoStack = []; // Array of { action, objId, objState, pageIndex, seq }
let localRedoStack = [];
const MAX_LOCAL_UNDO = 50;

// Global undo stack for page operations
let pageUndoStack = []; // Array of { type, page, index, seq }

// ========== Clipboard State ==========
let clipboard = null;
let clipboardType = null; // 'objects' or 'page'
let clipboardBackground = null;

// ========== Laser Pointer State ==========
// Laser pointer state (temporary strokes that fade out)
let laserStrokes = []; // Array of { id, points: [{x, y, time}], userId }
let laserAnimationId = null;
const LASER_FADE_DURATION = 2000; // ms for full fade
const LASER_STROKE_SIZE = 3;

// ========== Remote Drawing Cache ==========
// Cache for remote drawing objects being drawn in real-time
let remoteDrawingObjects = {};


// ========== Cursor Emit Throttle ==========
let lastCursorEmit = 0;

// ========== Drag Emit Throttle ==========
let lastDragEmit = 0;
const DRAG_EMIT_INTERVAL = 50;  // ms between drag position updates

// ========== Tool Panel State ==========
let toolPanels = {};
let activePanel = null;
let shapePreview = null;
let openPageMenuIndex = null;
let draggedPageIndex = null;

// ========== Sticky Note State ==========
let pendingStickyPosition = null;
let editingStickyObject = null;  // For editing existing sticky via modal
let editingStickyPrevState = null;
let stickyColor = '#ffd60a';
let currentStickyColor = '#ffd60a';

// ========== Shape Style State ==========
let strokeColor = '#1d1d1f';
let shapeStrokeColor = '#1d1d1f';
let shapeFillColor = 'transparent';
let currentShape = 'rect';
let currentBackground = { pattern: 'none', color: '#ffffff' };

// ========== Shape Icons ==========
// Inner SVG elements only - the parent SVG element is already in HTML (viewBox 0 0 24 24)
const shapeIcons = {
  rect: '<rect x="3" y="3" width="18" height="18" rx="2"/>',
  circle: '<circle cx="12" cy="12" r="9"/>',
  arrow: '<path d="M 3 5 H 12 V 3 L 21 12 L 12 21 V 19 H 3 Z"/>'
};

// Brush type icons (viewBox 0 0 12 12)
const brushIcons = {
  pen: '<rect x="8" y="0.9" width="2.9" height="5.6" rx="0.5" fill="currentColor" stroke="currentColor" stroke-width="0.5" transform="rotate(41.8 9.5 2.3)"/><polygon points="5.2,5 7.3,6.9 3.3,11.3 1.2,11.6 1.2,9.5" fill="currentColor" stroke="currentColor" stroke-width="0.5" stroke-linejoin="round"/><polygon points="7,1.3 7.7,2 7.3,2.2 7,1.9 4.1,5.2 3.8,4.9" fill="none" stroke="currentColor" stroke-width="0.5" stroke-linejoin="round"/>',
  highlighter: '<polygon points="8.8,0.5 11.2,2.1 8.4,6.1 6.1,4.5" fill="currentColor" stroke="currentColor" stroke-width="1" stroke-linejoin="round" transform="rotate(9.6 8.7 3.3)"/><polygon points="1.7,9 2.6,10.7 0.2,10.7" fill="currentColor" stroke="currentColor" stroke-width="0.1" stroke-linejoin="round" transform="rotate(-0.1 1.5 10.3)"/><polygon points="4.3,5 6.7,6.6 3.9,10.6 1.6,9" fill="currentColor" stroke="currentColor" stroke-width="1" stroke-linejoin="round" transform="rotate(10.8 4.2 7.8)"/>'
};

// ========== Text Editing State ==========
let textColorIndicator = null;
let textColor = '#1d1d1f';
let textFontSize = 16;
let textAlign = 'left';
