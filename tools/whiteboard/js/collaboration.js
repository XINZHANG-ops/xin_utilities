/**
 * Whiteboard Real-time Collaboration Module
 *
 * Handles WebSocket connections, user presence, cursor tracking, and data synchronization
 * for real-time collaborative whiteboard features.
 *
 * Dependencies: Requires global variables from state.js
 * - socket, currentBoard, currentUser, userId, remoteUsers, isLocalMode
 * - pages, objects, currentPageIndex, selectedObjects
 * - canvas, canvasZoom, REF_WIDTH, REF_HEIGHT
 * - API_CONFIG, I18n
 */

// ========== Connection Management ==========

function updateConnectionStatus(status) {
  const wsStatus = document.getElementById('wsStatus');
  const wsStatusText = document.getElementById('wsStatusText');

  wsStatus.className = 'ws-status ' + status;
  if (status === 'connected') {
    wsStatusText.textContent = I18n.t('whiteboard.collab.connected');
  } else if (status === 'disconnected') {
    wsStatusText.textContent = I18n.t('whiteboard.collab.disconnected');
  } else if (status === 'connecting') {
    wsStatusText.textContent = I18n.t('whiteboard.collab.connecting');
  } else if (status === 'local') {
    wsStatusText.textContent = I18n.t('whiteboard.collab.localMode');
    wsStatus.className = 'ws-status';
  }
}

function resetCanvasView() {
  requestAnimationFrame(() => {
    const wrapper = document.getElementById('canvasWrapper');
    wrapper.scrollTo(0, 0);
  });
}

function connectWebSocket() {
  // Disconnect existing socket to prevent leaks when rejoining
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  const wsStatus = document.getElementById('wsStatus');
  wsStatus.style.display = 'flex';
  updateConnectionStatus('connecting');

  socket = io(API_CONFIG.getBaseUrl(), {
    // Use WebSocket only to avoid HTTP polling (saves ngrok requests)
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    timeout: 20000
  });

  let hasConnectedBefore = false;
  socket.on('connect', () => {
    console.log('[WB] Connected to server');
    updateConnectionStatus('connected');

    socket.emit('wb_join', {
      board_id: currentBoard.id,
      user: currentUser,
      sid: userId
    });

    // On reconnect, reload board data to sync any changes made while disconnected
    if (hasConnectedBefore) {
      console.log('[WB] Reconnected, reloading board data');
      loadBoardFromServer();
    }
    hasConnectedBefore = true;
  });

  socket.on('disconnect', () => {
    console.log('[WB] Disconnected');
    updateConnectionStatus('disconnected');
    remoteUsers = {};
    document.getElementById('usersOnline').innerHTML = '';
    clearRemoteCursors();
  });

  socket.on('connect_error', (err) => {
    console.error('[WB] Connection error:', err.message);
    updateConnectionStatus('disconnected');
    // Show hint for ngrok users
    if (err.message && err.message.includes('xhr')) {
      console.log('[WB] Hint: Try visiting the server URL directly first:', API_CONFIG.getBaseUrl());
    }
  });

  // User events
  socket.on('wb_joined', (data) => {
    console.log('[WB] Joined board:', data);
    // Clear all remote users first
    remoteUsers = {};
    clearRemoteCursors();
    // Only add users from the server response
    if (data.users && Array.isArray(data.users)) {
      data.users.forEach(u => {
        if (u.id !== userId) remoteUsers[u.id] = u;
      });
    }
    updateUsersDisplay();
  });

  socket.on('wb_user_joined', (data) => {
    console.log('[WB] User joined:', data.user);
    if (data.user && data.user.id !== userId) {
      remoteUsers[data.user.id] = data.user;
      updateUsersDisplay();
    }
  });

  socket.on('wb_user_left', (data) => {
    console.log('[WB] User left:', data.user_id);
    // Stop following if the user we're following left
    if (isFollowingUser && followingUserId === data.user_id) {
      stopFollowingUser();
    }
    delete remoteUsers[data.user_id];
    removeRemoteCursor(data.user_id);
    updateUsersDisplay();
  });

  // Cursor events
  socket.on('wb_cursor_update', (data) => {
    if (data.user_id !== userId) {
      // Update user's page info
      if (remoteUsers[data.user_id]) {
        remoteUsers[data.user_id].page = data.page;
      }
      updateRemoteCursor(data.user_id, data.x, data.y, data.page);
    }
  });

  // Object events
  socket.on('wb_object_update', (data) => {
    console.log('[WB] Object update:', data);
    handleRemoteObjectUpdate(data);
  });

  // Drawing events (real-time brush strokes)
  socket.on('wb_drawing_update', (data) => {
    handleRemoteDrawing(data);
  });

  // State events (undo/redo)
  socket.on('wb_state_update', (data) => {
    console.log('[WB] State update:', data);
    handleRemoteStateUpdate(data);
  });

  // Clear event
  socket.on('wb_clear_update', (data) => {
    console.log('[WB] Clear update:', data);
    const pageIndex = (typeof data.page_index === 'number' && data.page_index >= 0) ? data.page_index : 0;

    // Create missing pages if needed
    while (pages.length <= pageIndex) {
      pages.push({ objects: [], background: { pattern: 'none', color: '#ffffff' }, history: [], historyIndex: -1, historySeq: [] });
    }

    if (pageIndex === currentPageIndex) {
      objects = [];
      history = [];
      historyIndex = -1;
      selectedObjects = [];
      updateSelectedControls();
      saveCurrentPageState();
      redraw();
      updatePageUI();
      refreshPageGridIfOpen();
    } else {
      pages[pageIndex].objects = [];
      pages[pageIndex].history = [];
      pages[pageIndex].historyIndex = -1;
      updatePageUI();
      refreshPageGridIfOpen();
    }
  });

  // Page events
  socket.on('wb_page_update', (data) => {
    console.log('[WB] Page update:', data);
    handleRemotePageUpdate(data);
  });

  socket.on('wb_page_duplicate', (data) => {
    console.log('[WB] Page duplicate:', data);
    handleRemotePageDuplicate(data);
  });

  socket.on('wb_page_insert', (data) => {
    console.log('[WB] Page insert:', data);
    handleRemotePageInsert(data);
  });

  // Background events
  socket.on('wb_background_update', (data) => {
    console.log('[WB] Background update:', data);
    handleRemoteBackgroundChange(data);
  });

  // Laser pointer events (temporary, not saved)
  socket.on('wb_laser_update', (data) => {
    handleRemoteLaser(data);
  });

  // Z-index change events
  socket.on('wb_zindex_update', (data) => {
    handleRemoteZIndexChange(data);
  });

  // Full sync
  socket.on('wb_synced', (data) => {
    console.log('[WB] Board synced:', data);
    loadBoardData(data);
  });
}

