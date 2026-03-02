/**
 * Page Management Module
 *
 * Handles all page-related functionality for the whiteboard including:
 * - Page state management (save/load)
 * - Page navigation and switching
 * - Page operations (add, delete, duplicate, insert, reorder)
 * - Page thumbnail grid rendering
 * - Page background management
 * - Page drag and drop event handlers
 *
 * Dependencies: state.js (draggedPageIndex, openPageMenuIndex, pages, currentPageIndex, etc.)
 */

// ===== Page State Management =====

function saveCurrentPageState() {
  pages[currentPageIndex].objects = objects;
  pages[currentPageIndex].history = history;
  pages[currentPageIndex].historyIndex = historyIndex;
  pages[currentPageIndex].historySeq = historySeq;
}

function loadPageState(pageIndex) {
  objects = pages[pageIndex].objects;
  history = pages[pageIndex].history || [];
  historyIndex = pages[pageIndex].historyIndex !== undefined ? pages[pageIndex].historyIndex : -1;
  historySeq = pages[pageIndex].historySeq || [];

  // Load images that don't have img object yet
  objects.forEach(obj => {
    if (obj.type === 'image' && obj.imgSrc && !obj.img) {
      const img = new Image();
      img.onload = () => {
        obj.img = img;
        redraw();
      };
      img.onerror = () => {
        console.error('[WB] Failed to load image on page switch');
        redraw(); // Show placeholder
      };
      img.src = obj.imgSrc;
    }
  });

  // Restore background if present
  if (pages[pageIndex].background) {
    currentBackground = pages[pageIndex].background;
  }

  selectedObjects = [];
  if (typeof updateSelectedControls === 'function') updateSelectedControls();
  if (typeof updateUndoRedoButtons === 'function') updateUndoRedoButtons();
}

// ===== Page Navigation =====

function switchToPage(pageIndex, isAutoFollow = false) {
  if (pageIndex < 0 || pageIndex >= pages.length) return;

  // Exit follow mode if manual page switch (not auto-follow)
  if (!isAutoFollow && isFollowingUser) {
    stopFollowingUser();
  }

  // Save current page
  saveCurrentPageState();

  // Switch to new page
  currentPageIndex = pageIndex;
  loadPageState(pageIndex);

  // Clear laser strokes when switching pages (they're page-specific)
  laserStrokes.length = 0;

  selectedObjects = [];
  updateSelectedControls();
  redraw();
  updatePageUI();
  saveToLocalStorage();
  emitPageChange();
  // Update background dropdown UI
  if (typeof updateBgDropdownUI === 'function') updateBgDropdownUI();
}

async function switchToPageForExport(index) {
  if (index < 0 || index >= pages.length) return;
  saveCurrentPageState();
  currentPageIndex = index;
  const page = pages[currentPageIndex];
  objects = page.objects;
  history = page.history;
  historyIndex = page.historyIndex;

  // Restore image objects
  const imagePromises = objects
    .filter(obj => obj.type === 'image' && obj.imgSrc && !obj.img)
    .map(obj => new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        obj.img = img;
        resolve();
      };
      img.onerror = () => resolve();
      img.src = obj.imgSrc;
    }));
  await Promise.all(imagePromises);
}

// ===== Page Operations =====

function addNewPage() {
  if (pages.length >= MAX_PAGES) return;

  // Save current page first
  saveCurrentPageState();

  // Create new page
  const newPage = { objects: [], background: { pattern: 'none', color: '#ffffff' }, history: [], historyIndex: -1, historySeq: [] };
  pages.push(newPage);

  const newPageIndex = pages.length - 1;

  // Record to undo stack
  pageUndoStack.push({
    type: 'addPage',
    index: newPageIndex,
    seq: ++globalOpSequence
  });

  // Switch to new page
  currentPageIndex = newPageIndex;
  loadPageState(currentPageIndex);

  selectedObjects = [];
  updateSelectedControls();
  redraw();
  updatePageUI();
  refreshPageGridIfOpen();
  saveToLocalStorage();
  emitPageOperation('add', currentPageIndex);
}

