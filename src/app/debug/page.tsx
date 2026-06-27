'use client';

import { useEffect, useState, useRef } from 'react';

interface LogEntry {
    id: string;
    timestamp: number;
    level: 'log' | 'warn' | 'error' | 'info' | 'debug';
    message: string;
}

export default function DebugPage() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [swInfo, setSwInfo] = useState<unknown>(null);
    const [cacheInfo, setCacheInfo] = useState<unknown>(null);
    const [networkLog, setNetworkLog] = useState<Array<{ time: number; method: string; url: string; status?: number; ok?: boolean; error?: string }>>([]);
    const logsRef = useRef<LogEntry[]>([]);
    const networkRef = useRef<Array<{ time: number; method: string; url: string; status?: number; ok?: boolean; error?: string }>>([]);

    const addLog = (level: LogEntry['level'], args: unknown[]) => {
        const message = args
            .map((a) => {
                if (typeof a === 'string') return a;
                if (a instanceof Error) return `${a.message}\n${a.stack ?? ''}`;
                try {
                    return JSON.stringify(a, null, 2);
                } catch {
                    return String(a);
                }
            })
            .join(' ');
        const entry: LogEntry = {
            id: Math.random().toString(36).slice(2),
            timestamp: Date.now(),
            level,
            message: message.slice(0, 2000),
        };
        logsRef.current = [entry, ...logsRef.current].slice(0, 300);
        setLogs(logsRef.current);
    };

    useEffect(() => {
        const originalLog = console.log;
        const originalWarn = console.warn;
        const originalError = console.error;
        const originalInfo = console.info;

        console.log = (...args) => {
            addLog('log', args);
            originalLog.apply(console, args);
        };
        console.warn = (...args) => {
            addLog('warn', args);
            originalWarn.apply(console, args);
        };
        console.error = (...args) => {
            addLog('error', args);
            originalError.apply(console, args);
        };
        console.info = (...args) => {
            addLog('info', args);
            originalInfo.apply(console, args);
        };

        const errorHandler = (e: ErrorEvent) => {
            addLog('error', [`[uncaught] ${e.message}`, e.error]);
        };
        const rejectHandler = (e: PromiseRejectionEvent) => {
            const reason =
                e.reason instanceof Error
                    ? `${e.reason.message}\n${e.reason.stack ?? ''}`
                    : String(e.reason);
            addLog('error', [`[promise] ${reason}`]);
        };
        window.addEventListener('error', errorHandler);
        window.addEventListener('unhandledrejection', rejectHandler);

        // Intercept fetch to log network
        const originalFetch = window.fetch.bind(window);
        window.fetch = async (...args) => {
            const input = args[0];
            const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
            const method =
                args[1]?.method ??
                (typeof input !== 'string' && input instanceof Request ? input.method : 'GET');
            const start = Date.now();
            try {
                const res = await originalFetch(...args);
                const entry = {
                    time: Date.now() - start,
                    method,
                    url,
                    status: res.status,
                    ok: res.ok,
                };
                networkRef.current = [entry, ...networkRef.current].slice(0, 100);
                setNetworkLog(networkRef.current);
                if (!res.ok) {
                    addLog('error', [`[fetch ${method} ${res.status}] ${url}`]);
                }
                return res;
            } catch (err) {
                const entry = {
                    time: Date.now() - start,
                    method,
                    url,
                    error: err instanceof Error ? err.message : String(err),
                };
                networkRef.current = [entry, ...networkRef.current].slice(0, 100);
                setNetworkLog(networkRef.current);
                addLog('error', [`[fetch ${method} FAILED] ${url}: ${entry.error}`]);
                throw err;
            }
        };

        addLog('info', ['[Debug] Mounted, capturing console + network']);
        void refreshInfo();

        return () => {
            console.log = originalLog;
            console.warn = originalWarn;
            console.error = originalError;
            console.info = originalInfo;
            window.removeEventListener('error', errorHandler);
            window.removeEventListener('unhandledrejection', rejectHandler);
            window.fetch = originalFetch;
        };
    }, []);

    const refreshInfo = async () => {
        if ('serviceWorker' in navigator) {
            const regs = await navigator.serviceWorker.getRegistrations();
            setSwInfo({
                supported: true,
                count: regs.length,
                registrations: regs.map((r) => ({
                    scope: r.scope,
                    activeScript: r.active?.scriptURL,
                    state: r.active?.state,
                    installing: r.installing?.scriptURL,
                })),
            });
        } else {
            setSwInfo({ supported: false });
        }
        if ('caches' in window) {
            const keys = await caches.keys();
            const details = await Promise.all(
                keys.map(async (k) => {
                    const cache = await caches.open(k);
                    const reqs = await cache.keys();
                    return { name: k, count: reqs.length, urls: reqs.map((r) => r.url) };
                })
            );
            setCacheInfo(details);
        }
    };

    const unregisterSW = async () => {
        if (!('serviceWorker' in navigator)) return;
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
        addLog('log', [`Unregistered ${regs.length} service workers`]);
        await refreshInfo();
    };

    const clearCaches = async () => {
        if (!('caches' in window)) return;
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
        addLog('log', [`Cleared ${keys.length} caches`]);
        await refreshInfo();
    };

    const hardReset = async () => {
        await unregisterSW();
        await clearCaches();
        if ('localStorage' in window) localStorage.clear();
        if ('sessionStorage' in window) sessionStorage.clear();
        addLog('log', ['[Hard Reset] Done. Reload the page.']);
    };

    const testSignedUrl = async () => {
        addLog('log', ['[Test] POST /api/upload/signed-url (no auth)']);
        try {
            const res = await fetch('/api/upload/signed-url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileName: 'debug.png',
                    contentType: 'image/png',
                    fileSize: 1024,
                }),
            });
            addLog(res.ok ? 'log' : 'error', [
                `[Test] Response: ${res.status} ${res.statusText}`,
            ]);
            const text = await res.text();
            addLog('log', [`[Test] Body: ${text.slice(0, 500)}`]);
        } catch (err) {
            addLog('error', [`[Test] Fetch failed: ${err instanceof Error ? err.message : String(err)}`]);
        }
    };

    const testCompress = async () => {
        addLog('log', ['[Test] Compress 1x1 PNG via canvas...']);
        try {
            const png = Uint8Array.from(
                atob(
                    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
                ),
                (c) => c.charCodeAt(0)
            );
            const blob = new Blob([png], { type: 'image/png' });
            const url = URL.createObjectURL(blob);
            const img = new Image();
            await new Promise<void>((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = () => reject(new Error('image load failed'));
                img.src = url;
            });
            addLog('log', ['[Test] Image loaded, attempting canvas.toBlob...']);
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('no 2d context');
            ctx.drawImage(img, 0, 0);
            const out = await new Promise<Blob | null>((resolve) =>
                canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.78)
            );
            URL.revokeObjectURL(url);
            addLog('log', [
                `[Test] Compress OK: ${out?.size ?? 0} bytes (${out?.type ?? 'null'})`,
            ]);
        } catch (err) {
            addLog('error', [
                `[Test] Compress failed: ${err instanceof Error ? err.message : String(err)}`,
            ]);
        }
    };

    const levelClass = (l: LogEntry['level']) => {
        switch (l) {
            case 'error':
                return 'text-red-300 border-red-500/50 bg-red-950/30';
            case 'warn':
                return 'text-yellow-200 border-yellow-500/50 bg-yellow-950/20';
            case 'info':
                return 'text-blue-200 border-blue-500/30';
            default:
                return 'text-gray-200 border-gray-700';
        }
    };

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100 p-3 font-mono text-[11px]">
            <h1 className="text-xl font-bold mb-3">🔧 Debug Console</h1>

            <div className="grid gap-3 mb-3">
                <div className="bg-gray-900 p-3 rounded border border-gray-800">
                    <h2 className="font-bold mb-2 text-sm">Service Worker</h2>
                    <pre className="whitespace-pre-wrap break-all text-[10px]">
                        {JSON.stringify(swInfo, null, 2)}
                    </pre>
                    <div className="flex gap-2 mt-2 flex-wrap">
                        <button
                            onClick={() => void refreshInfo()}
                            className="bg-blue-600 active:bg-blue-500 px-3 py-1.5 rounded text-xs"
                        >
                            Refresh
                        </button>
                        <button
                            onClick={() => void unregisterSW()}
                            className="bg-red-600 active:bg-red-500 px-3 py-1.5 rounded text-xs"
                        >
                            Unregister All
                        </button>
                    </div>
                </div>

                <div className="bg-gray-900 p-3 rounded border border-gray-800">
                    <h2 className="font-bold mb-2 text-sm">Caches</h2>
                    <pre className="whitespace-pre-wrap break-all text-[10px]">
                        {JSON.stringify(cacheInfo, null, 2)}
                    </pre>
                    <div className="flex gap-2 mt-2 flex-wrap">
                        <button
                            onClick={() => void clearCaches()}
                            className="bg-red-600 active:bg-red-500 px-3 py-1.5 rounded text-xs"
                        >
                            Clear All
                        </button>
                        <button
                            onClick={() => void hardReset()}
                            className="bg-red-800 active:bg-red-700 px-3 py-1.5 rounded text-xs font-bold"
                        >
                            ⚠️ Hard Reset (SW + Cache + Storage)
                        </button>
                    </div>
                </div>

                <div className="bg-gray-900 p-3 rounded border border-gray-800">
                    <h2 className="font-bold mb-2 text-sm">Tests</h2>
                    <div className="flex gap-2 flex-wrap">
                        <button
                            onClick={() => void testSignedUrl()}
                            className="bg-green-600 active:bg-green-500 px-3 py-1.5 rounded text-xs"
                        >
                            Test /api/upload/signed-url
                        </button>
                        <button
                            onClick={() => void testCompress()}
                            className="bg-green-600 active:bg-green-500 px-3 py-1.5 rounded text-xs"
                        >
                            Test Image Compress (canvas)
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-gray-900 p-3 rounded border border-gray-800 mb-3">
                <div className="flex justify-between items-center mb-2">
                    <h2 className="font-bold text-sm">Network ({networkLog.length})</h2>
                    <button
                        onClick={() => {
                            networkRef.current = [];
                            setNetworkLog([]);
                        }}
                        className="bg-gray-700 active:bg-gray-600 px-2 py-1 rounded text-[10px]"
                    >
                        Clear
                    </button>
                </div>
                <div className="space-y-0.5 max-h-48 overflow-y-auto text-[10px]">
                    {networkLog.length === 0 ? (
                        <p className="text-gray-500">No network calls yet.</p>
                    ) : (
                        networkLog.map((n, i) => (
                            <div
                                key={i}
                                className={`pl-2 border-l-2 ${
                                    n.error
                                        ? 'border-red-500 text-red-300'
                                        : n.ok
                                        ? 'border-green-500 text-green-200'
                                        : 'border-yellow-500 text-yellow-200'
                                }`}
                            >
                                <span className="text-gray-500">{n.time}ms</span>{' '}
                                <span className="font-bold">{n.method}</span>{' '}
                                <span>
                                    {n.status ?? '—'} {n.error ? `(${n.error})` : ''}
                                </span>{' '}
                                <span className="break-all">{n.url}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="bg-gray-900 p-3 rounded border border-gray-800">
                <div className="flex justify-between items-center mb-2">
                    <h2 className="font-bold text-sm">Logs ({logs.length})</h2>
                    <button
                        onClick={() => {
                            logsRef.current = [];
                            setLogs([]);
                        }}
                        className="bg-gray-700 active:bg-gray-600 px-2 py-1 rounded text-[10px]"
                    >
                        Clear
                    </button>
                </div>
                <div className="space-y-1 max-h-[60vh] overflow-y-auto">
                    {logs.length === 0 ? (
                        <p className="text-gray-500">
                            No logs yet. Go use the app, then come back.
                        </p>
                    ) : (
                        logs.map((log) => (
                            <div
                                key={log.id}
                                className={`pl-2 border-l-2 ${levelClass(log.level)} p-1 rounded-r`}
                            >
                                <span className="text-gray-500 text-[9px]">
                                    {new Date(log.timestamp).toLocaleTimeString()}
                                </span>{' '}
                                <span className="font-bold text-[10px]">
                                    [{log.level.toUpperCase()}]
                                </span>{' '}
                                <span className="break-all whitespace-pre-wrap">
                                    {log.message}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
