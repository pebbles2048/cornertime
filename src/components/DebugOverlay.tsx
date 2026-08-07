import * as React from 'react';
import { drawMotionGrid } from './motionGrid';


interface DebugOverlayProps {
    diffy: any;
    matrixRef?: { current: number[][] | null };
}


interface DebugOverlayState {
    visible: boolean;
}


const DEFAULT_SOURCE_WIDTH = 130;
const DEFAULT_SOURCE_HEIGHT = 100;


export default class DebugOverlay extends React.Component<DebugOverlayProps, DebugOverlayState> {
    state: DebugOverlayState = {
        visible: true,
    };

    private overlayCanvas: HTMLCanvasElement | null = null;
    private frameHandle: number | null = null;

    componentDidMount() {
        this.startDrawing();
    }

    componentWillUnmount() {
        this.stopDrawing();
    }

    startDrawing = () => {
        const draw = () => {
            const source = this.props.diffy && this.props.diffy.rawCanvasEl;
            if (source && this.overlayCanvas) {
                const ctx = this.overlayCanvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(source, 0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
                    const matrix = this.props.matrixRef && this.props.matrixRef.current;
                    drawMotionGrid(ctx, matrix || null, this.overlayCanvas.width, this.overlayCanvas.height);
                }
            }
            this.frameHandle = requestAnimationFrame(draw);
        };
        draw();
    }

    stopDrawing = () => {
        if (this.frameHandle !== null) {
            cancelAnimationFrame(this.frameHandle);
            this.frameHandle = null;
        }
    }

    close = () => {
        this.stopDrawing();
        this.setState({ visible: false });
    }

    render() {
        if (!this.state.visible) {
            return null;
        }

        const source = this.props.diffy && this.props.diffy.rawCanvasEl;
        const width = source ? source.width : DEFAULT_SOURCE_WIDTH;
        const height = source ? source.height : DEFAULT_SOURCE_HEIGHT;

        return (
            <div className="debug-overlay">
                <canvas
                    ref={canvas => { this.overlayCanvas = canvas; }}
                    width={width}
                    height={height}
                />
                <button className="btn btn-secondary" onClick={this.close}>
                    Close
                </button>
            </div>
        );
    }
}