// ========== User Presence & Display ==========

function updateUsersDisplay() {
  const usersOnlineEl = document.getElementById('usersOnline');

  // Filter out duplicates by user id
  const uniqueUsers = {};
  Object.values(remoteUsers).forEach(u => {
    uniqueUsers[u.id] = u;
  });
  const users = Object.values(uniqueUsers);
  usersOnlineEl.innerHTML = '';

  // Add current user first
  if (currentUser) {
    const avatar = document.createElement('div');
    avatar.className = 'user-avatar';
    avatar.style.background = currentUser.color;
    avatar.innerHTML = `${currentUser.name.charAt(0).toUpperCase()}<span class="user-avatar-tooltip">${currentUser.name} (${I18n.t('whiteboard.collab.you')})</span>`;
    usersOnlineEl.appendChild(avatar);
  }

  // Add remote users with page indicator and click-to-follow
  users.slice(0, 5).forEach(user => {
    const avatar = document.createElement('div');
    const isFollowing = followingUserId === user.id;
    avatar.className = 'user-avatar remote' + (isFollowing ? ' following' : '');
    avatar.style.background = user.color;
    const pageInfo = user.page !== undefined && user.page !== currentPageIndex ? ` [P${user.page + 1}]` : '';
    const followHint = isFollowing ? '' : ' - ' + I18n.t('whiteboard.collab.follow.clickToFollow');
    avatar.innerHTML = `${user.name.charAt(0).toUpperCase()}<span class="user-avatar-tooltip">${user.name}${pageInfo}${followHint}</span>`;
    avatar.addEventListener('click', () => startFollowingUser(user.id));
    usersOnlineEl.appendChild(avatar);
  });

  if (users.length > 5) {
    const more = document.createElement('div');
    more.className = 'user-avatar';
    more.style.background = '#86868b';
    more.textContent = `+${users.length - 5}`;
    usersOnlineEl.appendChild(more);
  }
}

// ========== Remote Cursor Management ==========