function deletePage(pageIndex) {
  if (pages.length <= 1) return;

  // Save to undo stack
  const deletedPage = JSON.parse(JSON.stringify(pages[pageIndex]));
  deletedPage.objects = pages[pageIndex].objects.map(obj => {
    if (obj.type === 'image') {
      return { ...obj, imgSrc: obj.imgSrc, img: undefined };
    }
    return { ...obj };
  });
  pageUndoStack.push({
    type: 'deletePage',
    page: deletedPage,
    index: pageIndex,
    seq: ++globalOpSequence
  });

  pages.splice(pageIndex, 1);

  // Adjust current page index if needed
  if (currentPageIndex >= pages.length) {
    currentPageIndex = pages.length - 1;
  }

  loadPageState(currentPageIndex);
  selectedObjects = [];
  updateSelectedControls();
  redraw();
  updatePageUI();
  refreshPageGridIfOpen();
  saveToLocalStorage();
  emitPageOperation('delete', pageIndex);
}

function duplicatePage(index) {
  if (pages.length >= MAX_PAGES) return;
  const sourcePage = pages[index];
  const newPage = {
    objects: JSON.parse(JSON.stringify(sourcePage.objects)),
    background: sourcePage.background ? { ...sourcePage.background } : { pattern: 'none', color: '#ffffff' },
    history: [],
    historyIndex: -1,
    historySeq: []
  };
  // Reload images for duplicated page
  newPage.objects.forEach(obj => {
    if (obj.type === 'image' && obj.imgSrc) {
      const img = new Image();
      img.src = obj.imgSrc;
      obj.img = img;
    }
  });
  const newPageIndex = index + 1;
  pages.splice(newPageIndex, 0, newPage);

  // Record to undo stack
  pageUndoStack.push({
    type: 'addPage',
    index: newPageIndex,
    seq: ++globalOpSequence
  });

  if (currentPageIndex > index) currentPageIndex++;
  updatePageUI();
  renderPageGrid();
  saveToLocalStorage();
  if (socket && socket.connected && currentBoard) {
    // Send page content so receiver gets exact copy
    const pageData = {
      objects: newPage.objects.map(obj => toRatio(obj)),
      background: newPage.background
    };
    socket.emit('wb_page_duplicate', {
      board_id: currentBoard.id,
      sourceIndex: index,
      pageData: pageData
    });
    saveBoardToServer();
  }
}

function insertPageAt(index) {
  if (pages.length >= MAX_PAGES) return;
  const newPage = {
    objects: [],
    background: { pattern: 'none', color: '#ffffff' },
    history: [],
    historyIndex: -1,
    historySeq: []
  };
  pages.splice(index, 0, newPage);

  // Record to undo stack
  pageUndoStack.push({
    type: 'addPage',
    index: index,
    seq: ++globalOpSequence
  });

  if (currentPageIndex >= index) currentPageIndex++;
  updatePageUI();
  renderPageGrid();
  saveToLocalStorage();
  if (socket && socket.connected && currentBoard) {
    socket.emit('wb_page_insert', { board_id: currentBoard.id, insertIndex: index });
    saveBoardToServer();
  }
}

// ===== Page UI Management =====

function updatePageUI() {
  // Update page info (Jamboard style: "1/5")
  pageInfo.textContent = `${currentPageIndex + 1}/${pages.length}`;

  // Update navigation buttons
  prevPageBtn.disabled = currentPageIndex === 0;
  nextPageBtn.disabled = false;
  nextPageBtn.style.opacity = (currentPageIndex === pages.length - 1 && pages.length >= MAX_PAGES) ? '0.5' : '1';
}

function closeAllPageMenus() {
  document.querySelectorAll('.page-thumb-menu').forEach(m => m.classList.remove('open'));
  document.querySelectorAll('.page-thumb-dropdown').forEach(d => d.classList.remove('open'));
  openPageMenuIndex = null;
}

