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


export function isWakeLockSupported(): boolean {
    return typeof navigator !== 'undefined'
        && (navigator as any).wakeLock !== undefined;
}


function getWakeLockAPI(): WakeLockAPI {
    return (navigator as any).wakeLock;
}


export async function requestWakeLock(): Promise<void> {
    if (!isWakeLockSupported() || wakeLockSentinel !== null) {
        return;
    }

    let sentinel: WakeLockSentinel;
    try {
        sentinel = await getWakeLockAPI().request(WAKE_LOCK_TYPE);
    } catch (error) {
        // Expected failures: NotAllowedError while the tab is hidden, and
        // battery-saver rejections. There is nothing to do in either case.
        return;
    }

    wakeLockSentinel = sentinel;
    sentinel.addEventListener('release', () => {
        if (wakeLockSentinel === sentinel) {
            wakeLockSentinel = null;
        }
    });

    if (wakeLockListener === null) {
        wakeLockListener = () => {
            if (document.visibilityState === 'visible') {
                requestWakeLock();
            }
        };
        document.addEventListener('visibilitychange', wakeLockListener);
    }
}


export async function releaseWakeLock(): Promise<void> {
    if (wakeLockSentinel !== null) {
        try {
            await wakeLockSentinel.release();
        } catch (error) {
            // ignore
        }
    }
    wakeLockSentinel = null;

    if (wakeLockListener !== null) {
        document.removeEventListener('visibilitychange', wakeLockListener);
        wakeLockListener = null;
    }
}
