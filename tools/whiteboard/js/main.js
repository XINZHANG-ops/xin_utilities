/**
 * main.js - Whiteboard Main Entry Point
 *
 * This is the main entry point that ties all modules together.
 * Responsibilities:
 * - Get all DOM element references
 * - Set up event listeners for tools, controls, and UI interactions
 * - Initialize canvas and i18n
 * - Handle board modal logic (create/join/local mode)
 * - Load from localStorage in local mode
 * - Handle URL params for board ID
 * - Window resize handler
 * - PDF download handler
 *
 * All functions from other modules (state.js, utils.js, canvas.js, etc.)
 * are available as globals.
 */

// Preload fonts immediately so they're ready when board loads
if (document.fonts && document.fonts.load) {
  document.fonts.load('700 16px Nunito');
  document.fonts.load('400 16px "Plus Jakarta Sans"');
}

// ========== DOM Element References ==========
let canvas;
let ctx;
let canvasWrapper;
let canvasContainer;
let colorPicker;
let strokeSizeSlider;
let opacitySlider;
let saveIndicator;
let textSizeControl;
let textSizeSlider;
let textBoldBtn;
let prevPageBtn;
let nextPageBtn;
let pageInfo;

// Board Modal
let boardModal;
let createTab;
let joinTab;
let userNameInput;
let joinUserNameInput;
let newBoardNameInput;
let joinBoardNameInput;
let createBoardBtn;
let joinBoardBtn;
let createError;
let joinError;
let localModeLink;

// WebSocket Status
let wsStatus;
let wsStatusText;
let usersOnlineEl;
let remoteCursorsEl;

// Shape and Text Controls
let shapeTool;
let shapeToolIcon;
let textStyleBtn;
let textStyleMenu;
let shapeStrokeBtn;
let shapeStrokeDropdown;
let shapeFillBtn;
let shapeFillDropdown;

// Sticky Modal
let stickyModal;
let stickyTextarea;
let stickyCancelBtn;
let stickySaveBtn;

// Object Menu
let objectMenuBtn;
let objectMenuDropdown;

// Zoom Controls
let zoomBtn;
let zoomDropdown;

// Page Controls
let pageIndicator;
let pageDropdown;
let pageGrid;

// Board Title
let boardTitle;

/**
 * Initialize all DOM element references
 */
function getDOMElements() {
  // Canvas and main controls
  canvas = document.getElementById('canvas');
  ctx = canvas.getContext('2d');
  canvasWrapper = document.getElementById('canvasWrapper');
  canvasContainer = document.getElementById('canvasContainer');
  colorPicker = document.getElementById('colorPicker');
  strokeSizeSlider = document.getElementById('strokeSize');
  opacitySlider = document.getElementById('opacity');
  saveIndicator = document.getElementById('saveIndicator');

  // Text controls
  textSizeControl = document.getElementById('textSizeControl');
  textSizeSlider = document.getElementById('textSizeSlider');
  textBoldBtn = document.getElementById('textBoldBtn');

  // Page navigation
  prevPageBtn = document.getElementById('prevPageBtn');
  nextPageBtn = document.getElementById('nextPageBtn');
  pageInfo = document.getElementById('pageInfo');

  // Board modal
  boardModal = document.getElementById('boardModal');
  createTab = document.getElementById('createTab');
  joinTab = document.getElementById('joinTab');
  userNameInput = document.getElementById('userName');
  joinUserNameInput = document.getElementById('joinUserName');
  newBoardNameInput = document.getElementById('newBoardName');
  joinBoardNameInput = document.getElementById('joinBoardName');
  createBoardBtn = document.getElementById('createBoardBtn');
  joinBoardBtn = document.getElementById('joinBoardBtn');
  createError = document.getElementById('createError');
  joinError = document.getElementById('joinError');
  localModeLink = document.getElementById('localModeLink');

  // WebSocket status
  wsStatus = document.getElementById('wsStatus');
  wsStatusText = document.getElementById('wsStatusText');
  usersOnlineEl = document.getElementById('usersOnline');
  remoteCursorsEl = document.getElementById('remoteCursors');

  // Shape and text controls
  shapeTool = document.getElementById('shapeTool');
  shapeToolIcon = document.getElementById('shapeToolIcon');
  textStyleBtn = document.getElementById('textStyleBtn');
  textStyleMenu = document.getElementById('textStyleMenu');
  shapeStrokeBtn = document.getElementById('shapeStrokeBtn');
  shapeStrokeDropdown = document.getElementById('shapeStrokeDropdown');
  shapeFillBtn = document.getElementById('shapeFillBtn');
  shapeFillDropdown = document.getElementById('shapeFillDropdown');

  // Sticky modal
  stickyModal = document.getElementById('stickyModal');
  stickyTextarea = document.getElementById('stickyTextarea');
  stickyCancelBtn = document.getElementById('stickyCancelBtn');
  stickySaveBtn = document.getElementById('stickySaveBtn');

  // Object menu
  objectMenuBtn = document.getElementById('objectMenuBtn');
  objectMenuDropdown = document.getElementById('objectMenuDropdown');

  // Zoom controls
  zoomBtn = document.getElementById('zoomBtn');
  zoomDropdown = document.getElementById('zoomDropdown');

  // Page controls
  pageIndicator = document.getElementById('pageIndicator');
  pageDropdown = document.getElementById('pageDropdown');
  pageGrid = document.getElementById('pageGrid');

  // Board title
  boardTitle = document.getElementById('boardTitle');
}