function updateRemoteCursor(uid, x, y, page) {
  const user = remoteUsers[uid];
  if (!user) return;

  let cursor = document.getElementById('cursor-' + uid);

  // Hide cursor if user is on different page or position is invalid
  const onSamePage = page === currentPageIndex;
  const validPosition = x >= 0 && y >= 0;

  // If following this user and they changed page, auto-switch
  if (isFollowingUser && followingUserId === uid && !onSamePage && page !== undefined) {
    switchToPage(page, true); // true = auto-follow
  }

  if (!onSamePage || !validPosition) {
    if (cursor) cursor.style.display = 'none';
    updateUsersDisplay(); // Update to show page info
    return;
  }

  if (!cursor) {
    cursor = document.createElement('div');
    cursor.id = 'cursor-' + uid;
    cursor.className = 'remote-cursor';
    cursor.style.color = user.color;
    cursor.innerHTML = `
      <div class="remote-cursor-pointer"></div>
      <div class="remote-cursor-label" style="background:${user.color}">${user.name}</div>
    `;
    document.getElementById('remoteCursors').appendChild(cursor);
  }

  cursor.style.display = 'block';
  const rect = canvas.getBoundingClientRect();
  const zoomScale = canvasZoom / 100;
  cursor.style.left = (rect.left + x * zoomScale) + 'px';
  cursor.style.top = (rect.top + y * zoomScale) + 'px';

  // If following this user, debounce scroll to cursor
  if (isFollowingUser && followingUserId === uid) {
    if (followScrollDebounceTimer) {
      clearTimeout(followScrollDebounceTimer);
    }
    followScrollDebounceTimer = setTimeout(() => {
      scrollToCursor(uid);
    }, 100);
  }
}

function removeRemoteCursor(uid) {
  const cursor = document.getElementById('cursor-' + uid);
  if (cursor) cursor.remove();
}

function clearRemoteCursors() {
  const remoteCursorsEl = document.getElementById('remoteCursors');
  remoteCursorsEl.innerHTML = '';
}

// ========== Follow Mode ==========

function startFollowingUser(uid) {
  // Toggle off if already following same user
  if (followingUserId === uid) {
    stopFollowingUser();
    return;
  }

  const user = remoteUsers[uid];
  if (!user) return;

  followingUserId = uid;
  isFollowingUser = true;

  // Update avatar display
  updateUsersDisplay();

  // Show follow indicator
  showFollowIndicator(user.name);

  // If target is on different page, switch to their page
  if (user.page !== undefined && user.page !== currentPageIndex) {
    switchToPage(user.page, true); // true = auto-follow, don't exit follow mode
  }

  // Immediately scroll to target's cursor if visible
  scrollToCursor(uid);
}

function stopFollowingUser() {
  followingUserId = null;
  isFollowingUser = false;

  // Clear debounce timer
  if (followScrollDebounceTimer) {
    clearTimeout(followScrollDebounceTimer);
    followScrollDebounceTimer = null;
  }

  // Update avatar display
  updateUsersDisplay();

  // Hide follow indicator
  hideFollowIndicator();
}

function scrollToCursor(uid) {
  const cursor = document.getElementById('cursor-' + uid);
  if (!cursor || cursor.style.display === 'none') return;

  const wrapper = document.getElementById('canvasWrapper');
  const rect = canvas.getBoundingClientRect();
  const wrapperRect = wrapper.getBoundingClientRect();

  // Get cursor position relative to canvas
  const cursorLeft = parseFloat(cursor.style.left) - rect.left;
  const cursorTop = parseFloat(cursor.style.top) - rect.top;

  // Calculate target scroll to center cursor in viewport
  const targetScrollLeft = cursorLeft - (wrapperRect.width / 2);
  const targetScrollTop = cursorTop - (wrapperRect.height / 2);

  // Clamp to valid range
  const maxScrollLeft = Math.max(0, canvas.offsetWidth - wrapperRect.width + 40);
  const maxScrollTop = Math.max(0, canvas.offsetHeight - wrapperRect.height + 40);

  const clampedLeft = Math.max(0, Math.min(targetScrollLeft, maxScrollLeft));
  const clampedTop = Math.max(0, Math.min(targetScrollTop, maxScrollTop));

  wrapper.scrollTo({
    left: clampedLeft,
    top: clampedTop,
    behavior: 'smooth'
  });
}

function showFollowIndicator(userName) {
  const indicator = document.getElementById('followIndicator');
  const text = document.getElementById('followIndicatorText');
  text.textContent = I18n.t('whiteboard.collab.follow.following') + ' ' + userName;
  indicator.classList.add('active');
}

function hideFollowIndicator() {
  const indicator = document.getElementById('followIndicator');
  indicator.classList.remove('active');
}

// ========== Emit Events (Outgoing) ==========

// Emit cursor position with page info (lastCursorEmit defined in state.js)
function emitCursor(x, y) {
  if (!socket || !socket.connected || !currentBoard) return;
  const now = Date.now();
  if (now - lastCursorEmit < 50) return; // Throttle to 20fps
  lastCursorEmit = now;
  socket.emit('wb_cursor', {
    board_id: currentBoard.id,
    sid: userId,
    x, y,
    page: currentPageIndex
  });
}

