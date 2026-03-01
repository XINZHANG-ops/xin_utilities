// events.js
// Mouse, keyboard, and other event handlers for whiteboard
// Depends on: state.js, utils.js, canvas.js (getMousePos), objects.js, collaboration.js

// ============================================================================
// Mouse Event Handlers
// ============================================================================

function handleMouseDown(e) {
  // Clear thumbnail focus when clicking on canvas
  pageThumbnailFocused = false;

  const pos = getMousePos(e);
  startX = pos.x;
  startY = pos.y;

  // Check if clicking on existing object
  const hit = hitTestObjects(pos.x, pos.y);

  // Drawing tools (brush, eraser, laser) should not select objects - they should draw
  const isDrawingTool = ['brush', 'eraser', 'laser'].includes(currentTool);
  if (hit && !isDrawingTool) {
    // Exit follow mode when dragging/editing objects
    if (isFollowingUser && hit.handle !== 'move') {
      // Resizing - exit follow mode
      stopFollowingUser();
    }
    // Check if object is already selected (for multi-select drag)
    if (selectedObjects.includes(hit.obj)) {
      // Dragging already selected objects
      dragHandle = hit.handle;
      dragStartX = pos.x;
      dragStartY = pos.y;
      isDrawing = false;
      // Save previous states for undo
      dragPrevStates = {};
      selectedObjects.forEach(obj => {
        dragPrevStates[obj.id] = cloneObjectState(obj);
      });
    } else {
      // Select new object (Shift for multi-select)
      if (e.shiftKey) {
        selectedObjects.push(hit.obj);
      } else {
        selectedObjects = [hit.obj];
      }
      dragHandle = hit.handle;
      dragStartX = pos.x;
      dragStartY = pos.y;
      isDrawing = false;
      // Save previous states for undo
      dragPrevStates = {};
      selectedObjects.forEach(obj => {
        dragPrevStates[obj.id] = cloneObjectState(obj);
      });
    }
    updateSelectedControls();
    redraw();
    // Show object menu for single selection
    if (selectedObjects.length === 1) {
      showObjectMenu(selectedObjects[0]);
    } else {
      hideObjectMenu();
    }
    return;
  }

  // Select tool - start selection box
  if (currentTool === 'select') {
    if (!e.shiftKey) {
      selectedObjects = [];
      hideObjectMenu();
    }
    isSelectingBox = true;
    selectBoxStart = pos;
    selectBoxEnd = pos;
    updateSelectedControls();
    redraw();
    return;
  }

  // Exit follow mode when starting to draw or create objects
  if (isFollowingUser) {
    stopFollowingUser();
  }

  selectedObjects = [];
  hideObjectMenu();
  updateSelectedControls();

  // Sticky tool now opens modal immediately from toolbar click

  if (currentTool === 'text') {
    const newText = {
      id: generateObjectId(),
      type: 'textbox',
      x: pos.x,
      y: pos.y,
      width: 200,
      height: 40,
      color: textColor,
      textColor: textColor,
      text: '',
      fontSize: textFontSize,
      textAlign: textAlign,
      bold: false
    };
    objects.push(newText);
    selectedObjects = [newText];
    saveLocalOperation('add', newText, null);
    saveState();
    emitObjectChange('add', newText);
    switchToSelectTool();
    updateSelectedControls();
    redraw();
    startEditing(newText);
    return;
  }

  isDrawing = true;
  currentDrawingId = generateObjectId();

  if (currentTool === 'laser') {
    // Start a new laser stroke (temporary, not saved to objects)
    addLaserPoint(currentDrawingId, startX, startY);
    emitLaser(currentDrawingId, { x: startX, y: startY });
    return;
  }

  if (currentTool === 'brush' || currentTool === 'eraser') {
    objects.push({
      id: currentDrawingId,
      type: currentTool,
      color: currentTool === 'eraser' ? '#ffffff' : currentColor,
      size: currentTool === 'eraser' ? eraserSize : strokeSize,
      opacity: currentTool === 'eraser' ? 1 : opacity,
      points: [{ x: startX, y: startY }]
    });
  }
  redraw();
}