// Close dropdown when clicking empty space in pageDropdown
pageDropdown.addEventListener('click', (e) => {
  if (openPageMenuIndex !== null && !e.target.closest('.page-thumb-menu-wrapper')) {
    closeAllPageMenus();
  }
});

function refreshPageGridIfOpen() {
  if (pageDropdown.classList.contains('open')) {
    renderPageGrid();
  }
}

// ===== Page Thumbnail Generation =====

function generateThumbnail(pageIndex) {
  // Create a temporary canvas for thumbnail
  const thumbCanvas = document.createElement('canvas');
  const thumbCtx = thumbCanvas.getContext('2d');
  const thumbWidth = 160;
  const thumbHeight = 100;

  thumbCanvas.width = thumbWidth;
  thumbCanvas.height = thumbHeight;

  // Scale to fit
  const scale = Math.min(thumbWidth / canvasLogicalWidth, thumbHeight / canvasLogicalHeight);

  // Draw page background color
  const pageBackground = pages[pageIndex].background || { pattern: 'none', color: '#ffffff' };
  thumbCtx.fillStyle = pageBackground.color || '#ffffff';
  thumbCtx.fillRect(0, 0, thumbWidth, thumbHeight);

  // Draw simple pattern indicator for thumbnails
  if (pageBackground.pattern && pageBackground.pattern !== 'none') {
    const patternColor = pageBackground.color === '#1d1d1f' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)';
    thumbCtx.strokeStyle = patternColor;
    thumbCtx.fillStyle = patternColor;
    const step = 10; // Smaller step for thumbnails
    if (pageBackground.pattern === 'grid') {
      thumbCtx.lineWidth = 0.5;
      thumbCtx.beginPath();
      for (let x = 0; x <= thumbWidth; x += step) {
        thumbCtx.moveTo(x, 0);
        thumbCtx.lineTo(x, thumbHeight);
      }
      for (let y = 0; y <= thumbHeight; y += step) {
        thumbCtx.moveTo(0, y);
        thumbCtx.lineTo(thumbWidth, y);
      }
      thumbCtx.stroke();
    } else if (pageBackground.pattern === 'dots') {
      for (let x = step; x < thumbWidth; x += step) {
        for (let y = step; y < thumbHeight; y += step) {
          thumbCtx.beginPath();
          thumbCtx.arc(x, y, 1, 0, Math.PI * 2);
          thumbCtx.fill();
        }
      }
    } else if (pageBackground.pattern === 'lines') {
      thumbCtx.lineWidth = 0.5;
      thumbCtx.beginPath();
      for (let y = step; y < thumbHeight; y += step) {
        thumbCtx.moveTo(0, y);
        thumbCtx.lineTo(thumbWidth, y);
      }
      thumbCtx.stroke();
    }
  }

  thumbCtx.save();
  thumbCtx.scale(scale, scale);

  // Draw page objects
  const pageObjects = pageIndex === currentPageIndex ? objects : pages[pageIndex].objects;

  for (const obj of pageObjects) {
    if (obj.type === 'brush' || obj.type === 'eraser') {
      thumbCtx.strokeStyle = obj.color;
      thumbCtx.lineWidth = obj.size;
      thumbCtx.lineCap = 'round';
      thumbCtx.lineJoin = 'round';
      thumbCtx.globalAlpha = obj.opacity;
      thumbCtx.beginPath();
      if (obj.points && obj.points.length > 0) {
        thumbCtx.moveTo(obj.points[0].x, obj.points[0].y);
        for (let i = 1; i < obj.points.length; i++) {
          thumbCtx.lineTo(obj.points[i].x, obj.points[i].y);
        }
      }
      thumbCtx.stroke();
      thumbCtx.globalAlpha = 1;
    } else if (obj.type === 'sticky') {
      thumbCtx.fillStyle = obj.color;
      thumbCtx.fillRect(obj.x, obj.y, obj.width, obj.height);
    } else if (obj.type === 'textbox' && obj.text) {
      thumbCtx.fillStyle = obj.color;
      thumbCtx.font = `${obj.bold ? 'bold ' : ''}${obj.fontSize || 18}px sans-serif`;
      thumbCtx.fillText(obj.text.substring(0, 20), obj.x, obj.y + (obj.fontSize || 18));
    } else if (obj.type === 'rect') {
      if (obj.fillColor && obj.fillColor !== 'transparent') {
        thumbCtx.fillStyle = obj.fillColor;
        thumbCtx.fillRect(obj.x1, obj.y1, obj.x2 - obj.x1, obj.y2 - obj.y1);
      }
      thumbCtx.strokeStyle = obj.color;
      thumbCtx.lineWidth = obj.size;
      thumbCtx.strokeRect(obj.x1, obj.y1, obj.x2 - obj.x1, obj.y2 - obj.y1);
    } else if (obj.type === 'circle') {
      const rx = Math.abs(obj.x2 - obj.x1) / 2;
      const ry = Math.abs(obj.y2 - obj.y1) / 2;
      const cx = (obj.x1 + obj.x2) / 2;
      const cy = (obj.y1 + obj.y2) / 2;
      thumbCtx.beginPath();
      thumbCtx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      if (obj.fillColor && obj.fillColor !== 'transparent') {
        thumbCtx.fillStyle = obj.fillColor;
        thumbCtx.fill();
      }
      thumbCtx.strokeStyle = obj.color;
      thumbCtx.lineWidth = obj.size;
      thumbCtx.stroke();
    } else if (obj.type === 'arrow') {
      // Arrow with x,y,width,height format for thumbnail
      const { x, y, width, height, rotation } = obj;
      const cx = x + width / 2;
      const cy = y + height / 2;

      thumbCtx.save();
      thumbCtx.translate(cx, cy);
      thumbCtx.rotate(rotation || 0);
      thumbCtx.translate(-cx, -cy);

      const w = width, h = height;
      const bodyWidth = h * 0.5;
      const headLen = Math.min(w * 0.35, h * 0.8);
      const bodyEnd = w - headLen;

      thumbCtx.beginPath();
      thumbCtx.moveTo(x, y + h/2 - bodyWidth/2);
      thumbCtx.lineTo(x + bodyEnd, y + h/2 - bodyWidth/2);
      thumbCtx.lineTo(x + bodyEnd, y);
      thumbCtx.lineTo(x + w, y + h/2);
      thumbCtx.lineTo(x + bodyEnd, y + h);
      thumbCtx.lineTo(x + bodyEnd, y + h/2 + bodyWidth/2);
      thumbCtx.lineTo(x, y + h/2 + bodyWidth/2);
      thumbCtx.closePath();

      if (obj.fillColor && obj.fillColor !== 'transparent') {
        thumbCtx.fillStyle = obj.fillColor;
        thumbCtx.fill();
      }
      thumbCtx.strokeStyle = obj.color;
      thumbCtx.lineWidth = obj.size;
      thumbCtx.stroke();
      thumbCtx.restore();
    } else if (obj.type === 'image' && obj.img) {
      thumbCtx.drawImage(obj.img, obj.x, obj.y, obj.width, obj.height);
    }
  }

  thumbCtx.restore();
  return thumbCanvas.toDataURL('image/png');
}

