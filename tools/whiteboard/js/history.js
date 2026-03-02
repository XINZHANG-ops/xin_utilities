/**
 * History Management Module
 * Handles undo/redo operations for both local and collaboration modes.
 *
 * In local mode: Uses state-based history (snapshots of entire objects array)
 * In collaboration mode: Uses operation-based history (per-user undo/redo stack)
 *
 * Dependencies: Uses global variables from state.js, utils.js (cloneObjectState)
 */

/**
 * Save local operation to undo stack (collaboration mode only)
 * @param {string} action - 'add' | 'delete' | 'update' | 'move'
 * @param {object} obj - The object being operated on
 * @param {object|null} previousState - The object state BEFORE the operation (for undo) or null for 'add'
 */
function saveLocalOperation(action, obj, previousState = null) {
  if (!currentBoard) return; // Only track in collaboration mode

  const operation = {
    action,
    objId: obj.id,
    objState: previousState ? JSON.parse(JSON.stringify(previousState)) : null,
    newState: JSON.parse(JSON.stringify(obj)),
    pageIndex: currentPageIndex,
    seq: ++globalOpSequence
  };

  localUndoStack.push(operation);
  if (localUndoStack.length > MAX_LOCAL_UNDO) {
    localUndoStack.shift();
  }
  // Clear redo stack when new operation is performed
  localRedoStack = [];
  updateUndoRedoButtons();
}

/**
 * Save current state to history (local mode only)
 * Creates a snapshot of all objects and saves to history array
 */
function saveState() {
  const state = objects.map(obj => {
    if (obj.type === 'image') {
      return { ...obj, imgSrc: obj.imgSrc };
    }
    return { ...obj };
  });

  history = history.slice(0, historyIndex + 1);
  historySeq = historySeq.slice(0, historyIndex + 1);
  history.push(JSON.stringify(state));
  historySeq.push(++globalOpSequence);
  historyIndex = history.length - 1;

  if (history.length > 50) {
    history.shift();
    historySeq.shift();
    historyIndex--;
  }

  // Update page state
  saveCurrentPageState();
  updatePageUI();
  saveToLocalStorage();
  updateUndoRedoButtons();
}

/**
 * Load state from JSON (local mode only)
 * @param {string} stateStr - JSON string of objects array
 * @returns {Promise<Array>} Promise resolving to array of objects
 */
function loadState(stateStr) {
  const state = JSON.parse(stateStr);
  const loadPromises = state.map(obj => {
    if (obj.type === 'image') {
      return new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
          obj.img = img;
          resolve(obj);
        };
        img.onerror = () => resolve(obj);
        img.src = obj.imgSrc;
      });
    }
    return Promise.resolve(obj);
  });

  return Promise.all(loadPromises);
}

/**
 * Undo last operation
 * In collaboration mode: Uses operation-based undo (per-user stack)
 * In local mode: Uses state-based undo (restores previous snapshot)
 */
function undo() {
  // Clear selection and hide menu immediately
  selectedObjects = [];
  updateSelectedControls();
  hideObjectMenu();

  // In collaboration mode, use local operation-based undo
  if (currentBoard && localUndoStack.length > 0) {
    const op = localUndoStack.pop();

    // Check if page still exists
    if (op.pageIndex >= pages.length) {
      // Page was deleted - discard this operation and try next
      return undo();
    }

    // Switch to the page where the operation happened
    if (op.pageIndex !== currentPageIndex) {
      switchToPage(op.pageIndex, true); // true = isAutoFollow, don't exit follow mode
    }

    if (op.action === 'add') {
      // Undo add = delete the object
      const idx = objects.findIndex(o => o.id === op.objId);
      if (idx >= 0) {
        objects.splice(idx, 1);
        emitObjectChange('delete', op.newState);
      }
      // If idx === -1, object was already deleted by another user - that's fine
    } else if (op.action === 'delete') {
      // Undo delete = re-add the object (only if not already present)
      if (op.objState) {
        const existingIdx = objects.findIndex(o => o.id === op.objId);
        if (existingIdx === -1) {
          const restored = { ...op.objState };
          // Reload image if needed
          if (restored.type === 'image' && restored.imgSrc) {
            const img = new Image();
            img.onload = () => {
              restored.img = img;
              redraw();
            };
            img.src = restored.imgSrc;
          }
          objects.push(restored);
          emitObjectChange('add', restored);
        }
      }
    } else if (op.action === 'update' || op.action === 'move') {
      // Undo update/move = restore previous state
      const obj = objects.find(o => o.id === op.objId);
      if (obj && op.objState) {
        Object.assign(obj, op.objState);
        // Reload image if needed
        if (obj.type === 'image' && obj.imgSrc && !obj.img) {
          const img = new Image();
          img.onload = () => {
            obj.img = img;
            redraw();
          };
          img.src = obj.imgSrc;
        }
        emitObjectChange('update', obj);
      } else if (!obj) {
        // Object was deleted by another user - discard and try next
        return undo();
      }
    }

    // Push to redo stack
    localRedoStack.push(op);
    if (localRedoStack.length > MAX_LOCAL_UNDO) {
      localRedoStack.shift();
    }

    saveCurrentPageState();
    redraw();
    updatePageUI();
    refreshPageGridIfOpen();
    saveToLocalStorage();
    saveBoardToServer();
    updateUndoRedoButtons();
    return;
  }

  // In collaboration mode, don't fall through to state-based undo
  if (currentBoard) {
    return;
  }

  // Local mode: use state-based undo
  if (historyIndex > 0) {
    historyIndex--;
    loadState(history[historyIndex]).then(state => {
      objects = state;
      saveCurrentPageState();
      redraw();
      updatePageUI();
      refreshPageGridIfOpen();
      saveToLocalStorage();
      updateUndoRedoButtons();
    });
  } else if (historyIndex === 0) {
    objects = [];
    historyIndex = -1;
    saveCurrentPageState();
    redraw();
    updatePageUI();
    refreshPageGridIfOpen();
    saveToLocalStorage();
    updateUndoRedoButtons();
  }
}

