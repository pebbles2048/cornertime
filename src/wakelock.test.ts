import assert from 'assert';
import { isWakeLockSupported, requestWakeLock, releaseWakeLock } from './wakelock';


interface MockSentinel {
    released: boolean;
    release(): Promise<void>;
    addEventListener(type: string, listener: () => void): void;
}


interface MockWakeLock {
    requestCalls: number;
    requestedTypes: string[];
    sentinels: MockSentinel[];
    request: () => Promise<MockSentinel>;
}


function createSentinel(mock: MockWakeLock): MockSentinel {
    const listeners: Array<() => void> = [];
    const sentinel: MockSentinel = {
        released: false,
        release() {
            sentinel.released = true;
            listeners.forEach((listener) => listener());
            return Promise.resolve();
        },
        addEventListener(type: string, listener: () => void) {
            listeners.push(listener);
        },
    };
    mock.sentinels.push(sentinel);
    return sentinel;
}


function installMockWakeLock(): MockWakeLock {
    const mock: MockWakeLock = {
        requestCalls: 0,
        requestedTypes: [],
        sentinels: [],
        request: () => {
            mock.requestCalls += 1;
            mock.requestedTypes.push('screen');
            return Promise.resolve(createSentinel(mock));
        },
    };
    (navigator as any).wakeLock = mock;
    return mock;
}


afterEach(() => {
    delete (navigator as any).wakeLock;
    return releaseWakeLock();
});


describe('isWakeLockSupported', () => {
    it('is false when navigator.wakeLock is missing', () => {
        delete (navigator as any).wakeLock;
        assert.equal(isWakeLockSupported(), false);
    });

    it('is true when navigator.wakeLock is present', () => {
        installMockWakeLock();
        assert.equal(isWakeLockSupported(), true);
    });
});


describe('requestWakeLock', () => {
    it('requests a screen wake lock and keeps it acquired', async () => {
        const mock = installMockWakeLock();
        await requestWakeLock();

        assert.equal(mock.requestCalls, 1);
        assert.equal(mock.requestedTypes[0], 'screen');
        assert.equal(mock.sentinels[0].released, false);
    });

    it('is idempotent: repeated requests reuse the same sentinel', async () => {
        const mock = installMockWakeLock();
        await requestWakeLock();
        await requestWakeLock();
        await requestWakeLock();

        assert.equal(mock.requestCalls, 1);
    });

    it('does nothing (does not throw) when wake lock is unsupported', async () => {
        delete (navigator as any).wakeLock;
        await requestWakeLock();
        await releaseWakeLock();
    });

    it('re-acquires when the browser auto-releases the sentinel and the tab becomes visible again', async () => {
        const mock = installMockWakeLock();
        await requestWakeLock();

        // simulate the browser releasing the lock when the tab is hidden
        await mock.sentinels[0].release();
        document.dispatchEvent(new Event('visibilitychange'));

        assert.equal(mock.requestCalls, 2);
        assert.equal(mock.sentinels[1].released, false);
    });
});


describe('releaseWakeLock', () => {
    it('releases the sentinel and allows re-acquiring', async () => {
        const mock = installMockWakeLock();
        await requestWakeLock();
        await releaseWakeLock();

        assert.equal(mock.sentinels[0].released, true);

        await requestWakeLock();
        assert.equal(mock.requestCalls, 2);
    });

    it('stops re-acquiring after release', async () => {
        const mock = installMockWakeLock();
        await requestWakeLock();
        await releaseWakeLock();

        document.dispatchEvent(new Event('visibilitychange'));
        assert.equal(mock.requestCalls, 1);
    });
});