// ===== Page Grid Rendering =====

function createInsertButton(insertIndex) {
  const btn = document.createElement('button');
  btn.className = 'page-insert-btn';
  btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    insertPageAt(insertIndex);
  });
  return btn;
}

function renderPageGrid() {
  pageGrid.innerHTML = '';
  const canInsert = pages.length < MAX_PAGES;

  // Insert button before first page
  if (canInsert) {
    pageGrid.appendChild(createInsertButton(0));
  }

  pages.forEach((page, index) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'page-thumb-wrapper';

    const thumb = document.createElement('div');
    thumb.className = 'page-thumb' + (index === currentPageIndex ? ' active' : '');
    thumb.draggable = true;
    thumb.dataset.pageIndex = index;
    const showMenu = pages.length > 1 || pages.length < MAX_PAGES;
    thumb.innerHTML = `
      <img src="${generateThumbnail(index)}" alt="Page ${index + 1}" draggable="false">
      <span class="page-thumb-label">${index + 1}</span>
      ${showMenu ? `
        <div class="page-thumb-menu-wrapper">
          <button class="page-thumb-menu">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="6" r="2"/>
              <circle cx="12" cy="12" r="2"/>
              <circle cx="12" cy="18" r="2"/>
            </svg>
          </button>
          <div class="page-thumb-dropdown">
            <button class="page-thumb-dropdown-item" data-action="duplicate">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="11" height="11" rx="2"/>
                <path d="M5 15V5a2 2 0 0 1 2-2h10"/>
              </svg>
              <span data-i18n="whiteboard.menu.duplicate">Duplicate</span>
            </button>
            ${pages.length > 1 ? `
              <button class="page-thumb-dropdown-item danger" data-action="delete">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z"/>
                </svg>
                <span data-i18n="whiteboard.menu.delete">Delete</span>
              </button>
            ` : ''}
          </div>
        </div>
      ` : ''}
    `;

    // Click to select page
    thumb.addEventListener('click', (e) => {
      if (e.target.closest('.page-thumb-menu-wrapper')) return;
      e.stopPropagation();
      closeAllPageMenus();
      switchToPage(index);
      pageThumbnailFocused = true;
      renderPageGrid();
    });

    // Menu button
    if (showMenu) {
      const menuBtn = thumb.querySelector('.page-thumb-menu');
      const dropdown = thumb.querySelector('.page-thumb-dropdown');

      menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const wasOpen = openPageMenuIndex === index;
        closeAllPageMenus();
        if (!wasOpen) {
          menuBtn.classList.add('open');
          dropdown.classList.add('open');
          openPageMenuIndex = index;
        }
      });

      dropdown.querySelectorAll('.page-thumb-dropdown-item').forEach(item => {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          const action = item.dataset.action;
          closeAllPageMenus();
          if (action === 'duplicate') {
            duplicatePage(index);
          } else if (action === 'delete') {
            deletePage(index);
            renderPageGrid();
          }
        });
      });
    }

    // Drag start
    thumb.addEventListener('dragstart', (e) => {
      closeAllPageMenus();
      draggedPageIndex = index;
      thumb.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });

    // Drag end
    thumb.addEventListener('dragend', () => {
      thumb.classList.remove('dragging');
      draggedPageIndex = null;
      document.querySelectorAll('.page-thumb').forEach(t => t.classList.remove('drag-over'));
    });

    // Drag over
    thumb.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (draggedPageIndex !== null && draggedPageIndex !== index) {
        thumb.classList.add('drag-over');
      }
    });

    // Drag leave
    thumb.addEventListener('dragleave', () => {
      thumb.classList.remove('drag-over');
    });

    // Drop - reorder pages
    thumb.addEventListener('drop', (e) => {
      e.preventDefault();
      thumb.classList.remove('drag-over');
      if (draggedPageIndex !== null && draggedPageIndex !== index) {
        const fromIndex = draggedPageIndex;
        const toIndex = index;

        // Reorder pages array
        const [movedPage] = pages.splice(fromIndex, 1);
        pages.splice(toIndex, 0, movedPage);

        // Adjust currentPageIndex
        if (currentPageIndex === fromIndex) {
          currentPageIndex = toIndex;
        } else if (fromIndex < currentPageIndex && toIndex >= currentPageIndex) {
          currentPageIndex--;
        } else if (fromIndex > currentPageIndex && toIndex <= currentPageIndex) {
          currentPageIndex++;
        }

        updatePageUI();
        renderPageGrid();
        saveToLocalStorage();
        emitPageReorder(fromIndex, toIndex);
      }
      draggedPageIndex = null;
    });

    wrapper.appendChild(thumb);

    // Insert button after each page
    if (canInsert) {
      wrapper.appendChild(createInsertButton(index + 1));
    }

    pageGrid.appendChild(wrapper);
  });

  // Apply i18n if available
  if (typeof I18n !== 'undefined') {
    pageGrid.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const text = I18n.t(key);
      if (text && text !== key) el.textContent = text;
    });
  }
}