// Emit page change to let others know which page we're on
function emitPageChange() {
  if (!socket || !socket.connected || !currentBoard) return;
  socket.emit('wb_cursor', {
    board_id: currentBoard.id,
    sid: userId,
    x: -1, y: -1,
    page: currentPageIndex
  });
}

// Emit object changes (convert to ratio for cross-device sync)
function emitObjectChange(action, obj, pageIndex) {
  if (!socket || !socket.connected || !currentBoard) return;
  saveBoardToServer();

  // Record local modification time for move/update to avoid cross-update issues
  if (obj && (action === 'move' || action === 'update')) {
    localModifiedObjects[obj.id] = Date.now();
  }

  // Strip imgSrc on updates to avoid sending large base64 on every move/resize
  // Only send imgSrc on 'add' action; remote clients already have the image
  let ratioObj = obj ? toRatio(obj) : null;
  if (ratioObj && action === 'update' && ratioObj.type === 'image') {
    delete ratioObj.imgSrc;
  }

  socket.emit('wb_object', {
    board_id: currentBoard.id,
    sid: userId,
    action,
    object: ratioObj,
    page_index: pageIndex !== undefined ? pageIndex : currentPageIndex
  });
}

// Emit drawing (real-time brush strokes) - convert points to ratio
function emitDrawing(objId, points, brushProps) {
  if (!socket || !socket.connected || !currentBoard) return;
  // Convert points to ratio for cross-device sync
  const ratioPoints = points.map(p => ({
    x: p.x / REF_WIDTH,
    y: p.y / REF_HEIGHT
  }));
  socket.emit('wb_drawing', {
    board_id: currentBoard.id,
    sid: userId,
    obj_id: objId,
    points: ratioPoints,
    page_index: currentPageIndex,
    color: brushProps?.color,
    size: brushProps?.size,
    opacity: brushProps?.opacity,
    type: brushProps?.type || 'brush'
  });
}

// Emit undo/redo
function emitUndoRedo(action, state) {
  if (!socket || !socket.connected || !currentBoard) return;
  saveBoardToServer();
  socket.emit(action === 'undo' ? 'wb_undo' : 'wb_redo', {
    board_id: currentBoard.id,
    sid: userId,
    state,
    page_index: currentPageIndex
  });
}

// Emit clear
function emitClear() {
  if (!socket || !socket.connected || !currentBoard) return;
  saveBoardToServer();
  socket.emit('wb_clear', {
    board_id: currentBoard.id,
    sid: userId,
    page_index: currentPageIndex
  });
}

// Emit page operation
function emitPageOperation(action, pageIndex) {
  if (!socket || !socket.connected || !currentBoard) {
    console.log('[WB] emitPageOperation skipped:', { socket: !!socket, connected: socket?.connected, currentBoard: !!currentBoard });
    return;
  }
  console.log('[WB] Emitting wb_page:', { action, page_index: pageIndex });
  saveBoardToServer();
  socket.emit('wb_page', {
    board_id: currentBoard.id,
    sid: userId,
    action,
    page_index: pageIndex
  });
}

// Emit page reorder
function emitPageReorder(fromIndex, toIndex) {
  if (!socket || !socket.connected || !currentBoard) {
    console.log('[WB] emitPageReorder skipped:', { socket: !!socket, connected: socket?.connected, currentBoard: !!currentBoard });
    return;
  }
  console.log('[WB] Emitting wb_page reorder:', { from_index: fromIndex, to_index: toIndex });
  saveBoardToServer();
  socket.emit('wb_page', {
    board_id: currentBoard.id,
    sid: userId,
    action: 'reorder',
    from_index: fromIndex,
    to_index: toIndex
  });
}

// Emit background change
function emitBackgroundChange(pageIndex, background) {
  if (!socket || !socket.connected || !currentBoard) return;
  socket.emit('wb_background', {
    board_id: currentBoard.id,
    sid: userId,
    page_index: pageIndex,
    background: background
  });
}

// Emit laser pointer stroke
function emitLaser(strokeId, point) {
  if (!socket || !socket.connected || !currentBoard) return;
  socket.emit('wb_laser', {
    board_id: currentBoard.id,
    sid: userId,
    stroke_id: strokeId,
    point: { x: point.x / REF_WIDTH, y: point.y / REF_HEIGHT },
    page_index: currentPageIndex
  });
}

// Emit z-index change (object order)
function emitZIndexChange() {
  if (!socket || !socket.connected || !currentBoard) return;
  // Send array of object IDs in current order
  const objectOrder = objects.map(obj => obj.id);
  socket.emit('wb_zindex', {
    board_id: currentBoard.id,
    sid: userId,
    page_index: currentPageIndex,
    order: objectOrder
  });
  saveBoardToServer();
}

// ========== Handle Remote Events (Incoming) ==========

