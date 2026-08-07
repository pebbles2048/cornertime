import assert from 'assert';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import ReactTestUtils from 'react-dom/test-utils';
import DebugOverlay from './DebugOverlay';


interface StubCanvas {
    width: number;
    height: number;
    getContext(): null;
}

interface StubDiffy {
    rawCanvasEl: StubCanvas;
}


function stubDiffy(): StubDiffy {
    return {
        rawCanvasEl: {
            width: 130,
            height: 100,
            getContext: () => null,
        },
    };
}


interface Fill {
    x: number;
    y: number;
    width: number;
    height: number;
    style: string;
}

class FakeContext {
    fillStyle: string = '';
    fills: Fill[] = [];

    drawImage(..._args: any[]) {}

    fillRect(x: number, y: number, width: number, height: number) {
        this.fills.push({ x, y, width, height, style: this.fillStyle });
    }

    beginPath() {}

    moveTo() {}

    lineTo() {}

    stroke() {}
}


function uniformMatrix(value: number): number[][] {
    return new Array(10).fill(null).map(() => new Array(10).fill(value));
}


describe('DebugOverlay', () => {
    let originalGetContext: typeof HTMLCanvasElement.prototype.getContext;

    beforeEach(() => {
        originalGetContext = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
    });

    afterEach(() => {
        HTMLCanvasElement.prototype.getContext = originalGetContext;
    });

    it('renders a canvas and a close button', () => {
        const div = document.createElement('div');
        ReactDOM.render(<DebugOverlay diffy={stubDiffy()} />, div);

        assert.equal(div.querySelectorAll('canvas').length, 1);
        assert.ok(div.querySelector('button'));

        ReactDOM.unmountComponentAtNode(div);
    });

    it('hides itself when the close button is clicked', () => {
        const div = document.createElement('div');
        ReactDOM.render(<DebugOverlay diffy={stubDiffy()} />, div);

        const button = div.querySelector('button');
        assert.ok(button);
        ReactTestUtils.Simulate.click(button!);

        assert.equal(div.querySelectorAll('canvas').length, 0);
        assert.equal(div.querySelector('button'), null);

        ReactDOM.unmountComponentAtNode(div);
    });

    it('redraws the motion grid from the matrix ref on each frame', () => {
        const originalRaf = window.requestAnimationFrame;
        const originalCaf = window.cancelAnimationFrame;
        const frames: FrameRequestCallback[] = [];
        window.requestAnimationFrame = (cb) => {
            frames.push(cb);
            return frames.length;
        };
        window.cancelAnimationFrame = () => {};

        const fakeCtx = new FakeContext();
        HTMLCanvasElement.prototype.getContext = ((() => fakeCtx) as unknown) as typeof HTMLCanvasElement.prototype.getContext;

        const matrixRef: { current: number[][] | null } = { current: null };
        const div = document.createElement('div');
        ReactDOM.render(<DebugOverlay diffy={stubDiffy()} matrixRef={matrixRef} />, div);

        assert.equal(fakeCtx.fills.length, 0);

        matrixRef.current = uniformMatrix(255);
        matrixRef.current[2][3] = 0;
        frames.shift()!(0);

        const match = fakeCtx.fills.find(f => f.x === 26 && f.y === 30);
        assert.ok(match, 'expected the busy cell to be filled');
        assert.equal(match!.style, 'rgba(255, 0, 0, 1)');

        const previousCount = fakeCtx.fills.length;
        matrixRef.current = uniformMatrix(255);
        matrixRef.current[7][8] = 0;
        frames.shift()!(0);

        assert.ok(fakeCtx.fills.length > previousCount, 'expected the next frame to redraw');
        const nextMatch = [...fakeCtx.fills].reverse().find(f => f.x === 7 * 13 && f.y === 8 * 10);
        assert.ok(nextMatch, 'expected the moved busy cell to be filled');
        assert.equal(nextMatch!.style, 'rgba(255, 0, 0, 1)');

        ReactDOM.unmountComponentAtNode(div);
        window.requestAnimationFrame = originalRaf;
        window.cancelAnimationFrame = originalCaf;
    });
});