/**
 * Redo last undone operation
 * In collaboration mode: Uses operation-based redo (per-user stack)
 * In local mode: Uses state-based redo (restores next snapshot)
 */
function redo() {
  // Clear selection and hide menu immediately
  selectedObjects = [];
  updateSelectedControls();
  hideObjectMenu();

  // In collaboration mode, use local operation-based redo
  if (currentBoard && localRedoStack.length > 0) {
    const op = localRedoStack.pop();

    // Check if page still exists
    if (op.pageIndex >= pages.length) {
      // Page was deleted - discard this operation and try next
      return redo();
    }

    // Switch to the page where the operation happened
    if (op.pageIndex !== currentPageIndex) {
      switchToPage(op.pageIndex, true);
    }

    if (op.action === 'add') {
      // Redo add = re-add the object (only if not already present)
      if (op.newState) {
        const existingIdx = objects.findIndex(o => o.id === op.objId);
        if (existingIdx === -1) {
          const restored = { ...op.newState };
          if (restored.type === 'image' && restored.imgSrc) {
            const img = new Image();
            img.onload = () => {
              restored.img = img;
              redraw();
            };
            img.src = restored.imgSrc;
          }
          objects.push(restored);
          emitObjectChange('add', restored);
        }
      }
    } else if (op.action === 'delete') {
      // Redo delete = delete the object again
      const idx = objects.findIndex(o => o.id === op.objId);
      if (idx >= 0) {
        objects.splice(idx, 1);
        emitObjectChange('delete', op.objState);
      }
      // If idx === -1, object was already deleted by another user - that's fine
    } else if (op.action === 'update' || op.action === 'move') {
      // Redo update/move = apply new state
      const obj = objects.find(o => o.id === op.objId);
      if (obj && op.newState) {
        Object.assign(obj, op.newState);
        if (obj.type === 'image' && obj.imgSrc && !obj.img) {
          const img = new Image();
          img.onload = () => {
            obj.img = img;
            redraw();
          };
          img.src = obj.imgSrc;
        }
        emitObjectChange('update', obj);
      } else if (!obj) {
        // Object was deleted by another user - discard and try next
        return redo();
      }
    }

    // Push back to undo stack
    localUndoStack.push(op);
    if (localUndoStack.length > MAX_LOCAL_UNDO) {
      localUndoStack.shift();
    }

    saveCurrentPageState();
    redraw();
    updatePageUI();
    refreshPageGridIfOpen();
    saveToLocalStorage();
    saveBoardToServer();
    updateUndoRedoButtons();
    return;
  }

  // In collaboration mode, don't fall through to state-based redo
  if (currentBoard) {
    return;
  }

  // Local mode: use state-based redo
  if (historyIndex < history.length - 1) {
    historyIndex++;
    loadState(history[historyIndex]).then(state => {
      objects = state;
      saveCurrentPageState();
      redraw();
      updatePageUI();
      refreshPageGridIfOpen();
      saveToLocalStorage();
      updateUndoRedoButtons();
    });
  }
}
