// ==========================================
// Object Management Functions
// ==========================================
// Functions for object hit testing, selection, bounds calculation,
// and context menu management.
// Uses global variables from state.js (objects, selectedObjects, canvasZoom, etc.)

function getObjectBounds(obj) {
  if (obj.type === 'image' || obj.type === 'sticky' || obj.type === 'textbox') {
    return { x1: obj.x, y1: obj.y, x2: obj.x + obj.width, y2: obj.y + obj.height };
  } else {
    return {
      x1: Math.min(obj.x1, obj.x2),
      y1: Math.min(obj.y1, obj.y2),
      x2: Math.max(obj.x1, obj.x2),
      y2: Math.max(obj.y1, obj.y2)
    };
  }
}

function hitTestObjects(x, y) {
  for (let i = objects.length - 1; i >= 0; i--) {
    const obj = objects[i];

    if (obj.type === 'brush' || obj.type === 'eraser') continue;

    // Objects with x,y,width,height format
    if (obj.type === 'image' || obj.type === 'sticky' || obj.type === 'textbox' || obj.type === 'arrow') {
      const handleRadius = 10;
      const rotation = obj.rotation || 0;
      const cx = obj.x + obj.width / 2;
      const cy = obj.y + obj.height / 2;

      // Transform click point to object's local coordinate system
      let localX = x, localY = y;
      if (rotation !== 0) {
        const cos = Math.cos(-rotation);
        const sin = Math.sin(-rotation);
        const dx = x - cx;
        const dy = y - cy;
        localX = cx + dx * cos - dy * sin;
        localY = cy + dx * sin + dy * cos;
      }

      // Check rotation handle at top-left corner (only if object is selected)
      if (selectedObjects.includes(obj)) {
        const handleX = obj.x;
        const handleY = obj.y;
        const handleRadius = 8;

        // Transform handle position to screen space if rotated
        let screenHandleX = handleX, screenHandleY = handleY;
        if (rotation !== 0) {
          const cos = Math.cos(rotation);
          const sin = Math.sin(rotation);
          const dx = handleX - cx;
          const dy = handleY - cy;
          screenHandleX = cx + dx * cos - dy * sin;
          screenHandleY = cy + dx * sin + dy * cos;
        }

        // Check if click is within the rotation handle circle
        const distFromHandle = Math.hypot(x - screenHandleX, y - screenHandleY);
        if (distFromHandle <= handleRadius + 4) {
          return { obj, handle: 'rotate' };
        }
      }

      // Other 3 corners for resize (not nw - that's the rotation handle)
      const corners = [
        { x: obj.x + obj.width, y: obj.y, h: 'ne' },
        { x: obj.x, y: obj.y + obj.height, h: 'sw' },
        { x: obj.x + obj.width, y: obj.y + obj.height, h: 'se' }
      ];

      // Check corner handles in local space
      for (const c of corners) {
        if (Math.hypot(localX - c.x, localY - c.y) < handleRadius) {
          return { obj, handle: c.h };
        }
      }

      // Check if inside object bounds (in local space)
      if (localX >= obj.x && localX <= obj.x + obj.width && localY >= obj.y && localY <= obj.y + obj.height) {
        return { obj, handle: 'move' };
      }
    } else {
      const handleRadius = 10;
      const cx = (obj.x1 + obj.x2) / 2;
      const cy = (obj.y1 + obj.y2) / 2;
      const rotation = obj.rotation || 0;

      // Transform click point to object's local coordinate system
      let localX = x, localY = y;
      if (rotation !== 0) {
        const cos = Math.cos(-rotation);
        const sin = Math.sin(-rotation);
        const dx = x - cx;
        const dy = y - cy;
        localX = cx + dx * cos - dy * sin;
        localY = cy + dx * sin + dy * cos;
      }

      // Check rotation handle at top-left corner (only if object is selected)
      if (selectedObjects.includes(obj)) {
        const minX = Math.min(obj.x1, obj.x2);
        const minY = Math.min(obj.y1, obj.y2);
        const handleX = minX;
        const handleY = minY;
        const handleRadius = 8;

        // Transform handle position to screen space if rotated
        let screenHandleX = handleX, screenHandleY = handleY;
        if (rotation !== 0) {
          const cos = Math.cos(rotation);
          const sin = Math.sin(rotation);
          const dx = handleX - cx;
          const dy = handleY - cy;
          screenHandleX = cx + dx * cos - dy * sin;
          screenHandleY = cy + dx * sin + dy * cos;
        }

        // Check if click is within the rotation handle circle
        const distFromHandle = Math.hypot(x - screenHandleX, y - screenHandleY);
        if (distFromHandle <= handleRadius + 4) {
          return { obj, handle: 'rotate' };
        }
      }

      // Check corner handles (in local space) - same as arrow: NE, SW, SE
      const minX = Math.min(obj.x1, obj.x2);
      const minY = Math.min(obj.y1, obj.y2);
      const maxX = Math.max(obj.x1, obj.x2);
      const maxY = Math.max(obj.y1, obj.y2);

      const corners = [
        { x: maxX, y: minY, h: 'ne' },  // top-right
        { x: minX, y: maxY, h: 'sw' },  // bottom-left
        { x: maxX, y: maxY, h: 'se' }   // bottom-right
      ];

      for (const c of corners) {
        if (Math.hypot(localX - c.x, localY - c.y) < handleRadius) {
          return { obj, handle: c.h };
        }
      }

      const halfW = Math.abs(obj.x2 - obj.x1) / 2 + 10;
      const halfH = Math.abs(obj.y2 - obj.y1) / 2 + 10;

      if (localX >= cx - halfW && localX <= cx + halfW && localY >= cy - halfH && localY <= cy + halfH) {
        return { obj, handle: 'move' };
      }
    }
  }
  return null;
}

