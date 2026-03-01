// Canvas setup and coordinate conversion functions
// Uses global variables from state.js:
// - canvas, ctx, canvasWrapper, canvasContainer
// - canvasZoom, canvasLogicalWidth, canvasLogicalHeight
// - dpr, REF_WIDTH, REF_HEIGHT

function updateCanvasPosition() {
  // Canvas position is now fixed via CSS (top: 88px, left: 72px)
}

function setupCanvas() {
  updateCanvasPosition();

  const zoomScale = canvasZoom / 100;
  const canvasDisplayW = canvasLogicalWidth * zoomScale;
  const canvasDisplayH = canvasLogicalHeight * zoomScale;

  // Set display size (CSS)
  canvas.style.width = canvasDisplayW + 'px';
  canvas.style.height = canvasDisplayH + 'px';

  // Update wrapper padding to allow scrolling to edges when canvas is large
  const wrapperRect = canvasWrapper.getBoundingClientRect();
  const padX = Math.max(0, (wrapperRect.width - canvasDisplayW) / 2);
  const padY = Math.max(0, (wrapperRect.height - canvasDisplayH) / 2);
  canvasContainer.style.margin = `${padY}px ${padX}px`;

  // Set actual size in memory (scaled for DPI and zoom)
  canvas.width = canvasLogicalWidth * dpr * zoomScale;
  canvas.height = canvasLogicalHeight * dpr * zoomScale;

  // Update container size
  canvasContainer.style.width = (canvasLogicalWidth * zoomScale) + 'px';
  canvasContainer.style.height = (canvasLogicalHeight * zoomScale) + 'px';

  // Scale context to match DPI and zoom
  ctx.setTransform(dpr * zoomScale, 0, 0, dpr * zoomScale, 0, 0);

  // Fill with white
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasLogicalWidth, canvasLogicalHeight);
}

function getMousePos(e) {
  const rect = canvas.getBoundingClientRect();
  const zoomScale = canvasZoom / 100;
  return {
    x: (e.clientX - rect.left) / zoomScale,
    y: (e.clientY - rect.top) / zoomScale
  };
}
