// storage.js
// Local storage persistence for whiteboard state
// Depends on: state.js globals, pages.js functions (saveCurrentPageState, loadPageState), history.js functions (loadState)

function saveToLocalStorage() {
  // Only save to localStorage in local mode to avoid overwriting local data with collab data
  if (!isLocalMode) return;

  saveIndicator.textContent = I18n.t('whiteboard.status.saving');
  saveIndicator.classList.add('saving');

  // Save current page state first
  saveCurrentPageState();

  // Serialize all pages
  const pagesData = pages.map(page => ({
    objects: page.objects.map(obj => {
      if (obj.type === 'image') {
        return { ...obj, imgSrc: obj.imgSrc, img: undefined };
      }
      return { ...obj };
    }),
    background: page.background || { pattern: 'none', color: '#ffffff' },
    history: page.history,
    historyIndex: page.historyIndex
  }));

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      pages: pagesData,
      currentPageIndex: currentPageIndex,
      canvasWidth: canvasLogicalWidth,
      canvasHeight: canvasLogicalHeight
    }));
    setTimeout(() => {
      saveIndicator.textContent = I18n.t('whiteboard.status.saved');
      saveIndicator.classList.remove('saving');
    }, 300);
  } catch (e) {
    saveIndicator.textContent = I18n.t('whiteboard.status.storageFull');
    console.error('localStorage save failed:', e);
  }
}

async function loadFromLocalStorage() {
  // Only load from localStorage in local mode
  if (!isLocalMode) return;

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved);

      // Check if it's multi-page format or old single-page format
      if (data.pages) {
        // Multi-page format
        pages = [];
        for (const pageData of data.pages) {
          const loadedObjects = await loadState(JSON.stringify(pageData.objects));
          pages.push({
            objects: loadedObjects,
            background: pageData.background || { pattern: 'none', color: '#ffffff' },
            history: pageData.history || [],
            historyIndex: pageData.historyIndex !== undefined ? pageData.historyIndex : -1
          });
        }
        currentPageIndex = data.currentPageIndex || 0;
        if (currentPageIndex >= pages.length) currentPageIndex = 0;
      } else if (data.objects) {
        // Old single-page format - migrate
        const loadedObjects = await loadState(JSON.stringify(data.objects));
        pages = [{
          objects: loadedObjects,
          background: { pattern: 'none', color: '#ffffff' },
          history: [JSON.stringify(data.objects)],
          historyIndex: 0
        }];
        currentPageIndex = 0;
      }

      loadPageState(currentPageIndex);
      redraw();
      updatePageUI();
    }
  } catch (e) {
    console.error('localStorage load failed:', e);
  }
}