/**
 * Setup board modal event handlers
 */
function setupBoardModal() {
  // Load saved user name
  const savedUserName = localStorage.getItem('wb-user-name') || generateRandomName();
  userNameInput.value = savedUserName;
  joinUserNameInput.value = savedUserName;

  // Tab switching
  document.querySelectorAll('.modal-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const tabName = tab.dataset.tab;
      createTab.style.display = tabName === 'create' ? 'block' : 'none';
      joinTab.style.display = tabName === 'join' ? 'block' : 'none';
      joinError.style.display = 'none';
    });
  });

  // Create board
  createBoardBtn.addEventListener('click', async () => {
    isLocalMode = false; // Reset in case user was previously in local mode
    const boardName = newBoardNameInput.value.trim();
    const userName = userNameInput.value.trim() || generateRandomName();
    if (!boardName) return;

    createError.style.display = 'none';

    // Check if board already exists
    try {
      const res = await API_CONFIG.fetch(`/whiteboard/${boardName}/exists`);
      const data = await res.json();
      if (data.exists) {
        createError.textContent = I18n.t('whiteboard.collab.boardExists');
        createError.style.display = 'block';
        return;
      }
    } catch (e) {
      // If check fails, proceed anyway
    }

    localStorage.setItem('wb-user-name', userName);
    localStorage.setItem('wb-last-board', boardName);
    currentUser = { id: userId, name: userName, color: generateUserColor(userName) };
    currentBoard = { id: boardName, name: boardName };

    boardModal.style.display = 'none';
    boardTitle.textContent = boardName;

    resetCanvasView();

    // Save empty board immediately (bypass debounce)
    await saveBoardToServer(true);

    connectWebSocket();
  });

  // Join board
  joinBoardBtn.addEventListener('click', async () => {
    isLocalMode = false; // Reset in case user was previously in local mode
    const boardName = joinBoardNameInput.value.trim();
    const userName = joinUserNameInput.value.trim() || generateRandomName();
    if (!boardName) return;

    joinError.style.display = 'none';

    try {
      const res = await API_CONFIG.fetch(`/whiteboard/${boardName}/exists`);
      const data = await res.json();

      if (data.exists) {
        localStorage.setItem('wb-user-name', userName);
        localStorage.setItem('wb-last-board', boardName);
        currentUser = { id: userId, name: userName, color: generateUserColor(userName) };
        currentBoard = { id: boardName, name: boardName };

        boardModal.style.display = 'none';
        boardTitle.textContent = boardName;

        resetCanvasView();

        connectWebSocket();
        loadBoardFromServer();
      } else {
        joinError.textContent = I18n.t('whiteboard.collab.boardNotFound');
        joinError.style.display = 'block';
      }
    } catch (e) {
      joinError.textContent = I18n.t('whiteboard.collab.boardNotFound');
      joinError.style.display = 'block';
    }
  });

  // Local mode
  localModeLink.addEventListener('click', () => {
    isLocalMode = true;
    currentUser = null;
    remoteUsers = {};
    boardModal.style.display = 'none';
    resetCanvasView();
    wsStatus.style.display = 'flex';
    updateConnectionStatus('local');
    usersOnlineEl.innerHTML = '';
    loadFromLocalStorage();
  });
}

