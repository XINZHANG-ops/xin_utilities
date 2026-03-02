/**
 * Text Edit Module - Text and Sticky Note Editing Functions
 *
 * This module handles all text editing functionality for textbox and sticky note objects.
 * Includes functions for starting/stopping inline text editing with overlay textarea.
 *
 * Dependencies:
 * - state.js: editingObject, editingObjectPrevState, canvas, canvasZoom, ctx
 * - utils.js: cloneObjectState, wrapText
 * - sync.js: saveLocalOperation, emitObjectChange
 * - history.js: saveState
 * - canvas.js: redraw
 * - i18n: I18n.t()
 */

/**
 * Start editing a text or sticky object with inline textarea overlay
 * @param {Object} obj - The text/sticky object to edit
 */
function startEditing(obj) {
  if (editingObject) {
    stopEditing();
  }

  editingObject = obj;
  editingObjectPrevState = cloneObjectState(obj);

  const rect = canvas.getBoundingClientRect();
  const scale = canvasZoom / 100;
  const textarea = document.createElement('textarea');
  textarea.className = 'text-edit-overlay' + (obj.type === 'sticky' ? ' sticky' : '');
  textarea.id = 'textEditOverlay';

  if (obj.type === 'sticky') {
    textarea.style.left = (rect.left + obj.x * scale) + 'px';
    textarea.style.top = (rect.top + obj.y * scale) + 'px';
    textarea.style.width = (obj.width * scale) + 'px';
    textarea.style.height = (obj.height * scale) + 'px';
    textarea.style.background = obj.color;
    textarea.style.color = obj.textColor || '#1d1d1f';
    textarea.style.fontSize = ((obj.fontSize || 16) * scale) + 'px';
    textarea.style.fontWeight = obj.bold ? 'bold' : 'normal';
  } else {
    textarea.style.left = (rect.left + (obj.x - 4) * scale) + 'px';
    textarea.style.top = (rect.top + (obj.y - 4) * scale) + 'px';
    textarea.style.width = ((obj.width + 8) * scale) + 'px';
    textarea.style.height = ((obj.height + 8) * scale) + 'px';
    textarea.style.background = 'rgba(255,255,255,0.95)';
    textarea.style.color = obj.textColor || obj.color || '#1d1d1f';
    textarea.style.fontSize = ((obj.fontSize || 18) * scale) + 'px';
    textarea.style.fontWeight = obj.bold ? 'bold' : 'normal';
    textarea.style.textAlign = obj.textAlign || 'left';
  }

  textarea.value = obj.text || '';
  textarea.placeholder = obj.type === 'sticky' ? I18n.t('whiteboard.placeholder.sticky') : I18n.t('whiteboard.placeholder.text');

  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  textarea.addEventListener('blur', stopEditing);
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      stopEditing();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      // Enter to confirm, Shift+Enter for newline
      e.preventDefault();
      stopEditing();
    }
  });

  // Exit editing when canvas is scrolled (textarea position would become misaligned)
  const wrapper = document.getElementById('canvasWrapper');
  const onScroll = () => stopEditing();
  wrapper.addEventListener('scroll', onScroll, { once: true });
  textarea._scrollHandler = { wrapper, onScroll };

  // Auto-resize for textbox
  if (obj.type === 'textbox') {
    textarea.addEventListener('input', () => {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    });
  }
}

/**
 * Stop editing and save changes to the text/sticky object
 */
function stopEditing() {
  // Prevent re-entry (blur event fires when removing textarea)
  if (!editingObject) return;

  const textarea = document.getElementById('textEditOverlay');
  if (textarea) {
    // Remove blur listener to prevent re-entry
    textarea.removeEventListener('blur', stopEditing);

    // Remove scroll listener if still attached
    if (textarea._scrollHandler) {
      textarea._scrollHandler.wrapper.removeEventListener('scroll', textarea._scrollHandler.onScroll);
    }

    editingObject.text = textarea.value;

    // Adjust textbox height based on content
    if (editingObject.type === 'textbox') {
      const fontWeight = editingObject.bold ? 'bold' : 'normal';
      ctx.font = `${fontWeight} ${editingObject.fontSize || 18}px 'Plus Jakarta Sans', sans-serif`;
      const lines = wrapText(editingObject.text, editingObject.width);
      editingObject.height = Math.max(40, lines.length * (editingObject.fontSize || 18) * 1.4);
    }

    // Save before clearing editingObject
    const objToSave = editingObject;
    const prevState = editingObjectPrevState;

    // Clear editing state first to prevent re-entry
    editingObject = null;
    editingObjectPrevState = null;

    // Now safe to remove textarea and save
    textarea.remove();
    objToSave.lastModified = Date.now();  // Timestamp for Last Write Wins
    saveLocalOperation('update', objToSave, prevState);
    saveState();
    emitObjectChange('update', objToSave);
    redraw();
  } else {
    editingObject = null;
    editingObjectPrevState = null;
  }
}