function handleMouseMove(e) {
  // Only process if mouse is over canvas or we're actively dragging
  const isOverCanvas = e.target === canvas || e.target.closest('#canvasWrapper');
  const isDragging = isDrawing || dragHandle || isSelectingBox;

  if (!isOverCanvas && !isDragging) return;

  const pos = getMousePos(e);

  // Emit cursor position for collaboration (only when over canvas)
  if (isOverCanvas) emitCursor(pos.x, pos.y);

  // Selection box dragging
  if (isSelectingBox) {
    selectBoxEnd = pos;
    redraw();
    drawSelectionBox();
    return;
  }

  // Dragging selected objects
  if (dragHandle && selectedObjects.length > 0) {
    const dx = pos.x - dragStartX;
    const dy = pos.y - dragStartY;
    let skipDragStartUpdate = false;

    if (dragHandle === 'move') {
      // Move all selected objects
      selectedObjects.forEach(obj => {
        if (obj.type === 'image' || obj.type === 'sticky' || obj.type === 'textbox' || obj.type === 'arrow') {
          obj.x += dx;
          obj.y += dy;
        } else {
          obj.x1 += dx;
          obj.y1 += dy;
          obj.x2 += dx;
          obj.y2 += dy;
        }
      });
    } else if (selectedObjects.length === 1) {
      // Resize/rotate only for single selection
      const obj = selectedObjects[0];
      if (dragHandle === 'rotate') {
        // Calculate rotation angle - works for both rect objects and shapes
        let cx, cy;
        if (obj.type === 'image' || obj.type === 'sticky' || obj.type === 'textbox' || obj.type === 'arrow') {
          cx = obj.x + obj.width / 2;
          cy = obj.y + obj.height / 2;
        } else {
          cx = (obj.x1 + obj.x2) / 2;
          cy = (obj.y1 + obj.y2) / 2;
        }
        const angleNow = Math.atan2(pos.y - cy, pos.x - cx);
        const angleStart = Math.atan2(dragStartY - cy, dragStartX - cx);
        obj.rotation = (obj.rotation || 0) + (angleNow - angleStart);
      } else if (obj.type === 'image' || obj.type === 'sticky' || obj.type === 'textbox' || obj.type === 'arrow') {
        // Save old values to track actual movement
        const oldX = obj.x, oldY = obj.y, oldW = obj.width, oldH = obj.height;

        if (dragHandle.includes('e')) obj.width += dx;
        if (dragHandle.includes('w')) { obj.x += dx; obj.width -= dx; }
        if (dragHandle.includes('s')) obj.height += dy;
        if (dragHandle.includes('n')) { obj.y += dy; obj.height -= dy; }

        // Minimum sizes
        let minWidth = 60, minHeight = 40;
        if (obj.type === 'sticky') { minWidth = 40; minHeight = 30; }
        else if (obj.type === 'arrow') { minWidth = 50; minHeight = 40; }

        // Clamp and fix position for w/n handles
        if (obj.width < minWidth) {
          if (dragHandle.includes('w')) obj.x = oldX + oldW - minWidth;
          obj.width = minWidth;
        }
        if (obj.height < minHeight) {
          if (dragHandle.includes('n')) obj.y = oldY + oldH - minHeight;
          obj.height = minHeight;
        }

        // Update drag start only by actual handle movement (keeps mouse synced)
        if (dragHandle.includes('e')) dragStartX += (obj.x + obj.width) - (oldX + oldW);
        if (dragHandle.includes('w')) dragStartX += obj.x - oldX;
        if (dragHandle.includes('s')) dragStartY += (obj.y + obj.height) - (oldY + oldH);
        if (dragHandle.includes('n')) dragStartY += obj.y - oldY;
        skipDragStartUpdate = true;
      } else {
        // rect/circle use x1,y1,x2,y2 format with ne, sw, se handles
        const minX = Math.min(obj.x1, obj.x2);
        const minY = Math.min(obj.y1, obj.y2);
        const maxX = Math.max(obj.x1, obj.x2);
        const maxY = Math.max(obj.y1, obj.y2);

        let newMinX = minX, newMinY = minY, newMaxX = maxX, newMaxY = maxY;

        if (dragHandle === 'ne') {
          newMaxX += dx;
          newMinY += dy;
        } else if (dragHandle === 'sw') {
          newMinX += dx;
          newMaxY += dy;
        } else if (dragHandle === 'se') {
          newMaxX += dx;
          newMaxY += dy;
        }

        // Minimum size
        const minSize = 20;
        if (newMaxX - newMinX < minSize) {
          if (dragHandle.includes('e')) newMaxX = newMinX + minSize;
          if (dragHandle.includes('w')) newMinX = newMaxX - minSize;
        }
        if (newMaxY - newMinY < minSize) {
          if (dragHandle.includes('s')) newMaxY = newMinY + minSize;
          if (dragHandle.includes('n')) newMinY = newMaxY - minSize;
        }

        // Update coordinates
        obj.x1 = newMinX;
        obj.y1 = newMinY;
        obj.x2 = newMaxX;
        obj.y2 = newMaxY;
      }
    }

    if (!skipDragStartUpdate) {
      dragStartX = pos.x;
      dragStartY = pos.y;
    }

    // Update object menu position during drag
    if (selectedObjects.length === 1) {
      showObjectMenu(selectedObjects[0]);
    }
    redraw();
    return;
  }

  if (!isDrawing) {
    const hit = hitTestObjects(pos.x, pos.y);
    if (hit && currentTool !== 'eraser') {
      if (hit.handle === 'move') {
        canvas.style.cursor = 'move';
      } else if (hit.handle === 'rotate') {
        canvas.style.cursor = 'grab';
      } else {
        canvas.style.cursor = 'nwse-resize';
      }
    } else if (currentTool === 'select') {
      canvas.style.cursor = 'crosshair';
    } else if (currentTool === 'sticky' || currentTool === 'text') {
      canvas.style.cursor = 'cell';
    } else {
      canvas.style.cursor = 'crosshair';
    }
    return;
  }

  if (currentTool === 'laser') {
    // Add point to laser stroke (temporary, not saved)
    addLaserPoint(currentDrawingId, pos.x, pos.y);
    emitLaser(currentDrawingId, { x: pos.x, y: pos.y });
    return;
  }

  if (currentTool === 'brush' || currentTool === 'eraser') {
    // Find the object by currentDrawingId (not last in array - remote objects may have been added)
    const obj = objects.find(o => o.id === currentDrawingId);
    if (!obj) return;
    const newPoint = { x: pos.x, y: pos.y };
    obj.points.push(newPoint);
    // Use full redraw for smooth curves (incremental draw causes artifacts with bezier curves)
    redraw();
    // Emit real-time drawing for collaboration (include brush properties)
    emitDrawing(obj.id, [newPoint], {
      color: obj.color,
      size: obj.size,
      opacity: obj.opacity,
      type: obj.type
    });
  } else {
    // Store shape preview state for drawing after redraw
    shapePreview = { type: currentTool, x1: startX, y1: startY, x2: pos.x, y2: pos.y };
    redraw();
  }
}

