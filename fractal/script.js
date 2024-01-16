let canvas = document.getElementById('drawingCanvas');
let context = canvas.getContext('2d');
let isDrawing = false;
let startPoint = {};
let lines = [];

canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', drawLine);
canvas.addEventListener('mouseup', finishDrawing);
document.getElementById('generateFractal').addEventListener('click', generateFractal);

function startDrawing(e) {
  isDrawing = true;
  startPoint = { x: e.offsetX, y: e.offsetY };
}

function drawLine(e) {
  if (!isDrawing) return;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.beginPath();
  context.moveTo(startPoint.x, startPoint.y);
  context.lineTo(e.offsetX, e.offsetY);
  context.stroke();
}

function finishDrawing(e) {
  if (isDrawing) {
    lines.push({
      start: { ...startPoint },
      end: { x: e.offsetX, y: e.offsetY }
    });
    isDrawing = false;
  }
}

function generateFractal() {
  context.clearRect(0, 0, canvas.width, canvas.height);
  lines.forEach(line => {
    drawFractalLine(line.start, line.end, 4); // 4 is the depth of recursion
  });
}

function drawFractalLine(start, end, depth) {
  if (depth === 0) {
    context.beginPath();
    context.moveTo(start.x, start.y);
    context.lineTo(end.x, end.y);
    context.stroke();
  } else {
    let dx = end.x - start.x;
    let dy = end.y - start.y;

    let mid = { x: start.x + dx / 2, y: start.y + dy / 2 };
    let len = Math.sqrt(dx * dx + dy * dy);
    let perpLen = len / 3;
    let angle = Math.atan2(dy, dx);

    let perpAngle = angle + Math.PI / 2;
    let peak = {
      x: mid.x + perpLen * Math.cos(perpAngle),
      y: mid.y + perpLen * Math.sin(perpAngle)
    };

    let third = { x: start.x + dx / 3, y: start.y + dy / 3 };
    let twoThirds = { x: start.x + 2 * dx / 3, y: start.y + 2 * dy / 3 };

    drawFractalLine(start, third, depth - 1);
    drawFractalLine(third, peak, depth - 1);
    drawFractalLine(peak, twoThirds, depth - 1);
    drawFractalLine(twoThirds, end, depth - 1);
  }
}