/**
 * Setup tool button event handlers
 */
function setupToolButtons() {
  // Tool button click handlers
  document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const tool = btn.dataset.tool;

      // Handle image tool specially
      if (tool === 'image') {
        document.getElementById('imageUploadInput').click();
        return;
      }

      // Handle sticky tool - open modal immediately
      if (tool === 'sticky') {
        closeAllPanels();
        // Calculate center of visible canvas area
        const rect = canvas.getBoundingClientRect();
        const centerX = (canvasWrapper.scrollLeft + canvasWrapper.clientWidth / 2) - rect.left + canvasWrapper.getBoundingClientRect().left;
        const centerY = (canvasWrapper.scrollTop + canvasWrapper.clientHeight / 2) - rect.top + canvasWrapper.getBoundingClientRect().top;
        openStickyModal(centerX - 100, centerY - 75); // Offset by half sticky size
        return;
      }

      // If tool has panel, toggle panel
      if (btn.classList.contains('has-panel')) {
        if (btn.classList.contains('active') && activePanel) {
          closeAllPanels();
        } else {
          selectTool(tool, btn);
          showToolPanel(tool, btn);
        }
      } else {
        closeAllPanels();
        selectTool(tool, btn);
      }
    });
  });

  // Shape panel buttons
  document.querySelectorAll('#shapePanel [data-shape]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      currentShape = btn.dataset.shape;
      currentTool = currentShape;

      // Update shape tool icon
      shapeToolIcon.innerHTML = shapeIcons[currentShape];
      shapeTool.dataset.tool = currentShape;

      // Update active state in panel
      document.querySelectorAll('#shapePanel [data-shape]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Brush panel buttons
  document.querySelectorAll('#brushPanel [data-size]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      strokeSize = parseInt(btn.dataset.size);
      strokeSizeSlider.value = strokeSize;
      document.querySelectorAll('#brushPanel [data-size]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Eraser panel buttons
  document.querySelectorAll('#eraserPanel [data-size]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      eraserSize = parseInt(btn.dataset.size);
      document.querySelectorAll('#eraserPanel [data-size]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Color buttons in tool panels
  document.querySelectorAll('.tool-panel .color-btn[data-color]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const panel = btn.closest('.tool-panel');
      const color = btn.dataset.color;

      // Different panels set different color variables
      if (panel.id === 'shapePanel') {
        shapeStrokeColor = color;
        strokeColor = color;
      } else if (panel.id === 'brushPanel') {
        currentColor = color;
        if (colorPicker) colorPicker.value = color;
      }

      // Update active state in same panel
      panel.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Close panels when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.tool-panel') && !e.target.closest('.tool-btn')) {
      closeAllPanels();
    }
  });
}

/**
 * Setup color picker
 */
function setupColorPicker() {
  if (colorPicker) {
    colorPicker.addEventListener('input', (e) => {
      setColor(e.target.value, true);
    });
  }

  // Stroke size slider - applies to current tool or selected shapes
  if (strokeSizeSlider) {
    strokeSizeSlider.addEventListener('input', (e) => {
      strokeSize = parseInt(e.target.value);

      // Apply to selected shapes if any
      selectedObjects.forEach(obj => {
        if (['rect', 'circle', 'arrow'].includes(obj.type)) {
          updateObjectProps(obj, { size: strokeSize });
        }
      });
      redraw();
    });

    strokeSizeSlider.addEventListener('change', () => {
      if (selectedObjects.length > 0) {
        saveState();
      }
    });
  }

  // Opacity slider
  if (opacitySlider) {
    opacitySlider.addEventListener('input', (e) => {
      opacity = parseInt(e.target.value) / 100;

      // Apply to selected shapes if any
      selectedObjects.forEach(obj => {
        if (['rect', 'circle', 'arrow', 'brush'].includes(obj.type)) {
          updateObjectProps(obj, { opacity: opacity });
        }
      });
      redraw();
    });

    opacitySlider.addEventListener('change', () => {
      if (selectedObjects.length > 0) {
        saveState();
      }
    });
  }
}

/**
 * Setup zoom controls
 */
function setupZoomControls() {
  zoomBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    zoomDropdown.classList.toggle('open');
  });

  document.querySelectorAll('.zoom-option').forEach(opt => {
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      const zoom = parseInt(opt.dataset.zoom);
      setZoom(zoom);
      document.querySelectorAll('.zoom-option').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      zoomDropdown.classList.remove('open');
    });
  });

  // Close zoom dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.zoom-selector')) {
      zoomDropdown.classList.remove('open');
    }
  });
}