function handleMouseUp(e) {
  // Finish selection box
  if (isSelectingBox) {
    isSelectingBox = false;
    const pos = getMousePos(e);
    selectBoxEnd = pos;

    // Find objects within selection box
    const minX = Math.min(selectBoxStart.x, selectBoxEnd.x);
    const maxX = Math.max(selectBoxStart.x, selectBoxEnd.x);
    const minY = Math.min(selectBoxStart.y, selectBoxEnd.y);
    const maxY = Math.max(selectBoxStart.y, selectBoxEnd.y);

    // Only select if box is big enough (not just a click)
    if (maxX - minX > 5 || maxY - minY > 5) {
      const newSelected = objects.filter(obj => {
        if (obj.type === 'brush' || obj.type === 'eraser') return false;
        const bounds = getObjectBounds(obj);
        return bounds.x1 < maxX && bounds.x2 > minX &&
               bounds.y1 < maxY && bounds.y2 > minY;
      });
      selectedObjects = [...new Set([...selectedObjects, ...newSelected])];
    }

    selectBoxStart = null;
    selectBoxEnd = null;
    updateSelectedControls();
    redraw();
    return;
  }

  if (dragHandle) {
    // Save local operations with previous states
    selectedObjects.forEach(obj => {
      const prevState = dragPrevStates[obj.id];
      saveLocalOperation('move', obj, prevState);
    });
    dragPrevStates = {};
    saveState();
    // Emit move for all selected objects
    selectedObjects.forEach(obj => emitObjectChange('move', obj));
    dragHandle = null;
    updateSelectedControls();
    return;
  }

  if (!isDrawing) return;
  isDrawing = false;
  shapePreview = null; // Clear shape preview

  // Laser strokes are temporary - no save needed
  if (currentTool === 'laser') {
    currentDrawingId = null;
    return;
  }

  const pos = getMousePos(e);

  if (currentTool !== 'brush' && currentTool !== 'eraser') {
    let newShape;
    if (currentTool === 'arrow') {
      // Arrow uses x,y,width,height like rect - simple bounding box
      const x = Math.min(startX, pos.x);
      const y = Math.min(startY, pos.y);
      const w = Math.abs(pos.x - startX);
      const h = Math.abs(pos.y - startY);
      newShape = {
        id: generateObjectId(),
        type: 'arrow',
        x: x,
        y: y,
        width: Math.max(50, w),
        height: Math.max(40, h),
        color: shapeStrokeColor,
        fillColor: shapeFillColor || '#ff9500',
        size: strokeSize,
        opacity: opacity,
        rotation: 0
      };
    } else {
      // rect and circle use x1,y1,x2,y2
      newShape = {
        id: generateObjectId(),
        type: currentTool,
        x1: startX,
        y1: startY,
        x2: pos.x,
        y2: pos.y,
        color: shapeStrokeColor,
        fillColor: shapeFillColor,
        size: strokeSize,
        opacity: opacity,
        rotation: 0
      };
    }
    objects.push(newShape);
    saveLocalOperation('add', newShape, null);
    emitObjectChange('add', newShape);
  } else {
    // FIX: Find brush object by currentDrawingId instead of assuming last in array
    const brushObj = objects.find(o => o.id === currentDrawingId);
    if (brushObj) {
      saveLocalOperation('add', brushObj, null);
      emitObjectChange('add', brushObj);
    }
  }

  saveState();
  redraw();
}

