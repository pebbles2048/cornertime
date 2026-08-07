import assert from 'assert';
import { drawMotionGrid } from './motionGrid';


interface Fill {
    x: number;
    y: number;
    width: number;
    height: number;
    style: string;
}

interface StrokeCall {
    x: number;
    y: number;
}

class FakeContext {
    fillStyle: string = '';
    strokeStyle: string = '';
    lineWidth: number = 0;
    fills: Fill[] = [];
    strokes: StrokeCall[] = [];

    fillRect(x: number, y: number, width: number, height: number) {
        this.fills.push({ x, y, width, height, style: this.fillStyle });
    }

    beginPath() {}

    moveTo(x: number, y: number) {
        this.strokes.push({ x, y });
    }

    lineTo(x: number, y: number) {
        this.strokes.push({ x, y });
    }

    stroke() {}
}


function fillMatrix(value: number): number[][] {
    return new Array(10).fill(null).map(() => new Array(10).fill(value));
}


describe('drawMotionGrid', () => {
    it('does nothing when the matrix is null', () => {
        const ctx = new FakeContext();
        drawMotionGrid(ctx as any, null, 130, 100);
        assert.equal(ctx.fills.length, 0);
        assert.equal(ctx.strokes.length, 0);
    });

    it('does nothing when the matrix is empty', () => {
        const ctx = new FakeContext();
        drawMotionGrid(ctx as any, [], 130, 100);
        assert.equal(ctx.fills.length, 0);
        assert.equal(ctx.strokes.length, 0);
    });

    it('draws one cell per matrix entry', () => {
        const ctx = new FakeContext();
        drawMotionGrid(ctx as any, fillMatrix(255), 130, 100);
        assert.equal(ctx.fills.length, 100);
    });

    it('maps a busiest cell (0) to full opacity red', () => {
        const ctx = new FakeContext();
        const matrix = fillMatrix(255);
        matrix[2][3] = 0;
        drawMotionGrid(ctx as any, matrix, 130, 100);

        const match = ctx.fills.find(f => f.x === 26 && f.y === 30);
        assert.ok(match, 'expected a cell at x=26, y=30');
        assert.equal(match!.style, 'rgba(255, 0, 0, 1)');
    });

    it('maps a still cell (255) to transparent red', () => {
        const ctx = new FakeContext();
        drawMotionGrid(ctx as any, fillMatrix(255), 130, 100);

        const match = ctx.fills.find(f => f.x === 26 && f.y === 30);
        assert.ok(match, 'expected a cell at x=26, y=30');
        assert.equal(match!.style, 'rgba(255, 0, 0, 0)');
    });

    it('places a cell at the right canvas position for its matrix coordinates', () => {
        const ctx = new FakeContext();
        const matrix = fillMatrix(255);
        matrix[2][3] = 0;
        drawMotionGrid(ctx as any, matrix, 130, 100);

        const match = ctx.fills.find(f => f.x === 26 && f.y === 30);
        assert.ok(match, 'expected a cell at x=26, y=30');
        assert.deepEqual(match, { x: 26, y: 30, width: 13, height: 10, style: 'rgba(255, 0, 0, 1)' });
    });

    it('draws grid lines across the canvas', () => {
        const ctx = new FakeContext();
        drawMotionGrid(ctx as any, fillMatrix(255), 130, 100);

        // 11 vertical + 11 horizontal lines => each contributes a moveTo/lineTo pair
        const expectedCalls = 11 * 2 + 11 * 2;
        assert.equal(ctx.strokes.length, expectedCalls);
        assert.equal(ctx.lineWidth, 1);
        assert.equal(ctx.strokeStyle, 'rgba(255, 255, 255, 0.3)');
    });
});