/**
 * Setup page controls
 */
function setupPageControls() {
  // Page navigation buttons
  prevPageBtn.addEventListener('click', () => switchToPage(currentPageIndex - 1));
  nextPageBtn.addEventListener('click', () => {
    if (currentPageIndex < pages.length - 1) {
      switchToPage(currentPageIndex + 1);
    } else if (pages.length < MAX_PAGES) {
      addNewPage();
    }
  });

  pageIndicator.addEventListener('click', (e) => {
    // Only toggle if clicking on the page indicator button itself, not the dropdown
    if (e.target.closest('#pageDropdown')) return;
    e.stopPropagation();
    pageDropdown.classList.toggle('open');
    if (pageDropdown.classList.contains('open')) {
      refreshPageGrid();
    }
  });

  document.getElementById('pageDropdownClose').addEventListener('click', (e) => {
    e.stopPropagation();
    pageDropdown.classList.remove('open');
  });

  // Prevent clicks inside the dropdown from closing it
  pageDropdown.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  // Close page dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!pageDropdown.contains(e.target) && !pageIndicator.contains(e.target)) {
      pageDropdown.classList.remove('open');
      // Close all page thumb menus
      document.querySelectorAll('.page-thumb-menu').forEach(m => m.classList.remove('open'));
      document.querySelectorAll('.page-thumb-dropdown').forEach(d => d.classList.remove('open'));
    }
  });
}

/**
 * Setup undo/redo buttons
 */
function setupHistoryControls() {
  document.getElementById('undoBtn').addEventListener('click', () => undo());
  document.getElementById('redoBtn').addEventListener('click', () => redo());
}

/**
 * Setup image upload handler
 */
function setupImageUpload() {
  document.getElementById('imageUploadInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          // Calculate center of visible canvas area
          const rect = canvas.getBoundingClientRect();
          const centerX = (canvasWrapper.scrollLeft + canvasWrapper.clientWidth / 2) - rect.left + canvasWrapper.getBoundingClientRect().left;
          const centerY = (canvasWrapper.scrollTop + canvasWrapper.clientHeight / 2) - rect.top + canvasWrapper.getBoundingClientRect().top;

          // Scale image to fit canvas if too large
          let width = img.width;
          let height = img.height;
          const maxSize = 600;
          if (width > maxSize || height > maxSize) {
            const scale = maxSize / Math.max(width, height);
            width = width * scale;
            height = height * scale;
          }

          const obj = {
            id: generateObjectId(),
            type: 'image',
            x: centerX - width / 2,
            y: centerY - height / 2,
            width: width,
            height: height,
            img: img,
            imgSrc: ev.target.result
          };

          objects.push(obj);
          saveLocalOperation('add', obj, null);
          saveState();
          emitObjectChange('add', obj);
          redraw();
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    }
    e.target.value = ''; // Reset input
  });
}

/**
 * Setup sticky note controls
 */