// Handle remote z-index change
function handleRemoteZIndexChange(data) {
  const pageIndex = data.page_index;
  const order = data.order; // Array of object IDs in new order

  if (!order || !Array.isArray(order)) return;

  // Z-index changes affect object ordering - clear undo stacks for this page
  // because previous undo operations may reference wrong array positions
  localUndoStack = localUndoStack.filter(op => op.pageIndex !== pageIndex);
  localRedoStack = localRedoStack.filter(op => op.pageIndex !== pageIndex);

  if (pageIndex === currentPageIndex) {
    // Reorder current page objects
    const newObjects = [];
    order.forEach(id => {
      const obj = objects.find(o => o.id === id);
      if (obj) newObjects.push(obj);
    });
    // Add any objects not in the order (shouldn't happen, but safety)
    objects.forEach(obj => {
      if (!newObjects.includes(obj)) newObjects.push(obj);
    });
    objects.length = 0;
    newObjects.forEach(obj => objects.push(obj));
    redraw();
  } else if (pageIndex < pages.length) {
    // Reorder other page objects
    const pageObjs = pages[pageIndex].objects;
    const newObjects = [];
    order.forEach(id => {
      const obj = pageObjs.find(o => o.id === id);
      if (obj) newObjects.push(obj);
    });
    pageObjs.forEach(obj => {
      if (!newObjects.includes(obj)) newObjects.push(obj);
    });
    pages[pageIndex].objects = newObjects;
    refreshPageGridIfOpen();
  }
}

// Handle remote laser pointer
function handleRemoteLaser(data) {
  if (data.page_index !== currentPageIndex) return;
  const x = data.point.x * REF_WIDTH;
  const y = data.point.y * REF_HEIGHT;
  addLaserPoint(data.stroke_id, x, y, true);
}

// Handle remote background change
function handleRemoteBackgroundChange(data) {
  const pageIndex = data.page_index;
  if (pageIndex >= 0 && pageIndex < pages.length) {
    pages[pageIndex].background = data.background || { pattern: 'none', color: '#ffffff' };
    if (pageIndex === currentPageIndex) {
      redraw();
      if (typeof updateBgDropdownUI === 'function') updateBgDropdownUI();
    }
    refreshPageGridIfOpen();
  }
}

