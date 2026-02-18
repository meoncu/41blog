'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        // Check if already dismissed in this session
        if (sessionStorage.getItem('pwa-prompt-dismissed')) return;

        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            // Show after a short delay for better UX
            setTimeout(() => setShowPrompt(true), 3000);
        };

        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setShowPrompt(false);
        }
        setDeferredPrompt(null);
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        setDismissed(true);
        sessionStorage.setItem('pwa-prompt-dismissed', '1');
    };

    if (!showPrompt || dismissed) return null;

    return (
        <div className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-6 md:max-w-sm animate-fade-up">
            <div className="glass rounded-2xl p-4 shadow-2xl border border-brand-500/20">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center shrink-0">
                        <Download size={18} className="text-white" />
                    </div>
                    <div className="flex-1">
                        <p className="font-semibold text-text-primary text-sm">
                            Install 41Blog
                        </p>
                        <p className="text-xs text-text-muted mt-0.5">
                            Add to your home screen for the best experience
                        </p>
                    </div>
                    <button
                        onClick={handleDismiss}
                        className="p-1 text-text-muted hover:text-text-primary transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>
                <div className="flex gap-2 mt-3">
                    <button
                        onClick={handleInstall}
                        className="flex-1 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors"
                    >
                        Install
                    </button>
                    <button
                        onClick={handleDismiss}
                        className="flex-1 py-2 rounded-xl bg-surface-3 hover:bg-surface-4 text-text-secondary text-sm transition-colors"
                    >
                        Not now
                    </button>
                </div>
            </div>
        </div>
    );
}
