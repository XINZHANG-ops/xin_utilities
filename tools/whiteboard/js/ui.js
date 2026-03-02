/**
 * UI Interaction Functions
 *
 * This module contains all UI interaction logic including:
 * - Tool selection and toolbar panel management
 * - Color and size picker handlers
 * - Zoom controls
 * - Page dropdown and grid rendering
 * - Board modal (create/join board)
 * - Sticky note modal
 * - Object context menu
 * - Secondary toolbar controls (shapes, text, sticky)
 * - Tab switching and dropdown management
 *
 * Note: Uses global state variables from state.js
 */

// ========== Tool Selection & Panels ==========

function closeAllPanels() {
  Object.values(toolPanels).forEach(panel => {
    if (panel) panel.classList.remove('open');
  });
  activePanel = null;
}

function showToolPanel(toolName, btnEl) {
  closeAllPanels();
  const panel = toolPanels[toolName];
  if (panel) {
    const rect = btnEl.getBoundingClientRect();
    panel.style.top = (rect.top) + 'px';
    panel.classList.add('open');
    activePanel = panel;
  }
}

function selectTool(toolName, btnEl) {
  // Update active state
  document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');

  currentTool = toolName;
  isDrawing = false;
  shapePreview = null; // Clear any pending shape preview

  // Clear selection when switching to drawing tools
  if (currentTool !== 'select') {
    selectedObjects = [];
  }

  // Update cursor
  if (currentTool === 'select') {
    canvas.style.cursor = 'default';
  } else if (currentTool === 'sticky' || currentTool === 'text' || currentTool === 'image') {
    canvas.style.cursor = 'cell';
  } else {
    canvas.style.cursor = 'crosshair';
  }

  // Update secondary toolbar
  updateSecondaryToolbar(toolName);

  updateSelectedControls();
  redraw();
}

function updateSecondaryToolbar(toolName) {
  document.querySelectorAll('.secondary-toolbar-section').forEach(s => s.classList.remove('active'));

  if (['rect', 'circle', 'arrow'].includes(toolName)) {
    document.getElementById('shapeToolbarSection').classList.add('active');
  } else if (toolName === 'text') {
    document.getElementById('textToolbarSection').classList.add('active');
  } else {
    document.getElementById('defaultToolbarSection').classList.add('active');
  }
}

function switchToSelectTool() {
  document.querySelectorAll('[data-tool]').forEach(b => b.classList.remove('active'));
  document.querySelector('[data-tool="select"]').classList.add('active');
  currentTool = 'select';
  canvas.style.cursor = 'default';
}

function updateSelectedControls() {
  // Switch secondary toolbar based on selected object type
  document.querySelectorAll('.secondary-toolbar-section').forEach(s => s.classList.remove('active'));

  if (selectedObjects.length > 0) {
    const obj = selectedObjects[0];
    if (obj.type === 'rect' || obj.type === 'circle' || obj.type === 'arrow') {
      document.getElementById('shapeToolbarSection').classList.add('active');
      // Update shape toolbar to reflect current object
      setColor(obj.color || '#1d1d1f');
      strokeSizeSlider.value = obj.size || 3;
      // Update stroke indicator
      const strokeIndicator = document.getElementById('shapeStrokeIndicator');
      if (obj.color === 'transparent') {
        strokeIndicator.style.background = 'linear-gradient(45deg, #ccc 25%, transparent 25%),linear-gradient(-45deg, #ccc 25%, transparent 25%),linear-gradient(45deg, transparent 75%, #ccc 75%),linear-gradient(-45deg, transparent 75%, #ccc 75%)';
        strokeIndicator.style.backgroundSize = '4px 4px';
      } else {
        strokeIndicator.style.background = obj.color || '#1d1d1f';
        strokeIndicator.style.backgroundSize = '';
      }
      // Update fill indicator
      const fillIndicator = document.getElementById('shapeFillIndicator');
      const fillColor = obj.fillColor || 'transparent';
      if (fillColor === 'transparent') {
        fillIndicator.style.background = 'linear-gradient(45deg, #ccc 25%, transparent 25%),linear-gradient(-45deg, #ccc 25%, transparent 25%),linear-gradient(45deg, transparent 75%, #ccc 75%),linear-gradient(-45deg, transparent 75%, #ccc 75%)';
        fillIndicator.style.backgroundSize = '4px 4px';
      } else {
        fillIndicator.style.background = fillColor;
        fillIndicator.style.backgroundSize = '';
      }
    } else if (obj.type === 'sticky') {
      document.getElementById('stickyToolbarSection').classList.add('active');
      // Update sticky toolbar to reflect current object color
      document.querySelectorAll('.sticky-toolbar-color').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.stickyColor === obj.color);
      });
    } else if (obj.type === 'textbox') {
      document.getElementById('textToolbarSection').classList.add('active');
      // Update text toolbar to reflect current object
      textColorIndicator.style.background = obj.textColor || obj.color || '#1d1d1f';
      // Update alignment buttons
      const align = obj.textAlign || 'left';
      document.querySelectorAll('.align-btn').forEach(b => b.classList.remove('active'));
      document.querySelector(`.align-btn[data-align="${align}"]`)?.classList.add('active');
    } else {
      document.getElementById('defaultToolbarSection').classList.add('active');
    }
  } else {
    document.getElementById('defaultToolbarSection').classList.add('active');
  }
}