function handleDoubleClick(e) {
  const pos = getMousePos(e);
  const hit = hitTestObjects(pos.x, pos.y);

  if (hit && (hit.obj.type === 'sticky' || hit.obj.type === 'textbox')) {
    selectedObjects = [hit.obj];
    startEditing(hit.obj);
  }
}

// ============================================================================
// Keyboard Event Handlers
// ============================================================================

function handleKeyDown(e) {
  // ESC to exit follow mode
  if (e.key === 'Escape' && isFollowingUser) {
    e.preventDefault();
    stopFollowingUser();
    return;
  }

  // Don't handle shortcuts while typing in input/textarea
  const activeEl = document.activeElement;
  const isTyping = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');
  if (editingObject || isTyping) return;

  if (e.ctrlKey && !e.shiftKey && e.key === 'z') {
    e.preventDefault();
    // Compare sequence numbers to decide which stack to undo
    const pageSeq = pageUndoStack.length > 0 ? pageUndoStack[pageUndoStack.length - 1].seq : -1;

    if (currentBoard) {
      // Collaboration mode: compare page vs object operation sequences
      const objSeq = localUndoStack.length > 0 ? localUndoStack[localUndoStack.length - 1].seq : -1;
      if (pageSeq > objSeq && pageSeq >= 0) {
        undoPageOperation();
      } else {
        // Default to undo() - it will handle empty stack gracefully
        undo();
      }
    } else {
      // Local mode: compare page operations vs local history using historySeq
      const localSeq = historyIndex >= 0 && historySeq[historyIndex] ? historySeq[historyIndex] : -1;
      if (pageSeq > localSeq && pageSeq >= 0) {
        undoPageOperation();
      } else {
        // Default to undo() - it will handle empty history gracefully
        undo();
      }
    }
  } else if (e.ctrlKey && e.key === 'y') {
    e.preventDefault();
    redo();
  } else if (e.ctrlKey && e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
    e.preventDefault();
    redo();
  } else if (e.ctrlKey && e.key === 'c') {
    e.preventDefault();
    copyToClipboard();
  } else if (e.ctrlKey && e.key === 'v') {
    e.preventDefault();
    pasteFromClipboard();
  } else if (e.ctrlKey && e.key === 'a') {
    // Select all objects on current page
    e.preventDefault();
    if (objects.length > 0) {
      selectedObjects = [...objects];
      updateSelectedControls();
      redraw();
    }
  } else if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault();
    if (selectedObjects.length > 0) {
      // Delete selected objects - splice first, then emit (so saveBoardToServer saves correct state)
      const deletedObjects = [];
      selectedObjects.forEach(obj => {
        const idx = objects.indexOf(obj);
        if (idx > -1) {
          const prevState = cloneObjectState(obj);
          objects.splice(idx, 1);
          deletedObjects.push({ obj, prevState });
        }
      });
      selectedObjects = [];
      hideObjectMenu();
      updateSelectedControls();
      deletedObjects.forEach(({ obj, prevState }) => saveLocalOperation('delete', obj, prevState));
      saveState();
      deletedObjects.forEach(({ obj }) => emitObjectChange('delete', obj));
      redraw();
    } else if (pageThumbnailFocused && pages.length > 1) {
      // Thumbnail focused - delete current page
      deletePage(currentPageIndex);
      pageThumbnailFocused = false;
    }
  }
}

