import * as React from 'react';
import PunishmentStateMachine from '../state';
import getSettings from '../settings';
import { create } from 'diffyjs';
import WelcomeScreen from './WelcomeScreen';
import PunishmentSetup from './PunishmentSetup';
import PunishmentLoader from './PunishmentLoader';
import ReportCard from './ReportCard';
import ReportViewer from './ReportViewer';
import DebugOverlay from './DebugOverlay';
import { MOTION_MAX } from './motionGrid';
import { hasDebugQuery } from '../debug';

import 'bootstrap/dist/css/bootstrap.css';
import { formatDuration } from '../time';
import { requestWakeLock, releaseWakeLock } from '../wakelock';


type SetupScreen = 'default' | 'custom' | 'report' | 'preset';

interface AppState {
    setupScreen: SetupScreen;
    diffy?: any;
}


class App extends React.Component<{}, AppState> {
    fsm = new PunishmentStateMachine();
    settings = getSettings();
    diffy: any;
    latestMotionMatrixRef: { current: number[][] | null } = { current: null };

    state: AppState = {
        setupScreen: 'default',
    };

    componentDidMount() {
        this.fsm.addListener(this.handleFsmUpdate);

        // Debug globals
        if (typeof window !== 'undefined') {
            const anyWindow: any = window;
            anyWindow.cornertime = anyWindow.cornertime || {};
            anyWindow.cornertime.fsm = this.fsm;
        }

        if (process.env.NODE_ENV !== 'test') {
            this.diffy = create({
                ...this.settings.diffy,
                onFrame: matrix => this.handleMotionUpdate(matrix),
            });
            const anyWindow: any = window;
            anyWindow.cornertime = anyWindow.cornertime || {};
            anyWindow.cornertime.diffy = this.diffy;
            this.setState({ diffy: this.diffy });
        }
    }

    componentWillUnmount() {
        this.fsm.removeListener(this.handleFsmUpdate);
        releaseWakeLock();
    }

    render() {
        const overlay = this.state.diffy && hasDebugQuery(window.location.search)
            ? <DebugOverlay diffy={this.state.diffy} matrixRef={this.latestMotionMatrixRef} />
            : null;

        return (
            <React.Fragment>
                {this.renderContent()}
                {overlay}
            </React.Fragment>
        );
    }

    renderContent() {
        const fsm = this.fsm;

        switch (fsm.state) {
            case 'waiting':
                switch (this.state.setupScreen) {
                    case 'custom':
                        return <PunishmentSetup fsm={fsm} onBack={this.returnToWelcomeScreen} />;
                    case 'preset':
                        return <PunishmentLoader fsm={fsm} onBack={this.returnToWelcomeScreen} />;
                    case 'report':
                        return <ReportViewer onBack={this.returnToWelcomeScreen} />;
                    default:
                        return (
                            <WelcomeScreen
                                fsm={fsm}
                                onCustom={this.setUpCustom}
                                onPreset={this.loadPreset}
                                onReport={this.viewReport}
                            />
                        );
                }

            case 'preparation':
                return (
                    <h1 className="display-2 my-5 text-center">
                        The punishment will start in {formatDuration(-fsm.currentTime)}.
                    </h1>
                );

            case 'punishment':
            case 'cooldown':
                return <h1 className="display-1 my-5 text-center">{formatDuration(fsm.timeLeft)}</h1>;

            case 'finished':
                return <ReportCard report={fsm.report()} showMessage={true} />;

            default:
                return null;
        }
    }

    setUpCustom = () => this.setState({ setupScreen: 'custom' });
    viewReport = () => this.setState({ setupScreen: 'report' });
    loadPreset = () => this.setState({ setupScreen: 'preset' });
    returnToWelcomeScreen = () => this.setState({ setupScreen: 'default' });

    handleFsmUpdate = () => {
        const { state } = this.fsm;
        if (state === 'preparation' || state === 'punishment' || state === 'cooldown') {
            requestWakeLock();
        } else {
            releaseWakeLock();
        }
        this.forceUpdate();
    }

    handleMotionUpdate = (matrix: number[][]) => {
        this.latestMotionMatrixRef.current = matrix;
        // matrix elements seem to be 0–255 with 255 meaning "no movement", 0 meaning "chaos"
        // we turn it into a a single number 0.0–1.0 by taking busiest cell
        const minValue = Math.min(...matrix.map(row => Math.min(...row)));
        const magnitude = (MOTION_MAX - minValue) / MOTION_MAX;
        this.fsm.handleMotionUpdate(magnitude);
    }
}

export default App;
