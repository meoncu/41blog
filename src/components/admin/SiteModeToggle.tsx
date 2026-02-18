'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Globe, Lock, Loader2, CheckCircle } from 'lucide-react';

type SiteMode = 'open' | 'restricted';

export function SiteModeToggle() {
    const { isAdmin } = useAuth();
    const [mode, setMode] = useState<SiteMode | null>(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(true);

    // Mevcut ayarı yükle
    useEffect(() => {
        async function load() {
            try {
                const snap = await getDoc(doc(db, 'config', 'site'));
                if (snap.exists()) {
                    setMode(snap.data().mode as SiteMode);
                } else {
                    setMode('open'); // varsayılan: herkese açık
                }
            } catch {
                setMode('open');
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    const handleSave = async (newMode: SiteMode) => {
        if (!isAdmin || saving) return;
        setSaving(true);
        setSaved(false);
        try {
            await setDoc(doc(db, 'config', 'site'), {
                mode: newMode,
                updatedAt: new Date().toISOString(),
                updatedBy: 'meoncu@gmail.com',
            });
            setMode(newMode);
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    if (!isAdmin) return null;

    return (
        <div className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-base font-semibold text-text-primary">Site Erişim Modu</h2>
                    <p className="text-xs text-text-muted mt-0.5">
                        Siteye kimlerin erişebileceğini belirle
                    </p>
                </div>
                {saved && (
                    <div className="flex items-center gap-1.5 text-accent-success text-xs font-medium">
                        <CheckCircle size={14} />
                        Kaydedildi
                    </div>
                )}
                {saving && <Loader2 size={16} className="animate-spin text-brand-400" />}
            </div>

            {loading ? (
                <div className="flex justify-center py-4">
                    <Loader2 size={20} className="animate-spin text-brand-400" />
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-3">
                    {/* Herkese Açık */}
                    <button
                        onClick={() => handleSave('open')}
                        disabled={saving || mode === 'open'}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${mode === 'open'
                                ? 'border-accent-success bg-accent-success/10 text-accent-success'
                                : 'border-surface-4 bg-surface-2 text-text-secondary hover:border-accent-success/50'
                            }`}
                    >
                        <Globe size={24} />
                        <div className="text-center">
                            <p className="text-sm font-semibold">Herkese Açık</p>
                            <p className="text-xs opacity-70 mt-0.5">Herkes siteyi görebilir</p>
                        </div>
                        {mode === 'open' && (
                            <span className="text-xs bg-accent-success/20 px-2 py-0.5 rounded-full font-medium">
                                Aktif
                            </span>
                        )}
                    </button>

                    {/* Kısıtlı */}
                    <button
                        onClick={() => handleSave('restricted')}
                        disabled={saving || mode === 'restricted'}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${mode === 'restricted'
                                ? 'border-brand-400 bg-brand-600/10 text-brand-300'
                                : 'border-surface-4 bg-surface-2 text-text-secondary hover:border-brand-400/50'
                            }`}
                    >
                        <Lock size={24} />
                        <div className="text-center">
                            <p className="text-sm font-semibold">Kısıtlı</p>
                            <p className="text-xs opacity-70 mt-0.5">Sadece izinli kullanıcılar</p>
                        </div>
                        {mode === 'restricted' && (
                            <span className="text-xs bg-brand-600/30 px-2 py-0.5 rounded-full font-medium">
                                Aktif
                            </span>
                        )}
                    </button>
                </div>
            )}

            {mode === 'restricted' && !loading && (
                <p className="text-xs text-text-muted mt-3 px-1">
                    💡 Kısıtlı modda kullanıcıları{' '}
                    <a href="/admin/users" className="text-brand-300 underline">
                        Kullanıcı Yönetimi
                    </a>
                    {' '}sayfasından onaylayabilirsin.
                </p>
            )}
        </div>
    );
}