// ============================================================================
// Clipboard Functions
// ============================================================================

function copyToClipboard() {
  if (selectedObjects.length > 0) {
    // Copy selected objects
    const copies = selectedObjects.map(obj => {
      const copy = JSON.parse(JSON.stringify(obj));
      if (copy.type === 'image') {
        copy.imgSrc = obj.imgSrc;
        copy.img = undefined;
      }
      return copy;
    });
    clipboard = copies;
    clipboardType = 'objects';
  } else {
    // Copy entire page
    const pageCopy = objects.map(obj => {
      const copy = JSON.parse(JSON.stringify(obj));
      if (copy.type === 'image') {
        copy.imgSrc = obj.imgSrc;
        copy.img = undefined;
      }
      return copy;
    });
    clipboard = pageCopy;
    clipboardType = 'page';
    clipboardBackground = pages[currentPageIndex].background ? { ...pages[currentPageIndex].background } : { pattern: 'none', color: '#ffffff' };
  }
}

async function pasteFromClipboard() {
  if (!clipboard) return;

  if (clipboardType === 'objects') {
    // Paste selected objects with offset and NEW IDs
    const pastedObjects = [];
    for (const clipObj of clipboard) {
      const obj = JSON.parse(JSON.stringify(clipObj));
      // Generate new unique ID for pasted object
      obj.id = generateObjectId();
      obj.x = (obj.x || 0) + 20;
      obj.y = (obj.y || 0) + 20;
      if (obj.x1 !== undefined) { obj.x1 += 20; obj.x2 += 20; }
      if (obj.y1 !== undefined) { obj.y1 += 20; obj.y2 += 20; }

      if (obj.type === 'image' && obj.imgSrc) {
        const img = new Image();
        img.src = obj.imgSrc;
        await new Promise(resolve => {
          img.onload = () => { obj.img = img; resolve(); };
          img.onerror = resolve;
        });
      }
      objects.push(obj);
      pastedObjects.push(obj);
      saveLocalOperation('add', obj, null);
      emitObjectChange('add', obj);
    }
    selectedObjects = pastedObjects;
    updateSelectedControls();
    saveState();
    redraw();

    // Update clipboard for next paste offset
    clipboard = clipboard.map(obj => {
      const updated = { ...obj };
      updated.x = (updated.x || 0) + 20;
      updated.y = (updated.y || 0) + 20;
      if (updated.x1 !== undefined) { updated.x1 += 20; updated.x2 += 20; }
      if (updated.y1 !== undefined) { updated.y1 += 20; updated.y2 += 20; }
      return updated;
    });
  } else if (clipboardType === 'page') {
    // Paste entire page content
    if (pages.length >= MAX_PAGES) {
      // If at max pages, paste into current page
      for (const objData of clipboard) {
        const obj = JSON.parse(JSON.stringify(objData));
        obj.id = generateObjectId(); // New ID
        if (obj.type === 'image' && obj.imgSrc) {
          const img = new Image();
          img.src = obj.imgSrc;
          await new Promise(resolve => {
            img.onload = () => {
              obj.img = img;
              resolve();
            };
            img.onerror = resolve;
          });
        }
        objects.push(obj);
        saveLocalOperation('add', obj, null);
        emitObjectChange('add', obj);
      }
      selectedObjects = [];
      updateSelectedControls();
      saveState();
      redraw();
    } else {
      // Create new page with pasted content
      addPageAt(currentPageIndex + 1);
      currentPageIndex = currentPageIndex + 1;
      loadPageState(currentPageIndex);

      // Load pasted objects
      for (const objData of clipboard) {
        const obj = JSON.parse(JSON.stringify(objData));
        obj.id = generateObjectId(); // New ID
        if (obj.type === 'image' && obj.imgSrc) {
          const img = new Image();
          img.src = obj.imgSrc;
          await new Promise(resolve => {
            img.onload = () => {
              obj.img = img;
              resolve();
            };
            img.onerror = resolve;
          });
        }
        objects.push(obj);
      }

      // Apply clipboard background
      if (clipboardBackground) {
        pages[currentPageIndex].background = { ...clipboardBackground };
      }

      selectedObjects = [];
      updateSelectedControls();
      saveState();
      updatePageUI();
      redraw();
      refreshPageGridIfOpen();
    }
  }
}