// Handle remote object update (convert from ratio to local coordinates)
function handleRemoteObjectUpdate(data) {
  let needsPageUIUpdate = false;

  // Ensure page_index is valid, default to 0
  const pageIndex = (typeof data.page_index === 'number' && data.page_index >= 0) ? data.page_index : 0;

  // Convert from ratio to local coordinates
  const localObj = data.object ? fromRatio(data.object) : null;

  // Create missing pages if needed (for sync)
  while (pages.length <= pageIndex) {
    pages.push({ objects: [], background: { pattern: 'none', color: '#ffffff' }, history: [], historyIndex: -1, historySeq: [] });
    needsPageUIUpdate = true;
  }

  if (pageIndex !== currentPageIndex) {
    // Update other page
    if (data.action === 'add' && localObj) {
      // Load image if needed (for thumbnail display)
      if (localObj.type === 'image' && localObj.imgSrc && !localObj.img) {
        const img = new Image();
        img.onload = () => {
          localObj.img = img;
          refreshPageGridIfOpen();
        };
        img.onerror = () => {
          console.error('[WB] Failed to load remote image for different page');
        };
        img.src = localObj.imgSrc;
      }
      pages[pageIndex].objects.push(localObj);
      needsPageUIUpdate = true;
    } else if (data.action === 'delete' && localObj) {
      const idx = pages[pageIndex].objects.findIndex(o => o.id === localObj.id);
      if (idx >= 0) {
        pages[pageIndex].objects.splice(idx, 1);
        needsPageUIUpdate = true;
      }
    } else if ((data.action === 'update' || data.action === 'move') && localObj) {
      const idx = pages[pageIndex].objects.findIndex(o => o.id === localObj.id);
      if (idx >= 0) {
        // Preserve local img object and imgSrc (not sent on move/resize to save bandwidth)
        const existingImg = pages[pageIndex].objects[idx].img;
        const existingImgSrc = pages[pageIndex].objects[idx].imgSrc;
        Object.assign(pages[pageIndex].objects[idx], localObj);
        if (existingImg) pages[pageIndex].objects[idx].img = existingImg;
        if (!localObj.imgSrc && existingImgSrc) pages[pageIndex].objects[idx].imgSrc = existingImgSrc;
        needsPageUIUpdate = true;
      }
    }
    if (needsPageUIUpdate) {
      updatePageUI();
      refreshPageGridIfOpen();
    }
    return;
  }

  if (data.action === 'add' && localObj) {
    // Check if object already exists (e.g., from real-time drawing)
    const existingIdx = objects.findIndex(o => o.id === localObj.id);
    if (existingIdx >= 0) {
      // Preserve local img object (not sent over network)
      const existingImg = objects[existingIdx].img;
      Object.assign(objects[existingIdx], localObj);
      if (existingImg) objects[existingIdx].img = existingImg;
      // Clean up remoteDrawingObjects cache
      delete remoteDrawingObjects[localObj.id];
      redraw();
      updatePageUI();
    } else if (localObj.type === 'image' && localObj.imgSrc) {
      // Add object immediately so it's visible while loading
      objects.push(localObj);
      const img = new Image();
      img.onload = () => {
        localObj.img = img;
        redraw();
        updatePageUI();
        refreshPageGridIfOpen();
      };
      img.onerror = () => {
        console.error('[WB] Failed to load remote image');
        redraw(); // Still redraw to show placeholder/handles
      };
      img.src = localObj.imgSrc;
      redraw();
      updatePageUI();
    } else {
      objects.push(localObj);
      redraw();
      updatePageUI();
    }
  } else if (data.action === 'update' && localObj) {
    const idx = objects.findIndex(o => o.id === localObj.id);
    if (idx >= 0) {
      // Skip if this object was recently modified locally (avoid cross-update)
      const lastModified = localModifiedObjects[localObj.id];
      const isInCooldown = lastModified && (Date.now() - lastModified < LOCAL_MODIFY_COOLDOWN);
      const isLocallyDragging = dragHandle && selectedObjects.some(o => o.id === localObj.id);
      if (isLocallyDragging || isInCooldown) {
        console.log('[WB] Ignoring remote update for locally modified object:', localObj.id);
        return;
      }
      // Preserve local img object and imgSrc (not sent on move/resize to save bandwidth)
      const existingImg = objects[idx].img;
      const existingImgSrc = objects[idx].imgSrc;
      Object.assign(objects[idx], localObj);
      if (existingImg) objects[idx].img = existingImg;
      if (!localObj.imgSrc && existingImgSrc) objects[idx].imgSrc = existingImgSrc;
      // Load image if needed
      if (localObj.type === 'image' && localObj.imgSrc && !objects[idx].img) {
        const img = new Image();
        img.onload = () => {
          objects[idx].img = img;
          redraw();
          updatePageUI();
        };
        img.onerror = () => {
          console.error('[WB] Failed to load remote image on update');
          redraw();
        };
        img.src = localObj.imgSrc;
      }
      redraw();
      updatePageUI();
    }
  } else if (data.action === 'delete' && localObj) {
    const idx = objects.findIndex(o => o.id === localObj.id);
    if (idx >= 0) {
      objects.splice(idx, 1);
      redraw();
      updatePageUI();
    }
  } else if (data.action === 'move' && localObj) {
    const idx = objects.findIndex(o => o.id === localObj.id);
    if (idx >= 0) {
      // Skip if this object was recently modified locally (avoid cross-update)
      const lastModified = localModifiedObjects[localObj.id];
      const isInCooldown = lastModified && (Date.now() - lastModified < LOCAL_MODIFY_COOLDOWN);
      const isLocallyDragging = dragHandle && selectedObjects.some(o => o.id === localObj.id);
      if (isLocallyDragging || isInCooldown) {
        console.log('[WB] Ignoring remote move for locally modified object:', localObj.id);
        return;
      }
      // Preserve local img object and imgSrc (not sent on move to save bandwidth)
      const existingImg = objects[idx].img;
      const existingImgSrc = objects[idx].imgSrc;
      Object.assign(objects[idx], localObj);
      if (existingImg) objects[idx].img = existingImg;
      if (!localObj.imgSrc && existingImgSrc) objects[idx].imgSrc = existingImgSrc;
      redraw();
      updatePageUI();
    }
  }
  // Update thumbnails for any object change
  refreshPageGridIfOpen();
}

// Handle remote drawing (real-time brush) - convert points from ratio
// remoteDrawingObjects defined in state.js
function handleRemoteDrawing(data) {
  if (data.page_index !== currentPageIndex) return;

  if (!remoteDrawingObjects[data.obj_id]) {
    // Find or create the brush object
    let obj = objects.find(o => o.id === data.obj_id);
    if (!obj) {
      obj = {
        id: data.obj_id,
        type: data.type || 'brush',
        color: data.color || '#1d1d1f',
        size: data.size || 3,
        opacity: data.opacity !== undefined ? data.opacity : 1,
        points: []
      };
      objects.push(obj);
    }
    remoteDrawingObjects[data.obj_id] = obj;
  }

  const obj = remoteDrawingObjects[data.obj_id];
  if (data.points && data.points.length > 0) {
    // Convert points from ratio to local coordinates
    const localPoints = data.points.map(p => ({
      x: p.x * REF_WIDTH,
      y: p.y * REF_HEIGHT
    }));
    obj.points.push(...localPoints);
    redraw();
  }
}

