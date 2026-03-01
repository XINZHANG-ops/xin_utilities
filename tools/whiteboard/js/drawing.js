// drawing.js - Canvas drawing and rendering functions
// This module contains all functions related to drawing objects on the canvas.
// Uses global variables from state.js - see state.js for variable declarations.
// shapePreview is declared in state.js

// ============================================================================
// SMOOTH STROKE HELPER
// ============================================================================

/**
 * Draw a smooth stroke using quadratic bezier curves
 * Uses midpoints between consecutive points as curve endpoints
 * This creates a smooth, continuous curve through all points
 * @param {CanvasRenderingContext2D} context - The canvas context to draw on
 * @param {Array} points - Array of {x, y} points
 */
function drawSmoothStroke(context, points) {
  if (!points || points.length === 0) return;

  if (points.length === 1) {
    // Single point - draw a dot
    context.beginPath();
    context.arc(points[0].x, points[0].y, context.lineWidth / 2, 0, Math.PI * 2);
    context.fill();
    return;
  }

  if (points.length === 2) {
    // Two points - draw a line
    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    context.lineTo(points[1].x, points[1].y);
    context.stroke();
    return;
  }

  // Three or more points - use quadratic curves through midpoints
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);

  // Draw curve to midpoint of first two points
  let midX = (points[0].x + points[1].x) / 2;
  let midY = (points[0].y + points[1].y) / 2;
  context.lineTo(midX, midY);

  // For each subsequent point, draw a quadratic curve
  // Control point is the current point, end point is the midpoint to next point
  for (let i = 1; i < points.length - 1; i++) {
    const cpX = points[i].x;
    const cpY = points[i].y;
    midX = (points[i].x + points[i + 1].x) / 2;
    midY = (points[i].y + points[i + 1].y) / 2;
    context.quadraticCurveTo(cpX, cpY, midX, midY);
  }

  // Draw line to the last point
  const lastPoint = points[points.length - 1];
  context.lineTo(lastPoint.x, lastPoint.y);

  context.stroke();
}

// ============================================================================
// REDRAW FUNCTIONS
// ============================================================================

let redrawScheduled = false;

function redraw() {
  if (redrawScheduled) return;
  redrawScheduled = true;
  requestAnimationFrame(() => {
    redrawScheduled = false;
    redrawNow();
    // Draw shape preview after canvas is redrawn
    if (shapePreview) {
      drawShapePreview(shapePreview.type, shapePreview.x1, shapePreview.y1, shapePreview.x2, shapePreview.y2);
    }
  });
}