// ============================================================================
// Image Drag and Drop
// ============================================================================

function initCanvasDragAndDrop() {
  const canvasWrapper = document.getElementById('canvasWrapper');

  canvasWrapper.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });

  canvasWrapper.addEventListener('drop', e => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));

    const rect = canvas.getBoundingClientRect();
    const zoomScale = canvasZoom / 100;
    let dropX = (e.clientX - rect.left) / zoomScale;
    let dropY = (e.clientY - rect.top) / zoomScale;

    files.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = ev => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          const maxSize = 300;

          if (width > maxSize || height > maxSize) {
            const scale = maxSize / Math.max(width, height);
            width *= scale;
            height *= scale;
          }

          const imgObj = {
            id: generateObjectId(),
            type: 'image',
            img: img,
            imgSrc: ev.target.result,
            x: dropX + index * 20,
            y: dropY + index * 20,
            width: width,
            height: height,
            opacity: 1
          };
          objects.push(imgObj);

          saveLocalOperation('add', imgObj, null);
          saveState();
          emitObjectChange('add', imgObj);
          redraw();
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
  });
}

// ============================================================================
// Touch Event Handlers (Mobile Support)
// ============================================================================

function touchToMouseEvent(touch) {
  return {
    clientX: touch.clientX,
    clientY: touch.clientY,
    shiftKey: false
  };
}

function handleTouchStart(e) {
  if (e.touches.length === 1) {
    e.preventDefault();
    handleMouseDown(touchToMouseEvent(e.touches[0]));
  }
}

function handleTouchMove(e) {
  if (e.touches.length === 1) {
    e.preventDefault();
    handleMouseMove(touchToMouseEvent(e.touches[0]));
  }
}

function handleTouchEnd(e) {
  e.preventDefault();
  // Use changedTouches for the ending touch point
  const touch = e.changedTouches[0];
  handleMouseUp(touchToMouseEvent(touch));
}

// ============================================================================
// Event Initialization
// ============================================================================

function initEventListeners() {
  // Canvas mouse events - use document for move/up to continue drag even when mouse leaves canvas
  canvas.addEventListener('mousedown', handleMouseDown);
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
  canvas.addEventListener('dblclick', handleDoubleClick);

  // Touch events for mobile support
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  document.addEventListener('touchmove', handleTouchMove, { passive: false });
  document.addEventListener('touchend', handleTouchEnd, { passive: false });

  // Keyboard events
  document.addEventListener('keydown', handleKeyDown);

  // Image drag and drop
  initCanvasDragAndDrop();
}