function setupStickyControls() {
  // Color options in modal
  document.querySelectorAll('.sticky-color-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      currentStickyColor = btn.dataset.color;
      stickyTextarea.style.background = currentStickyColor;
      document.querySelectorAll('.sticky-color-opt').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Cancel button
  stickyCancelBtn.addEventListener('click', () => {
    closeStickyModal();
  });

  // Save button
  stickySaveBtn.addEventListener('click', () => {
    const text = stickyTextarea.value.trim();
    if (editingStickyObject) {
      // Edit existing sticky
      editingStickyObject.text = text;
      editingStickyObject.color = currentStickyColor;
      editingStickyObject.lastModified = Date.now();  // Timestamp for Last Write Wins
      saveLocalOperation('update', editingStickyObject, editingStickyPrevState);
      saveState();
      emitObjectChange('update', editingStickyObject);
      redraw();
    } else if (pendingStickyPosition) {
      // Create new sticky
      const newSticky = {
        id: generateObjectId(),
        type: 'sticky',
        x: pendingStickyPosition.x,
        y: pendingStickyPosition.y,
        width: 200,
        height: 150,
        color: currentStickyColor,
        textColor: '#1d1d1f',
        text: text,
        fontSize: 16,
        bold: false
      };
      objects.push(newSticky);
      selectedObjects = [newSticky];
      saveLocalOperation('add', newSticky, null);
      saveState();
      emitObjectChange('add', newSticky);
      switchToSelectTool();
      updateSelectedControls();
      redraw();
    }
    closeStickyModal();
  });

  // Click outside modal to close
  stickyModal.addEventListener('click', (e) => {
    if (e.target === stickyModal) closeStickyModal();
  });

  // Enter to save, Shift+Enter for newline
  stickyTextarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      stickySaveBtn.click();
    }
  });
}

/**
 * Setup object menu
 */
function setupObjectMenu() {
  objectMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    objectMenuDropdown.classList.toggle('open');
  });

  document.querySelectorAll('.object-menu-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = item.dataset.action;

      if (selectedObjects.length === 0) {
        objectMenuDropdown.classList.remove('open');
        return;
      }

      if (action === 'front') {
        bringToFront();
      } else if (action === 'forward') {
        bringForward();
      } else if (action === 'backward') {
        sendBackward();
      } else if (action === 'back') {
        sendToBack();
      } else if (action === 'delete') {
        deleteSelected();
      } else if (action === 'duplicate') {
        duplicateSelected();
      } else if (action === 'copy') {
        copySelected();
      } else if (action === 'paste') {
        pasteSelected();
      }

      objectMenuDropdown.classList.remove('open');
    });
  });
}

/**
 * Setup shape stroke/fill controls
 */
function setupShapeControls() {
  // Stroke color
  shapeStrokeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    shapeStrokeDropdown.classList.toggle('open');
    shapeFillDropdown.classList.remove('open');
  });

  document.querySelectorAll('#shapeStrokeDropdown .toolbar-color-option').forEach(opt => {
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      shapeStrokeColor = opt.dataset.color;
      strokeColor = shapeStrokeColor;
      if (shapeStrokeColor !== 'transparent') {
        colorPicker.value = shapeStrokeColor;
      }

      const strokeIndicator = document.getElementById('shapeStrokeIndicator');
      strokeIndicator.style.background = shapeStrokeColor === 'transparent' ?
        'linear-gradient(135deg, transparent 45%, #ff0000 45%, #ff0000 55%, transparent 55%)' :
        shapeStrokeColor;

      // Update selected shape objects
      selectedObjects.forEach(obj => {
        if (obj.type === 'rect' || obj.type === 'circle' || obj.type === 'arrow') {
          updateObjectProps(obj, { color: shapeStrokeColor });
        }
      });

      updateColorButtons();
      saveState();
      redraw();

      document.querySelectorAll('#shapeStrokeDropdown .toolbar-color-option').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      shapeStrokeDropdown.classList.remove('open');
    });
  });

  // Fill color
  shapeFillBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    shapeFillDropdown.classList.toggle('open');
    shapeStrokeDropdown.classList.remove('open');
  });

  document.querySelectorAll('#shapeFillDropdown .toolbar-color-option').forEach(opt => {
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      shapeFillColor = opt.dataset.color;

      const fillIndicator = document.getElementById('shapeFillIndicator');
      fillIndicator.style.background = shapeFillColor === 'transparent' ?
        'linear-gradient(135deg, transparent 45%, #ff0000 45%, #ff0000 55%, transparent 55%)' :
        shapeFillColor;

      // Update selected shape objects
      selectedObjects.forEach(obj => {
        if (obj.type === 'rect' || obj.type === 'circle' || obj.type === 'arrow') {
          updateObjectProps(obj, { fillColor: shapeFillColor });
        }
      });

      saveState();
      redraw();

      document.querySelectorAll('#shapeFillDropdown .toolbar-color-option').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      shapeFillDropdown.classList.remove('open');
    });
  });
}

