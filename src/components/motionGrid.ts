export const MOTION_MAX = 255;

const CELL_COLOR = 'rgba(255, 0, 0, ';
const GRID_LINE_COLOR = 'rgba(255, 255, 255, 0.3)';

/**
 * Draws the per-cell motion matrix (as produced by diffy) on top of a canvas.
 * Matrix values are 0–255 with 255 meaning "no movement"; busy cells (low
 * values) are drawn at full opacity red so they stand out. The matrix uses
 * diffy's ordering matrix[x][y], so the first index maps to the x axis.
 */
export function drawMotionGrid(ctx: CanvasRenderingContext2D, matrix: number[][] | null, width: number, height: number) {
    if (!matrix || matrix.length === 0 || matrix[0].length === 0) {
        return;
    }

    const cols = matrix.length;
    const rows = matrix[0].length;
    const cellWidth = width / cols;
    const cellHeight = height / rows;

    for (let x = 0; x < cols; x += 1) {
        for (let y = 0; y < rows; y += 1) {
            const value = matrix[x][y];
            const opacity = (MOTION_MAX - value) / MOTION_MAX;
            ctx.fillStyle = `${CELL_COLOR}${opacity})`;
            ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);
        }
    }

    ctx.strokeStyle = GRID_LINE_COLOR;
    ctx.lineWidth = 1;
    for (let x = 0; x <= cols; x += 1) {
        ctx.beginPath();
        ctx.moveTo(x * cellWidth, 0);
        ctx.lineTo(x * cellWidth, height);
        ctx.stroke();
    }
    for (let y = 0; y <= rows; y += 1) {
        ctx.beginPath();
        ctx.moveTo(0, y * cellHeight);
        ctx.lineTo(width, y * cellHeight);
        ctx.stroke();
    }
}