function redrawNow() {
  const zoomScale = canvasZoom / 100;
  // Reset transform and clear entire canvas to handle browser zoom
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  // Draw background color
  const bg = pages[currentPageIndex]?.background || { pattern: 'none', color: '#ffffff' };
  ctx.fillStyle = bg.color || '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw background pattern
  if (bg.pattern && bg.pattern !== 'none') {
    ctx.save();
    const patternColor = bg.color === '#1d1d1f' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)';
    ctx.strokeStyle = patternColor;
    ctx.fillStyle = patternColor;
    const step = 25 * dpr;

    if (bg.pattern === 'grid') {
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= canvas.width; x += step) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
      }
      for (let y = 0; y <= canvas.height; y += step) {
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
      }
      ctx.stroke();
    } else if (bg.pattern === 'dots') {
      const dotRadius = 1.5 * dpr;
      for (let x = step; x < canvas.width; x += step) {
        for (let y = step; y < canvas.height; y += step) {
          ctx.beginPath();
          ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (bg.pattern === 'lines') {
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let y = step; y < canvas.height; y += step) {
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  // Restore DPI and zoom scaling
  ctx.setTransform(dpr * zoomScale, 0, 0, dpr * zoomScale, 0, 0);

  // Layer 1: Images (bottom layer)
  for (const obj of objects) {
    if (obj.type === 'image') {
      drawImage(obj, selectedObjects.includes(obj));
    }
  }

  // Layer 2: Shapes (rect, circle, arrow)
  for (const obj of objects) {
    if (obj.type === 'rect' || obj.type === 'circle' || obj.type === 'arrow') {
      drawShape(obj, selectedObjects.includes(obj));
    }
  }

  // Layer 3: Sticky notes and text boxes
  for (const obj of objects) {
    if (obj.type === 'sticky') {
      drawSticky(obj, selectedObjects.includes(obj));
    } else if (obj.type === 'textbox') {
      drawTextBox(obj, selectedObjects.includes(obj));
    }
  }

  // Layer 4: Brush strokes and eraser (on top, use offscreen canvas for true erasing)
  const offCanvas = document.createElement('canvas');
  offCanvas.width = canvas.width;
  offCanvas.height = canvas.height;
  const offCtx = offCanvas.getContext('2d');
  offCtx.setTransform(dpr * zoomScale, 0, 0, dpr * zoomScale, 0, 0);

  // Process brush and eraser in order (eraser only affects strokes drawn before it)
  for (const obj of objects) {
    if (obj.type === 'brush') {
      offCtx.save();
      offCtx.globalCompositeOperation = 'source-over';
      offCtx.globalAlpha = obj.opacity;
      offCtx.strokeStyle = obj.color;
      offCtx.lineWidth = obj.size;
      offCtx.lineCap = 'round';
      offCtx.lineJoin = 'round';
      drawSmoothStroke(offCtx, obj.points);
      offCtx.restore();
    } else if (obj.type === 'eraser') {
      offCtx.save();
      offCtx.globalCompositeOperation = 'destination-out';
      offCtx.strokeStyle = 'rgba(0,0,0,1)';
      offCtx.lineWidth = obj.size;
      offCtx.lineCap = 'round';
      offCtx.lineJoin = 'round';
      drawSmoothStroke(offCtx, obj.points);
      offCtx.restore();
    }
  }

  // Composite brush layer onto main canvas
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(offCanvas, 0, 0);
  ctx.restore();
  ctx.setTransform(dpr * zoomScale, 0, 0, dpr * zoomScale, 0, 0);

  // Layer 5: Laser pointer strokes (temporary, always on top)
  drawLaserStrokes();
}

// ============================================================================
// BRUSH STROKE RENDERING
// ============================================================================

function drawBrushStroke(obj) {
  ctx.save();
  ctx.globalAlpha = obj.opacity;
  ctx.strokeStyle = obj.color;
  ctx.lineWidth = obj.size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const points = obj.points;
  const len = points.length;

  if (len === 1) {
    // Single point - draw a dot
    ctx.beginPath();
    ctx.arc(points[0].x, points[0].y, obj.size / 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (len === 2) {
    // Two points - draw a line
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    ctx.lineTo(points[1].x, points[1].y);
    ctx.stroke();
  } else if (len >= 3) {
    // Draw the last curve segment using quadratic bezier
    // We need to redraw the last two segments to ensure smoothness
    const p0 = points[len - 3];
    const p1 = points[len - 2];
    const p2 = points[len - 1];

    // Calculate midpoints
    const mid0x = (p0.x + p1.x) / 2;
    const mid0y = (p0.y + p1.y) / 2;
    const mid1x = (p1.x + p2.x) / 2;
    const mid1y = (p1.y + p2.y) / 2;

    ctx.beginPath();
    ctx.moveTo(mid0x, mid0y);
    ctx.quadraticCurveTo(p1.x, p1.y, mid1x, mid1y);
    ctx.stroke();

    // Also draw to the final point
    ctx.beginPath();
    ctx.moveTo(mid1x, mid1y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }
  ctx.restore();
}

// ============================================================================
// SHAPE RENDERING
// ============================================================================

function drawShapePreview(type, x1, y1, x2, y2) {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = shapeStrokeColor;
  ctx.lineWidth = strokeSize;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const hasFill = shapeFillColor && shapeFillColor !== 'transparent';

  if (type === 'rect') {
    if (hasFill) {
      ctx.fillStyle = shapeFillColor;
      ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
    }
    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
  } else if (type === 'circle') {
    const rx = Math.abs(x2 - x1) / 2;
    const ry = Math.abs(y2 - y1) / 2;
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    if (hasFill) {
      ctx.fillStyle = shapeFillColor;
      ctx.fill();
    }
    ctx.stroke();
  } else if (type === 'arrow') {
    // Draw filled block arrow shape (preview) - simple bounding box like rect
    const x = Math.min(x1, x2);
    const y = Math.min(y1, y2);
    const w = Math.max(50, Math.abs(x2 - x1));
    const h = Math.max(40, Math.abs(y2 - y1));

    const bodyWidth = h * 0.5;
    const headLen = Math.min(w * 0.35, h * 0.8);
    const bodyEnd = w - headLen;

    ctx.beginPath();
    ctx.moveTo(x, y + h/2 - bodyWidth/2);
    ctx.lineTo(x + bodyEnd, y + h/2 - bodyWidth/2);
    ctx.lineTo(x + bodyEnd, y);
    ctx.lineTo(x + w, y + h/2);
    ctx.lineTo(x + bodyEnd, y + h);
    ctx.lineTo(x + bodyEnd, y + h/2 + bodyWidth/2);
    ctx.lineTo(x, y + h/2 + bodyWidth/2);
    ctx.closePath();

    if (hasFill) {
      ctx.fillStyle = shapeFillColor;
      ctx.fill();
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawShape(obj, selected = false) {
  ctx.save();
  ctx.globalAlpha = obj.opacity;
  ctx.strokeStyle = obj.color;
  ctx.lineWidth = obj.size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const { type } = obj;
  const hasFill = obj.fillColor && obj.fillColor !== 'transparent';

  if (type === 'arrow') {
    // Arrow uses x,y,width,height format
    const { x, y, width, height } = obj;
    const rotation = obj.rotation || 0;
    const cx = x + width / 2;
    const cy = y + height / 2;

    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    ctx.translate(-cx, -cy);

    // Draw arrow shape within bounding box (pointing right)
    const w = width;
    const h = height;
    const bodyWidth = h * 0.5;
    const headWidth = h;
    const headLen = Math.min(w * 0.35, h * 0.8);
    const bodyEnd = w - headLen;

    ctx.beginPath();
    ctx.moveTo(x, y + h/2 - bodyWidth/2);                    // top-left of tail
    ctx.lineTo(x + bodyEnd, y + h/2 - bodyWidth/2);          // top before head
    ctx.lineTo(x + bodyEnd, y);                               // top of head base
    ctx.lineTo(x + w, y + h/2);                               // arrow tip
    ctx.lineTo(x + bodyEnd, y + h);                           // bottom of head base
    ctx.lineTo(x + bodyEnd, y + h/2 + bodyWidth/2);          // bottom before head
    ctx.lineTo(x, y + h/2 + bodyWidth/2);                    // bottom-left of tail
    ctx.closePath();

    if (hasFill) {
      ctx.fillStyle = obj.fillColor;
      ctx.fill();
    }
    ctx.stroke();
    ctx.restore();

    if (selected) {
      drawRectHandles(obj);
    }
    return;
  }

  // rect and circle use x1,y1,x2,y2 format
  const { x1, y1, x2, y2 } = obj;
  const rotation = obj.rotation || 0;
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;

  // Apply rotation around center
  if (rotation !== 0) {
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    ctx.translate(-cx, -cy);
  }

  if (type === 'rect') {
    if (hasFill) {
      ctx.fillStyle = obj.fillColor;
      ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
    }
    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
  } else if (type === 'circle') {
    const rx = Math.abs(x2 - x1) / 2;
    const ry = Math.abs(y2 - y1) / 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    if (hasFill) {
      ctx.fillStyle = obj.fillColor;
      ctx.fill();
    }
    ctx.stroke();
  }
  ctx.restore();

  if (selected) {
    drawShapeHandles(obj);
  }
}

function drawShapeHandles(obj) {
  const { x1, y1, x2, y2 } = obj;
  const rotation = obj.rotation || 0;
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;

  ctx.save();

  // Apply same rotation for handles
  if (rotation !== 0) {
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    ctx.translate(-cx, -cy);
  }

  // Draw 3 corner handles (not top-left - that's the rotation handle)
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#30d158';
  ctx.lineWidth = 2;

  const minX = Math.min(x1, x2);
  const minY = Math.min(y1, y2);
  const maxX = Math.max(x1, x2);
  const maxY = Math.max(y1, y2);

  // NE, SW, SE corners (like drawRectHandles)
  const corners = [
    { x: maxX, y: minY },  // top-right (NE)
    { x: minX, y: maxY },  // bottom-left (SW)
    { x: maxX, y: maxY }   // bottom-right (SE)
  ];

  corners.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });

  // Draw rotation handle at top-left corner
  const handleX = minX;
  const handleY = minY;
  const handleRadius = 8;

  // White circle background with rotation icon
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#007aff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(handleX, handleY, handleRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Draw rotation icon - opening toward bottom-right (toward the object)
  ctx.strokeStyle = '#007aff';
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const r = 4;
  // Arc: start at right (0°), go counterclockwise (through top, left) to bottom (π/2)
  // This draws 270° arc, leaving 90° gap at bottom-right (toward the object)
  const startAngle = -Math.PI * 0.05;  // slightly above right
  const endAngle = Math.PI * 0.55;     // slightly past bottom
  ctx.beginPath();
  ctx.arc(handleX, handleY, r, startAngle, endAngle, true);  // counterclockwise = long way
  ctx.stroke();
  // Arrow head at end (bottom), pointing clockwise (toward the gap/object)
  const ax = handleX + r * Math.cos(endAngle);
  const ay = handleY + r * Math.sin(endAngle);
  // Tangent direction at endAngle going clockwise (increasing angle in canvas)
  const tangentAngle = endAngle + Math.PI / 2;
  ctx.beginPath();
  ctx.moveTo(ax - 2.5 * Math.cos(tangentAngle - 0.5), ay - 2.5 * Math.sin(tangentAngle - 0.5));
  ctx.lineTo(ax, ay);
  ctx.lineTo(ax - 2.5 * Math.cos(tangentAngle + 0.5), ay - 2.5 * Math.sin(tangentAngle + 0.5));
  ctx.stroke();

  ctx.restore();
}

function drawHandles(x1, y1, x2, y2) {
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#30d158';
  ctx.lineWidth = 2;

  [{ x: x1, y: y1 }, { x: x2, y: y2 }].forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
}

// ============================================================================
// IMAGE RENDERING
// ============================================================================

function drawImage(obj, selected = false) {
  ctx.save();
  ctx.globalAlpha = obj.opacity || 1;

  const rotation = obj.rotation || 0;
  const cx = obj.x + obj.width / 2;
  const cy = obj.y + obj.height / 2;

  // Apply rotation around center
  if (rotation !== 0) {
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    ctx.translate(-cx, -cy);
  }

  if (obj.img) {
    ctx.drawImage(obj.img, obj.x, obj.y, obj.width, obj.height);
  } else {
    // Draw placeholder for loading/failed image
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
    // Draw loading icon
    ctx.fillStyle = '#999';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Loading...', cx, cy);
  }

  if (selected) {
    ctx.strokeStyle = '#30d158';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
    ctx.setLineDash([]);
  }

  ctx.restore();

  if (selected) {
    drawRectHandles(obj);
  }
}

// ============================================================================
// STICKY NOTE RENDERING
// ============================================================================

function drawSticky(obj, selected = false) {
  ctx.save();

  const radius = 12;
  const padding = 8;
  // Nunito font with bolder weight for sticky notes
  const fontWeight = obj.bold ? '700' : '600';
  const fontFamily = "'Nunito', sans-serif";
  // Ensure positive values for text area (minimum 1px)
  const maxWidth = Math.max(1, obj.width - padding * 2);
  const maxHeight = Math.max(1, obj.height - padding * 2);

  // Use cached font calculation if dimensions haven't changed much
  const cacheKey = `${Math.round(maxWidth)}_${Math.round(maxHeight)}_${obj.text}_${fontWeight}`;
  let fontSize, lines;

  if (obj._fontCache && obj._fontCacheKey === cacheKey) {
    fontSize = obj._fontCache.fontSize;
    lines = obj._fontCache.lines;
  } else if (obj.text && maxWidth > 0 && maxHeight > 0) {
    // Binary search for optimal font size (fast)
    const minFontSize = 10;
    const maxFontSizeCalc = Math.max(minFontSize, Math.min(120, maxHeight * 0.9));
    fontSize = minFontSize;
    lines = [];

    let lo = minFontSize, hi = maxFontSizeCalc;
    while (hi - lo > 3) {
      const mid = Math.floor((lo + hi) / 2);
      ctx.font = `${fontWeight} ${mid}px ${fontFamily}`;
      const testLines = wrapText(obj.text, maxWidth);
      if (testLines.length * mid * 1.35 <= maxHeight) {
        lo = mid;
      } else {
        hi = mid - 1;
      }
    }
    // Final check at lo
    ctx.font = `${fontWeight} ${lo}px ${fontFamily}`;
    lines = wrapText(obj.text, maxWidth);
    fontSize = lo;

    // Cache result
    obj._fontCache = { fontSize, lines };
    obj._fontCacheKey = cacheKey;
  } else {
    fontSize = 10;
    lines = [];
  }
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;

  const rotation = obj.rotation || 0;
  const cx = obj.x + obj.width / 2;
  const cy = obj.y + obj.height / 2;

  // Apply rotation around center
  if (rotation !== 0) {
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    ctx.translate(-cx, -cy);
  }

  // Draw shadow
  ctx.shadowColor = 'rgba(0,0,0,0.2)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 4;

  // Draw sticky note background with rounded corners
  ctx.fillStyle = obj.color;
  ctx.beginPath();
  ctx.roundRect(obj.x, obj.y, obj.width, obj.height, radius);
  ctx.fill();

  ctx.shadowColor = 'transparent';

  // Draw subtle border
  ctx.strokeStyle = 'rgba(0,0,0,0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(obj.x, obj.y, obj.width, obj.height, radius);
  ctx.stroke();

  // Draw text with clipping to prevent overflow
  if (obj.text && lines.length > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(obj.x, obj.y, obj.width, obj.height);
    ctx.clip();

    ctx.fillStyle = obj.textColor || '#1d1d1f';
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    ctx.textBaseline = 'top';

    const lineHeight = fontSize * 1.35;
    const totalTextHeight = lines.length * lineHeight;
    // Vertically center text block within sticky note
    const startY = obj.y + Math.max(padding, (obj.height - totalTextHeight) / 2);

    // Draw all text lines
    lines.forEach((line, i) => {
      ctx.fillText(line, obj.x + padding, startY + i * lineHeight);
    });
    ctx.restore();
  }

  ctx.restore();

  if (selected) {
    drawRectHandles(obj);
  }
}

// ============================================================================
// TEXT BOX RENDERING
// ============================================================================

function drawTextBox(obj, selected = false) {
  ctx.save();

  const rotation = obj.rotation || 0;
  const cx = obj.x + obj.width / 2;
  const cy = obj.y + obj.height / 2;

  // Apply rotation around center
  if (rotation !== 0) {
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    ctx.translate(-cx, -cy);
  }

  // Draw text
  if (obj.text) {
    ctx.fillStyle = obj.textColor || obj.color || '#1d1d1f';
    const fontWeight = obj.bold ? 'bold' : 'normal';
    ctx.font = `${fontWeight} ${obj.fontSize || 18}px 'Plus Jakarta Sans', sans-serif`;
    ctx.textBaseline = 'top';

    const lineHeight = (obj.fontSize || 18) * 1.4;
    const lines = wrapText(obj.text, obj.width);
    const align = obj.textAlign || 'left';

    lines.forEach((line, i) => {
      let drawX = obj.x;
      if (align === 'center') {
        const lineWidth = ctx.measureText(line).width;
        drawX = obj.x + (obj.width - lineWidth) / 2;
      } else if (align === 'right') {
        const lineWidth = ctx.measureText(line).width;
        drawX = obj.x + obj.width - lineWidth;
      }
      ctx.fillText(line, drawX, obj.y + i * lineHeight);
    });
  }

  if (selected) {
    // Draw selection border (inside rotation transform)
    ctx.strokeStyle = '#30d158';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(obj.x - 4, obj.y - 4, obj.width + 8, obj.height + 8);
    ctx.setLineDash([]);
  }

  ctx.restore();

  if (selected) {
    drawRectHandles(obj);
  }
}

function drawRectHandles(obj) {
  const rotation = obj.rotation || 0;
  const cx = obj.x + obj.width / 2;
  const cy = obj.y + obj.height / 2;

  ctx.save();

  // Apply rotation around center
  if (rotation !== 0) {
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    ctx.translate(-cx, -cy);
  }

  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#30d158';
  ctx.lineWidth = 2;

  // Draw 3 corner handles (not nw - that's the rotation handle)
  const corners = [
    { x: obj.x + obj.width, y: obj.y },
    { x: obj.x, y: obj.y + obj.height },
    { x: obj.x + obj.width, y: obj.y + obj.height }
  ];

  corners.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });

  // Draw rotation handle at top-left corner (replaces nw resize handle)
  const handleX = obj.x;
  const handleY = obj.y;
  const handleRadius = 8;

  // White circle background with rotation icon
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#007aff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(handleX, handleY, handleRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Draw rotation icon - opening toward bottom-right (toward the object)
  ctx.strokeStyle = '#007aff';
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const r = 4;
  // Arc: start at right (0°), go counterclockwise (through top, left) to bottom (π/2)
  // This draws 270° arc, leaving 90° gap at bottom-right (toward the object)
  const startAngle = -Math.PI * 0.05;  // slightly above right
  const endAngle = Math.PI * 0.55;     // slightly past bottom
  ctx.beginPath();
  ctx.arc(handleX, handleY, r, startAngle, endAngle, true);  // counterclockwise = long way
  ctx.stroke();
  // Arrow head at end (bottom), pointing clockwise (toward the gap/object)
  const ax = handleX + r * Math.cos(endAngle);
  const ay = handleY + r * Math.sin(endAngle);
  // Tangent direction at endAngle going clockwise (increasing angle in canvas)
  const tangentAngle = endAngle + Math.PI / 2;
  ctx.beginPath();
  ctx.moveTo(ax - 2.5 * Math.cos(tangentAngle - 0.5), ay - 2.5 * Math.sin(tangentAngle - 0.5));
  ctx.lineTo(ax, ay);
  ctx.lineTo(ax - 2.5 * Math.cos(tangentAngle + 0.5), ay - 2.5 * Math.sin(tangentAngle + 0.5));
  ctx.stroke();

  ctx.restore();
}

// ============================================================================
// TEXT WRAPPING HELPER
// ============================================================================

function wrapText(text, maxWidth) {
  const lines = [];
  const paragraphs = text.split('\n');

  paragraphs.forEach(paragraph => {
    if (!paragraph) {
      lines.push('');
      return;
    }

    const words = paragraph.split('');
    let currentLine = '';

    for (const char of words) {
      const testLine = currentLine + char;
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = char;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
  });

  return lines;
}

// ============================================================================
// SELECTION BOX
// ============================================================================

function drawSelectionBox() {
  if (!selectBoxStart || !selectBoxEnd) return;
  ctx.save();
  ctx.strokeStyle = '#30d158';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);
  ctx.fillStyle = 'rgba(48, 209, 88, 0.1)';

  const x = Math.min(selectBoxStart.x, selectBoxEnd.x);
  const y = Math.min(selectBoxStart.y, selectBoxEnd.y);
  const w = Math.abs(selectBoxEnd.x - selectBoxStart.x);
  const h = Math.abs(selectBoxEnd.y - selectBoxStart.y);

  ctx.fillRect(x, y, w, h);
  ctx.strokeRect(x, y, w, h);
  ctx.setLineDash([]);
  ctx.restore();
}

// ============================================================================
// LASER POINTER RENDERING
// ============================================================================

// Draw laser strokes with fade effect (smooth curves with gradient tail)
function drawLaserStrokes() {
  const now = Date.now();
  const bg = pages[currentPageIndex]?.background || { pattern: 'none', color: '#ffffff' };
  const laserColor = bg.color === '#1d1d1f' ? '#ffffff' : '#1d1d1f';

  for (const stroke of laserStrokes) {
    const points = stroke.points;
    if (points.length < 2) continue;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = laserColor;

    // Draw smooth curve using catmull-rom style interpolation with per-segment opacity
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];

      // Use midpoint time for smoother fade transition
      const midTime = (p1.time + p2.time) / 2;
      const age = now - midTime;

      if (age >= LASER_FADE_DURATION) continue;

      const alpha = 1 - (age / LASER_FADE_DURATION);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.lineWidth = LASER_STROKE_SIZE + (1 - alpha) * 1; // Slightly thinner as it fades

      ctx.beginPath();

      // Get control points for smooth curve
      const p0 = i > 0 ? points[i - 1] : p1;
      const p3 = i < points.length - 2 ? points[i + 2] : p2;

      // Calculate bezier control points from catmull-rom
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      ctx.moveTo(p1.x, p1.y);
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
      ctx.stroke();
      ctx.restore();
    }
  }
}

// Start laser animation loop
function startLaserAnimation() {
  if (laserAnimationId) return;

  function animate() {
    const now = Date.now();

    // Clean up old points from each stroke
    for (const stroke of laserStrokes) {
      stroke.points = stroke.points.filter(p => now - p.time < LASER_FADE_DURATION);
    }

    // Remove empty strokes
    laserStrokes = laserStrokes.filter(s => s.points.length > 0);

    // If no strokes left, stop animation
    if (laserStrokes.length === 0) {
      laserAnimationId = null;
      return;
    }

    redraw();
    laserAnimationId = requestAnimationFrame(animate);
  }

  laserAnimationId = requestAnimationFrame(animate);
}

// Add laser point to current stroke
function addLaserPoint(strokeId, x, y, isRemote = false) {
  let stroke = laserStrokes.find(s => s.id === strokeId);
  if (!stroke) {
    stroke = { id: strokeId, points: [], userId: isRemote ? null : userId };
    laserStrokes.push(stroke);
  }
  stroke.points.push({ x, y, time: Date.now() });
  startLaserAnimation();
}