/**
 * Setup background controls
 */
function setupBackgroundControls() {
  const bgBtn = document.getElementById('bgBtn');
  const bgDropdown = document.getElementById('bgDropdown');

  if (!bgBtn || !bgDropdown) return;

  // Toggle dropdown
  bgBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    bgDropdown.classList.toggle('open');
  });

  // Pattern options
  bgDropdown.querySelectorAll('.bg-pattern-option').forEach(opt => {
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      const pattern = opt.dataset.pattern;
      setPageBackground(pattern, undefined);

      bgDropdown.querySelectorAll('.bg-pattern-option').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
    });
  });

  // Color options
  bgDropdown.querySelectorAll('.bg-color-option').forEach(opt => {
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      const color = opt.dataset.color;
      setPageBackground(undefined, color);

      bgDropdown.querySelectorAll('.bg-color-option').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
    });
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#bgBtn') && !e.target.closest('#bgDropdown')) {
      bgDropdown.classList.remove('open');
    }
  });
}

/**
 * Setup clear canvas button
 */
function setupClearButton() {
  document.getElementById('clearBtn').addEventListener('click', () => {
    if (objects.length === 0) return;
    // Save current state before clearing (for undo)
    saveState();
    objects = [];
    selectedObjects = [];
    updateSelectedControls();
    // Save to page state without adding to history again
    saveCurrentPageState();
    redraw();
    updatePageUI();
    refreshPageGridIfOpen();
    saveToLocalStorage();
    emitClear();
  });
}

/**
 * Setup PDF download button
 */
function setupPDFDownload() {
  document.getElementById('downloadBtn').addEventListener('click', async () => {
    const { jsPDF } = window.jspdf;

    // Save current state
    const originalPageIndex = currentPageIndex;
    const originalSelected = [...selectedObjects];
    selectedObjects = [];

    // Create PDF with canvas dimensions
    const pdfWidth = canvas.width;
    const pdfHeight = canvas.height;
    const pdf = new jsPDF({
      orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
      unit: 'px',
      format: [pdfWidth, pdfHeight]
    });

    // Render each page
    for (let i = 0; i < pages.length; i++) {
      if (i > 0) {
        pdf.addPage([pdfWidth, pdfHeight], pdfWidth > pdfHeight ? 'landscape' : 'portrait');
      }

      // Switch to page and render synchronously
      await switchToPageForExport(i);
      redrawNow();

      // Add canvas as image
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    }

    // Restore original state
    await switchToPageForExport(originalPageIndex);
    selectedObjects = originalSelected;
    redrawNow();

    // Download PDF
    const boardName = currentBoard ? currentBoard.name : 'whiteboard';
    pdf.save(`${boardName}.pdf`);
  });
}

/**
 * Setup language toggle
 */
function setupLanguageToggle() {
  const langToggle = document.getElementById('langToggle');
  if (langToggle) {
    langToggle.addEventListener('click', () => {
      I18n.toggle();
    });
  }
}

/**
 * Setup board title click to copy
 */
function setupBoardTitleCopy() {
  boardTitle.addEventListener('click', async () => {
    if (!currentBoard) return;
    try {
      await navigator.clipboard.writeText(currentBoard.name);
      const original = boardTitle.textContent;
      boardTitle.textContent = I18n.t('whiteboard.collab.copied');
      setTimeout(() => {
        boardTitle.textContent = original;
      }, 1500);
    } catch (e) {
      console.error('Failed to copy:', e);
    }
  });
}