// updateSelectedControls, showObjectMenu, hideObjectMenu are defined in ui.js (loaded after objects.js)

// Update object properties with undo support
function updateObjectProps(obj, props) {
  const prevState = cloneObjectState(obj);
  Object.assign(obj, props);
  saveLocalOperation('update', obj, prevState);
  emitObjectChange('update', obj);
}

// Object menu event handlers (setup function to be called from main)
function setupObjectMenuHandlers() {
  const objectMenuBtn = document.getElementById('objectMenuBtn');
  const objectMenuDropdown = document.getElementById('objectMenuDropdown');

  objectMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    objectMenuDropdown.classList.toggle('open');
  });

  document.querySelectorAll('.object-menu-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = item.dataset.action;
      if (selectedObjects.length === 1) {
        const obj = selectedObjects[0];
        if (action === 'edit') {
          startEditing(obj);
        } else if (action === 'duplicate') {
          const copy = JSON.parse(JSON.stringify(obj));
          copy.id = generateObjectId();
          copy.x = (copy.x || 0) + 20;
          copy.y = (copy.y || 0) + 20;
          if (copy.x1 !== undefined) { copy.x1 += 20; copy.x2 += 20; }
          if (copy.y1 !== undefined) { copy.y1 += 20; copy.y2 += 20; }
          // Restore image reference for image objects
          if (obj.type === 'image' && obj.img) {
            copy.img = obj.img;
          }
          objects.push(copy);
          saveLocalOperation('add', copy, null);
          saveState();
          emitObjectChange('add', copy);
          redraw();
        } else if (action === 'bringToFront') {
          const idx = objects.indexOf(obj);
          if (idx >= 0 && idx < objects.length - 1) {
            const prevState = cloneObjectState(obj);
            objects.splice(idx, 1);
            objects.push(obj);
            saveLocalOperation('move', obj, prevState);
            saveState();
            emitObjectChange('move', obj);
            redraw();
          }
        } else if (action === 'sendToBack') {
          const idx = objects.indexOf(obj);
          if (idx > 0) {
            const prevState = cloneObjectState(obj);
            objects.splice(idx, 1);
            objects.unshift(obj);
            saveLocalOperation('move', obj, prevState);
            saveState();
            emitObjectChange('move', obj);
            redraw();
          }
        } else if (action === 'delete') {
          const idx = objects.indexOf(obj);
          if (idx >= 0) {
            const prevState = cloneObjectState(obj);
            objects.splice(idx, 1);
            saveLocalOperation('delete', obj, prevState);
            saveState();
            emitObjectChange('delete', obj);
            selectedObjects = [];
            redraw();
          }
        }
      }
      hideObjectMenu();
    });
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#objectMenuBtn')) {
      objectMenuDropdown.classList.remove('open');
    }
  });
}