// Handle remote state update (undo/redo)
function handleRemoteStateUpdate(data) {
  const pageIndex = (typeof data.page_index === 'number' && data.page_index >= 0) ? data.page_index : 0;

  // Create missing pages if needed
  while (pages.length <= pageIndex) {
    pages.push({ objects: [], background: { pattern: 'none', color: '#ffffff' }, history: [], historyIndex: -1, historySeq: [] });
  }

  if (pageIndex !== currentPageIndex) {
    // Update other page state
    if (data.state) {
      loadState(data.state).then(state => {
        pages[pageIndex].objects = state;
        updatePageUI();
        refreshPageGridIfOpen();
      });
    }
    return;
  }

  if (data.state) {
    loadState(data.state).then(state => {
      objects = state;
      selectedObjects = [];
      updateSelectedControls();
      saveCurrentPageState();
      redraw();
      updatePageUI();
      refreshPageGridIfOpen();
    });
  }
}

// Handle remote page update
function handleRemotePageUpdate(data) {
  if (data.action === 'add') {
    pages.push({ objects: [], background: { pattern: 'none', color: '#ffffff' }, history: [], historyIndex: -1, historySeq: [] });
    updatePageUI();
    refreshPageGridIfOpen();
    redraw();
  } else if (data.action === 'delete') {
    if (pages.length > 1 && data.page_index < pages.length) {
      const deletedPageIndex = data.page_index;
      pages.splice(deletedPageIndex, 1);

      // Clean up undo/redo stacks - remove operations for deleted page, adjust indices
      localUndoStack = localUndoStack.filter(op => {
        if (op.pageIndex === deletedPageIndex) return false;
        if (op.pageIndex > deletedPageIndex) op.pageIndex--;
        return true;
      });
      localRedoStack = localRedoStack.filter(op => {
        if (op.pageIndex === deletedPageIndex) return false;
        if (op.pageIndex > deletedPageIndex) op.pageIndex--;
        return true;
      });

      // Adjust current page index if needed
      if (currentPageIndex >= pages.length) {
        currentPageIndex = pages.length - 1;
      }
      // Always reload current page state (content at this index may have changed)
      loadPageState(currentPageIndex);
      selectedObjects = [];
      updateSelectedControls();
      updatePageUI();
      refreshPageGridIfOpen();
      redraw();
    }
  } else if (data.action === 'reorder') {
    const fromIndex = data.from_index;
    const toIndex = data.to_index;
    if (fromIndex >= 0 && fromIndex < pages.length && toIndex >= 0 && toIndex < pages.length) {
      // Reorder pages array
      const [movedPage] = pages.splice(fromIndex, 1);
      pages.splice(toIndex, 0, movedPage);

      // Adjust undo/redo stack page indices
      const adjustPageIndex = (op) => {
        if (op.pageIndex === fromIndex) {
          op.pageIndex = toIndex;
        } else if (fromIndex < op.pageIndex && toIndex >= op.pageIndex) {
          op.pageIndex--;
        } else if (fromIndex > op.pageIndex && toIndex <= op.pageIndex) {
          op.pageIndex++;
        }
      };
      localUndoStack.forEach(adjustPageIndex);
      localRedoStack.forEach(adjustPageIndex);

      // Adjust currentPageIndex
      if (currentPageIndex === fromIndex) {
        currentPageIndex = toIndex;
      } else if (fromIndex < currentPageIndex && toIndex >= currentPageIndex) {
        currentPageIndex--;
      } else if (fromIndex > currentPageIndex && toIndex <= currentPageIndex) {
        currentPageIndex++;
      }

      // Reload current page to ensure correct content
      loadPageState(currentPageIndex);
      selectedObjects = [];
      updateSelectedControls();
      updatePageUI();
      refreshPageGridIfOpen();
      redraw();
    }
  } else if (data.action === 'restore') {
    // Page was restored via undo - reload board data from server
    loadBoardFromServer();
  }
}