/**
 * Setup follow user exit button
 */
function setupFollowControls() {
  document.getElementById('followExitBtn').addEventListener('click', stopFollowingUser);
}

/**
 * Setup window resize handler
 */
function setupWindowResize() {
  window.addEventListener('resize', () => {
    setupCanvas();
    redraw();
  });
}

/**
 * Handle URL params for board ID
 */
function handleURLParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const urlBoardId = urlParams.get('board');
  if (urlBoardId) {
    joinBoardNameInput.value = urlBoardId;
    document.querySelector('[data-tab="join"]').click();
  }
}

/**
 * Auto-fill last board name
 */
function autoFillLastBoard() {
  const urlParams = new URLSearchParams(window.location.search);
  const urlBoardId = urlParams.get('board');
  const lastBoard = localStorage.getItem('wb-last-board');
  if (lastBoard && !urlBoardId) {
    newBoardNameInput.value = lastBoard;
  }
}

/**
 * Initialize board modal visibility
 */
function initBoardModal() {
  wsStatus.style.display = 'none';
  usersOnlineEl.innerHTML = '';
}

/**
 * Setup text toolbar controls
 */
function setupTextControls() {
  const textColorBtn = document.getElementById('textColorBtn');
  const textColorDropdown = document.getElementById('textColorDropdown');
  const textStyleBtn = document.getElementById('textStyleBtn');
  const textStyleMenu = document.getElementById('textStyleMenu');
  const textStyleLabel = document.getElementById('textStyleLabel');

  // Text color button
  if (textColorBtn && textColorDropdown) {
    textColorBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      textColorDropdown.classList.toggle('open');
      if (textStyleMenu) textStyleMenu.classList.remove('open');
    });

    document.querySelectorAll('#textColorDropdown .toolbar-color-option').forEach(opt => {
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        const color = opt.dataset.color;
        textColor = color;
        textColorIndicator.style.background = color;

        // Update selected text objects
        selectedObjects.forEach(obj => {
          if (obj.type === 'textbox' || obj.type === 'sticky') {
            updateObjectProps(obj, { textColor: color });
          }
        });

        document.querySelectorAll('#textColorDropdown .toolbar-color-option').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');

        saveState();
        redraw();
        textColorDropdown.classList.remove('open');
      });
    });
  }

  // Text style dropdown (Display/Title/Subtitle/Normal/Caption)
  if (textStyleBtn && textStyleMenu) {
    textStyleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      textStyleMenu.classList.toggle('open');
      if (textColorDropdown) textColorDropdown.classList.remove('open');
    });

    document.querySelectorAll('.text-style-option').forEach(opt => {
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        const size = parseInt(opt.dataset.size);
        const style = opt.dataset.style;
        textFontSize = size;

        // Update label
        if (textStyleLabel) textStyleLabel.textContent = opt.textContent;

        // Update active state
        document.querySelectorAll('.text-style-option').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');

        // Update selected text objects
        selectedObjects.forEach(obj => {
          if (obj.type === 'textbox' || obj.type === 'sticky') {
            updateObjectProps(obj, { fontSize: size });
          }
        });

        saveState();
        redraw();
        textStyleMenu.classList.remove('open');
      });
    });
  }

  // Text alignment buttons
  document.querySelectorAll('.align-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const align = btn.dataset.align;
      textAlign = align;

      document.querySelectorAll('.align-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Update selected text objects
      selectedObjects.forEach(obj => {
        if (obj.type === 'textbox') {
          updateObjectProps(obj, { textAlign: align });
        }
      });

      saveState();
      redraw();
    });
  });

  // Close dropdowns when clicking elsewhere
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#textStyleDropdown')) {
      if (textStyleMenu) textStyleMenu.classList.remove('open');
    }
    if (!e.target.closest('#textColorBtn') && !e.target.closest('#textColorDropdown')) {
      if (textColorDropdown) textColorDropdown.classList.remove('open');
    }
  });

  // Text size slider
  if (textSizeSlider) {
    textSizeSlider.addEventListener('input', (e) => {
      const textElements = selectedObjects.filter(o => o.type === 'textbox' || o.type === 'sticky');
      if (textElements.length > 0) {
        textElements.forEach(obj => updateObjectProps(obj, { fontSize: parseInt(e.target.value) }));
        saveState();
        redraw();
      }
    });
  }

  // Text bold button
  if (textBoldBtn) {
    textBoldBtn.addEventListener('click', () => {
      const textElements = selectedObjects.filter(o => o.type === 'textbox' || o.type === 'sticky');
      if (textElements.length > 0) {
        const newBold = !textElements[0].bold;
        textElements.forEach(obj => updateObjectProps(obj, { bold: newBold }));
        textBoldBtn.classList.toggle('active', newBold);
        saveState();
        redraw();
      }
    });
  }
}