// ==========================================
// Z-Index Operations (for toolbar buttons)
// ==========================================

function bringToFront() {
  if (selectedObjects.length === 0) return;
  let changed = false;
  selectedObjects.forEach(obj => {
    const idx = objects.indexOf(obj);
    if (idx >= 0 && idx < objects.length - 1) {
      objects.splice(idx, 1);
      objects.push(obj);
      changed = true;
    }
  });
  if (changed) {
    saveState();
    redraw();
    emitZIndexChange();
  }
}

function bringForward() {
  if (selectedObjects.length === 0) return;
  let changed = false;
  selectedObjects.forEach(obj => {
    const idx = objects.indexOf(obj);
    if (idx >= 0 && idx < objects.length - 1) {
      objects.splice(idx, 1);
      objects.splice(idx + 1, 0, obj);
      changed = true;
    }
  });
  if (changed) {
    saveState();
    redraw();
    emitZIndexChange();
  }
}

function sendBackward() {
  if (selectedObjects.length === 0) return;
  let changed = false;
  selectedObjects.forEach(obj => {
    const idx = objects.indexOf(obj);
    if (idx > 0) {
      objects.splice(idx, 1);
      objects.splice(idx - 1, 0, obj);
      changed = true;
    }
  });
  if (changed) {
    saveState();
    redraw();
    emitZIndexChange();
  }
}

function sendToBack() {
  if (selectedObjects.length === 0) return;
  let changed = false;
  selectedObjects.forEach(obj => {
    const idx = objects.indexOf(obj);
    if (idx > 0) {
      objects.splice(idx, 1);
      objects.unshift(obj);
      changed = true;
    }
  });
  if (changed) {
    saveState();
    redraw();
    emitZIndexChange();
  }
}

function deleteSelected() {
  if (selectedObjects.length === 0) return;
  selectedObjects.forEach(obj => {
    const idx = objects.indexOf(obj);
    if (idx >= 0) {
      const prevState = cloneObjectState(obj);
      objects.splice(idx, 1);
      saveLocalOperation('delete', obj, prevState);
      emitObjectChange('delete', obj);
    }
  });
  selectedObjects = [];
  hideObjectMenu();
  saveState();
  redraw();
}

function duplicateSelected() {
  if (selectedObjects.length === 0) return;
  const newSelected = [];
  selectedObjects.forEach(obj => {
    const copy = JSON.parse(JSON.stringify(obj));
    copy.id = generateObjectId();
    copy.x = (copy.x || 0) + 20;
    copy.y = (copy.y || 0) + 20;
    if (copy.x1 !== undefined) { copy.x1 += 20; copy.x2 += 20; }
    if (copy.y1 !== undefined) { copy.y1 += 20; copy.y2 += 20; }
    if (obj.type === 'image' && obj.img) {
      copy.img = obj.img;
    }
    objects.push(copy);
    newSelected.push(copy);
    saveLocalOperation('add', copy, null);
    emitObjectChange('add', copy);
  });
  selectedObjects = newSelected;
  saveState();
  redraw();
}

function copySelected() {
  if (selectedObjects.length > 0) {
    clipboard = selectedObjects.map(obj => {
      const copy = JSON.parse(JSON.stringify(obj));
      if (copy.type === 'image') {
        copy.imgSrc = obj.imgSrc;
        copy.img = undefined;
      }
      return copy;
    });
    clipboardType = 'objects';
  }
}

function pasteSelected() {
  pasteFromClipboard();
}