// ===== Page Background Management =====

function getPageBackground() {
  return pages[currentPageIndex].background || { pattern: 'none', color: '#ffffff' };
}

function setPageBackground(pattern, color) {
  if (!pages[currentPageIndex].background) {
    pages[currentPageIndex].background = { pattern: 'none', color: '#ffffff' };
  }
  if (pattern !== undefined) pages[currentPageIndex].background.pattern = pattern;
  if (color !== undefined) pages[currentPageIndex].background.color = color;
  redraw();
  saveCurrentPageState();
  saveToLocalStorage();
  saveBoardToServer();
  refreshPageGridIfOpen();
  // Emit to other users
  emitBackgroundChange(currentPageIndex, pages[currentPageIndex].background);
}

function updateBgDropdownUI() {
  const bg = getPageBackground();
  const bgDropdown = document.getElementById('bgDropdown');
  if (!bgDropdown) return;
  bgDropdown.querySelectorAll('.bg-pattern-option').forEach(opt => {
    opt.classList.toggle('active', opt.dataset.pattern === bg.pattern);
  });
  bgDropdown.querySelectorAll('.bg-color-option').forEach(opt => {
    opt.classList.toggle('active', opt.dataset.color === bg.color);
  });
}

// ===== Additional Page Functions =====

function addPageAt(index) {
  if (pages.length >= MAX_PAGES) return;
  const newPage = {
    objects: [],
    background: { pattern: 'none', color: '#ffffff' },
    history: [],
    historyIndex: -1,
    historySeq: []
  };
  pages.splice(index, 0, newPage);
  updatePageUI();
  refreshPageGridIfOpen();
  saveToLocalStorage();
  emitPageOperation('add', index);
}