/**
 * Setup sticky note toolbar controls (for changing color of selected sticky)
 */
function setupStickyToolbar() {
  document.querySelectorAll('.sticky-toolbar-color').forEach(btn => {
    btn.addEventListener('click', () => {
      const color = btn.dataset.stickyColor;

      // Update button states
      document.querySelectorAll('.sticky-toolbar-color').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Update selected sticky notes
      selectedObjects.forEach(obj => {
        if (obj.type === 'sticky') {
          updateObjectProps(obj, { color: color });
        }
      });

      saveState();
      redraw();
    });
  });
}

/**
 * Initialize tool panels mapping
 */
function initToolPanels() {
  toolPanels = {
    brush: document.getElementById('brushPanel'),
    eraser: document.getElementById('eraserPanel'),
    shape: document.getElementById('shapePanel'),
    rect: document.getElementById('shapePanel'),
    circle: document.getElementById('shapePanel'),
    arrow: document.getElementById('shapePanel')
  };

  // Get text color indicator element
  textColorIndicator = document.getElementById('textColorIndicator');
}

/**
 * Main initialization function
 */
function init() {
  // Get all DOM element references
  getDOMElements();

  // Initialize tool panels
  initToolPanels();

  // Setup canvas
  setupCanvas();

  // Setup all event handlers
  setupBoardModal();
  setupToolButtons();
  setupColorPicker();
  setupZoomControls();
  setupPageControls();
  setupHistoryControls();
  setupImageUpload();
  setupStickyControls();
  setupObjectMenu();
  setupShapeControls();
  setupTextControls();
  setupStickyToolbar();
  setupBackgroundControls();
  setupClearButton();
  setupPDFDownload();
  setupLanguageToggle();
  setupFollowControls();
  setupBoardTitleCopy();
  setupWindowResize();

  // Initialize canvas event listeners
  initEventListeners();

  // Handle URL params
  handleURLParams();
  autoFillLastBoard();

  // Initialize board modal
  initBoardModal();

  // Initial draw
  redraw();
}

// Run initialization when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Save before user leaves the page (flush any pending debounced saves)
// Use sendBeacon for reliable delivery during page unload
window.addEventListener('beforeunload', () => {
  if (!isLocalMode && currentBoard) {
    saveCurrentPageState();
    const pagesData = pages.map(page => ({
      objects: page.objects.map(obj => {
        const ratioObj = toRatio(obj);
        if (obj.type === 'image') {
          return { ...ratioObj, imgSrc: obj.imgSrc, img: undefined };
        }
        return ratioObj;
      }),
      background: page.background || { pattern: 'none', color: '#ffffff' }
    }));
    const boardData = JSON.stringify({
      id: currentBoard.id,
      name: currentBoard.name,
      pages: pagesData,
      currentPageIndex,
      updatedAt: new Date().toISOString()
    });
    // sendBeacon is reliable during page unload (unlike fetch/XHR)
    navigator.sendBeacon(
      API_CONFIG.getBaseUrl() + `/whiteboard/${currentBoard.id}`,
      new Blob([boardData], { type: 'application/json' })
    );
  }
});
