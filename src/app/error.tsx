'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Unhandled error:', error);
    }, [error]);

    return (
        <div className="min-h-[70vh] flex items-center justify-center p-4">
            <div className="glass max-w-md w-full p-6 rounded-2xl text-center space-y-4 border border-white/10 shadow-2xl">
                <div className="w-14 h-14 mx-auto rounded-full bg-accent-like/15 flex items-center justify-center text-accent-like">
                    <AlertCircle size={30} />
                </div>
                <h2 className="text-xl font-bold text-text-primary">Bir sorun oluştu</h2>
                <p className="text-sm text-text-secondary">
                    {error.message || 'İşlem gerçekleştirilirken beklenmeyen bir hata meydana geldi.'}
                </p>
                <div className="flex gap-3 pt-2">
                    <button
                        onClick={() => reset()}
                        className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium text-sm transition-colors"
                    >
                        <RefreshCw size={16} />
                        Yeniden Dene
                    </button>
                    <Link
                        href="/"
                        className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-surface-2 hover:bg-surface-3 text-text-primary border border-surface-4 font-medium text-sm transition-colors"
                    >
                        <Home size={16} />
                        Ana Sayfa
                    </Link>
                </div>
            </div>
        </div>
    );
}