// ========== Color & Size Controls ==========

function setColor(color, fromUserAction = false) {
  currentColor = color;
  if (colorPicker) colorPicker.value = color;

  // Apply to selected objects only if user clicked (not just updating UI)
  if (fromUserAction && selectedObjects.length > 0) {
    const colorableTypes = ['textbox', 'rect', 'circle', 'arrow', 'sticky'];
    const colorable = selectedObjects.filter(o => colorableTypes.includes(o.type));
    if (colorable.length > 0) {
      colorable.forEach(obj => {
        if (obj.type === 'sticky') {
          updateObjectProps(obj, { textColor: color });
        } else {
          updateObjectProps(obj, { color });
        }
      });
      saveState();
      redraw();
    }
  }
}

// ========== Zoom Control ==========

function applyZoom() {
  const zoomScale = canvasZoom / 100;
  const canvasDisplayW = canvasLogicalWidth * zoomScale;
  const canvasDisplayH = canvasLogicalHeight * zoomScale;

  // Update canvas display size (CSS)
  canvas.style.width = canvasDisplayW + 'px';
  canvas.style.height = canvasDisplayH + 'px';

  // Update canvas actual size (memory) - scaled for both DPR and zoom
  canvas.width = canvasLogicalWidth * dpr * zoomScale;
  canvas.height = canvasLogicalHeight * dpr * zoomScale;

  // Update container size to match
  canvasContainer.style.width = canvasDisplayW + 'px';
  canvasContainer.style.height = canvasDisplayH + 'px';
  canvasContainer.style.transform = 'none'; // Remove CSS scaling

  // Update centering margin based on wrapper size
  const wrapperRect = canvasWrapper.getBoundingClientRect();
  const padX = Math.max(0, (wrapperRect.width - canvasDisplayW) / 2);
  const padY = Math.max(0, (wrapperRect.height - canvasDisplayH) / 2);
  canvasContainer.style.margin = `${padY}px ${padX}px`;

  // Scale context to match DPR and zoom
  ctx.setTransform(dpr * zoomScale, 0, 0, dpr * zoomScale, 0, 0);

  // Redraw with new scale
  redraw();
}

function setZoom(zoom) {
  canvasZoom = zoom;
  applyZoom();
}

function updateColorButtons() {
  document.querySelectorAll('.tool-panel .color-btn[data-color]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.color === currentColor);
  });
}

// ========== Sticky Modal ==========

function openStickyModal(x, y) {
  pendingStickyPosition = { x, y };
  editingStickyObject = null;
  editingStickyPrevState = null;
  stickyTextarea.value = '';
  stickyTextarea.style.background = currentStickyColor;
  document.querySelectorAll('.sticky-color-opt').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.color === currentStickyColor);
  });
  stickyModal.classList.add('open');
  setTimeout(() => stickyTextarea.focus(), 100);
}

function openStickyModalForEdit(obj) {
  pendingStickyPosition = null;
  editingStickyObject = obj;
  editingStickyPrevState = cloneObjectState(obj);
  stickyTextarea.value = obj.text || '';
  currentStickyColor = obj.color;
  stickyTextarea.style.background = obj.color;
  document.querySelectorAll('.sticky-color-opt').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.color === obj.color);
  });
  stickyModal.classList.add('open');
  setTimeout(() => stickyTextarea.focus(), 100);
}

function closeStickyModal() {
  stickyModal.classList.remove('open');
  pendingStickyPosition = null;
  editingStickyObject = null;
  editingStickyPrevState = null;
}

// ========== Object Context Menu ==========

function showObjectMenu(obj) {
  if (!obj) return;

  const scale = canvasZoom / 100;
  const rotation = obj.rotation || 0;
  let cornerX, cornerY, cx, cy;

  if (obj.type === 'sticky' || obj.type === 'textbox' || obj.type === 'image' || obj.type === 'arrow') {
    cx = obj.x + obj.width / 2;
    cy = obj.y + obj.height / 2;
    // Top-right corner before rotation
    cornerX = obj.x + obj.width;
    cornerY = obj.y;
  } else if (obj.x1 !== undefined) {
    cx = (obj.x1 + obj.x2) / 2;
    cy = (obj.y1 + obj.y2) / 2;
    cornerX = Math.max(obj.x1, obj.x2);
    cornerY = Math.min(obj.y1, obj.y2);
  } else {
    return;
  }

  // Apply rotation to corner position
  let rotatedX = cornerX, rotatedY = cornerY;
  if (rotation !== 0) {
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const dx = cornerX - cx;
    const dy = cornerY - cy;
    rotatedX = cx + dx * cos - dy * sin;
    rotatedY = cy + dx * sin + dy * cos;
  }

  // Position relative to canvas (menu is inside canvasContainer)
  const menuX = rotatedX * scale - 14;
  const menuY = rotatedY * scale - 14;

  objectMenuBtn.style.left = menuX + 'px';
  objectMenuBtn.style.top = menuY + 'px';
  objectMenuBtn.style.display = 'flex';

  // Hide edit option for images
  const editItem = objectMenuDropdown.querySelector('[data-action="edit"]');
  if (editItem) {
    editItem.style.display = obj.type === 'image' ? 'none' : 'flex';
  }
}

function hideObjectMenu() {
  objectMenuBtn.style.display = 'none';
  objectMenuDropdown.classList.remove('open');
}