// Handle remote page duplicate
function handleRemotePageDuplicate(data) {
  const sourceIndex = data.sourceIndex;
  if (sourceIndex < 0 || pages.length >= MAX_PAGES) return;

  let newPage;
  if (data.pageData) {
    // Use sent page data (preferred - ensures exact copy)
    const localObjects = data.pageData.objects.map(obj => fromRatio(obj));
    newPage = {
      objects: localObjects,
      background: data.pageData.background || { pattern: 'none', color: '#ffffff' },
      history: [],
      historyIndex: -1,
      historySeq: []
    };
  } else if (sourceIndex < pages.length) {
    // Fallback: use local page (may be out of sync)
    const sourcePage = pages[sourceIndex];
    newPage = {
      objects: JSON.parse(JSON.stringify(sourcePage.objects)),
      background: sourcePage.background ? { ...sourcePage.background } : { pattern: 'none', color: '#ffffff' },
      history: [],
      historyIndex: -1,
      historySeq: []
    };
  } else {
    // Source page doesn't exist locally
    newPage = {
      objects: [],
      background: { pattern: 'none', color: '#ffffff' },
      history: [],
      historyIndex: -1,
      historySeq: []
    };
  }

  // Reload images for duplicated page
  newPage.objects.forEach(obj => {
    if (obj.type === 'image' && obj.imgSrc && !obj.img) {
      const img = new Image();
      img.onload = () => redraw();
      img.src = obj.imgSrc;
      obj.img = img;
    }
  });

  const insertIndex = sourceIndex + 1;
  pages.splice(insertIndex, 0, newPage);
  if (currentPageIndex > sourceIndex) currentPageIndex++;
  updatePageUI();
  refreshPageGridIfOpen();
  redraw();
}

// Handle remote page insert
function handleRemotePageInsert(data) {
  const insertIndex = data.insertIndex;
  if (insertIndex < 0 || insertIndex > pages.length || pages.length >= MAX_PAGES) return;

  const newPage = {
    objects: [],
    background: { pattern: 'none', color: '#ffffff' },
    history: [],
    historyIndex: -1,
    historySeq: []
  };
  pages.splice(insertIndex, 0, newPage);
  if (currentPageIndex >= insertIndex) currentPageIndex++;
  updatePageUI();
  refreshPageGridIfOpen();
  redraw();
}

// ========== Server Sync ==========

// Debounce timer for server saves
let saveDebounceTimer = null;
const SAVE_DEBOUNCE_MS = 2500; // Wait 2.5 seconds after last change before saving

// Save board to server (debounced to avoid excessive requests)
// Use immediate=true for critical saves (e.g., board creation)
function saveBoardToServer(immediate = false) {
  if (!currentBoard || isLocalMode) return;

  if (immediate) {
    // Cancel pending debounced save and save immediately
    if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
    return _doSaveBoardToServer();
  }

  // Clear existing timer and set a new one
  if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
  saveDebounceTimer = setTimeout(() => {
    _doSaveBoardToServer();
  }, SAVE_DEBOUNCE_MS);
}

// Internal function that actually saves to server
async function _doSaveBoardToServer() {
  if (!currentBoard || isLocalMode) return;

  saveCurrentPageState();
  const pagesData = pages.map(page => ({
    objects: page.objects.map(obj => {
      const ratioObj = toRatio(obj);
      if (obj.type === 'image') {
        return { ...ratioObj, imgSrc: obj.imgSrc, img: undefined };
      }
      return ratioObj;
    }),
    background: page.background || { pattern: 'none', color: '#ffffff' },
    history: [],
    historyIndex: -1,
    historySeq: []
  }));

  const boardData = {
    id: currentBoard.id,
    name: currentBoard.name,
    pages: pagesData,
    currentPageIndex,
    updatedAt: new Date().toISOString()
  };

  try {
    await API_CONFIG.fetch(`/whiteboard/${currentBoard.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(boardData)
    });
  } catch (e) {
    console.error('[WB] Save failed:', e);
  }
}

// Load board from server
async function loadBoardFromServer() {
  if (!currentBoard) return;

  try {
    const res = await API_CONFIG.fetch(`/whiteboard/${currentBoard.id}`);
    if (res.ok) {
      const data = await res.json();
      loadBoardData(data);
    }
  } catch (e) {
    console.error('[WB] Load failed:', e);
  }
}

// Load board data (convert from ratio to local coordinates)
async function loadBoardData(data) {
  if (!data || !data.pages) return;

  // Clear local undo/redo stacks when loading new board data
  localUndoStack = [];
  localRedoStack = [];

  pages = [];
  for (const pageData of data.pages) {
    // Convert ratio coordinates to local coordinates
    const localObjects = pageData.objects.map(obj => fromRatio(obj));
    const loadedObjects = await loadState(JSON.stringify(localObjects));
    pages.push({
      objects: loadedObjects,
      background: pageData.background || { pattern: 'none', color: '#ffffff' },
      history: [],
      historyIndex: -1,
      historySeq: []
    });
  }

  currentPageIndex = data.currentPageIndex || 0;
  if (currentPageIndex >= pages.length) currentPageIndex = 0;

  loadPageState(currentPageIndex);
  redraw();
  updatePageUI();
  refreshPageGridIfOpen();
}
