// https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API

export const WAKE_LOCK_TYPE = 'screen';

interface WakeLockSentinel {
    release(): Promise<void>;
    addEventListener(type: 'release', listener: () => void): void;
}

interface WakeLockAPI {
    request(type: string): Promise<WakeLockSentinel>;
}

let wakeLockSentinel: WakeLockSentinel | null = null;
let wakeLockListener: (() => void) | null = null;
let acquireInFlight = false;
let acquireToken = 0;


export function isWakeLockSupported(): boolean {
    return typeof navigator !== 'undefined'
        && (navigator as any).wakeLock !== undefined;
}


function getWakeLockAPI(): WakeLockAPI {
    return (navigator as any).wakeLock;
}


function installVisibilityListener() {
    if (wakeLockListener === null) {
        wakeLockListener = () => {
            if (document.visibilityState === 'visible') {
                requestWakeLock();
            }
        };
        document.addEventListener('visibilitychange', wakeLockListener);
    }
}


function removeVisibilityListener() {
    if (wakeLockListener !== null) {
        document.removeEventListener('visibilitychange', wakeLockListener);
        wakeLockListener = null;
    }
}


export async function requestWakeLock(): Promise<void> {
    if (!isWakeLockSupported() || wakeLockSentinel !== null || acquireInFlight) {
        return;
    }

    const token = acquireToken;
    acquireInFlight = true;

    let sentinel: WakeLockSentinel;
    try {
        sentinel = await getWakeLockAPI().request(WAKE_LOCK_TYPE);
    } catch (error) {
        // Expected failures: NotAllowedError while the tab is hidden, and
        // battery-saver rejections. There is nothing to do in either case.
        acquireInFlight = false;
        if (token === acquireToken) {
            installVisibilityListener();
        }
        return;
    }
    acquireInFlight = false;

    // A release may have happened while the request was in flight; if so,
    // drop the now-unwanted lock instead of holding it past the session.
    if (token !== acquireToken) {
        try {
            await sentinel.release();
        } catch (error) {
            // ignore
        }
        return;
    }

    wakeLockSentinel = sentinel;
    sentinel.addEventListener('release', () => {
        if (wakeLockSentinel === sentinel) {
            wakeLockSentinel = null;
        }
    });
    installVisibilityListener();
}


export async function releaseWakeLock(): Promise<void> {
    acquireToken += 1;

    if (wakeLockSentinel !== null) {
        try {
            await wakeLockSentinel.release();
        } catch (error) {
            // ignore
        }
    }
    wakeLockSentinel = null;

    removeVisibilityListener();
}