function undoPageOperation() {
  if (pageUndoStack.length === 0) return;

  const op = pageUndoStack.pop();

  if (op.type === 'deletePage') {
    // Restore deleted page
    const restoredPage = op.page;
    // Reload images
    restoredPage.objects.forEach(obj => {
      if (obj.type === 'image' && obj.imgSrc && !obj.img) {
        const img = new Image();
        img.src = obj.imgSrc;
        obj.img = img;
      }
    });
    pages.splice(op.index, 0, restoredPage);
    currentPageIndex = op.index;
    loadPageState(currentPageIndex);
    selectedObjects = [];
    updateSelectedControls();
    redraw();
    updatePageUI();
    refreshPageGridIfOpen();
    saveToLocalStorage();
    emitPageOperation('restore', op.index);
  } else if (op.type === 'addPage') {
    // Undo add page = delete the page
    if (pages.length <= 1) return; // Can't delete last page

    const pageIndex = op.index;

    // If we're on the page being deleted, switch first
    if (currentPageIndex === pageIndex) {
      if (currentPageIndex > 0) {
        currentPageIndex--;
      }
    } else if (currentPageIndex > pageIndex) {
      currentPageIndex--;
    }

    pages.splice(pageIndex, 1);
    loadPageState(currentPageIndex);
    selectedObjects = [];
    updateSelectedControls();
    redraw();
    updatePageUI();
    refreshPageGridIfOpen();
    saveToLocalStorage();
    emitPageOperation('delete', pageIndex);
  }
}

function refreshPageGrid() {
  renderPageGrid();
}

function updateUndoRedoButtons() {
  const undoBtn = document.getElementById('undoBtn');
  const redoBtn = document.getElementById('redoBtn');
  if (undoBtn) {
    undoBtn.disabled = (currentBoard ? localUndoStack.length === 0 : historyIndex < 0) && pageUndoStack.length === 0;
  }
  if (redoBtn) {
    redoBtn.disabled = currentBoard ? localRedoStack.length === 0 : historyIndex >= history.length - 1;
  }
}
