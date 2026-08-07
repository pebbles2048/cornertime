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
});
