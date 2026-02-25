'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
    listUsers,
    approveUser,
    revokeUser,
    toggleEditPermission,
    deleteUser,
    addToWhitelist,
    getWhitelist,
    removeFromWhitelist,
    WhitelistedUser,
} from '@/app/actions/users';
import { AppUser, UserRole } from '@/types';
import {
    CheckCircle,
    XCircle,
    Edit,
    Trash2,
    Loader2,
    ShieldCheck,
    User,
    UserPlus,
    Mail,
    ChevronDown,
    ChevronUp,
    RefreshCw,
} from 'lucide-react';

export function UserManagementClient() {
    const { user, isAdmin } = useAuth();
    const [users, setUsers] = useState<AppUser[]>([]);
    const [whitelist, setWhitelist] = useState<WhitelistedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Add form state
    const [newEmail, setNewEmail] = useState('');
    const [newRole, setNewRole] = useState<UserRole>('allowed');
    const [newCanEdit, setNewCanEdit] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);

    const loadData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const idToken = await user.getIdToken();
            const [userList, whitelistData] = await Promise.all([
                listUsers(idToken),
                getWhitelist(idToken)
            ]);
            setUsers(userList);
            setWhitelist(whitelistData);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleAddWhitelist = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !newEmail) return;

        setActionLoading('add-email');
        try {
            const idToken = await user.getIdToken();
            await addToWhitelist(idToken, newEmail, newRole, newCanEdit);
            setNewEmail('');
            setShowAddForm(false);
            await loadData();
        } catch (err: any) {
            alert(err.message || 'E-posta eklenemedi');
        } finally {
            setActionLoading(null);
        }
    };

    const withAction = useCallback(
        async (uid: string, fn: () => Promise<void>) => {
            setActionLoading(uid);
            try {
                await fn();
                await loadData();
            } catch (err: any) {
                alert(err.message ?? 'İşlem başarısız oldu');
            } finally {
                setActionLoading(null);
            }
        },
        [loadData]
    );

    if (!isAdmin) {
        return (
            <div className="text-center py-20 text-text-muted">
                Yalnızca yöneticiler bu alanı görebilir.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header & Refresh */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-text-muted">
                    Toplam {users.length} aktif kullanıcı, {whitelist.length} ön-onaylı
                </p>
                <button
                    onClick={loadData}
                    className="p-2 rounded-lg hover:bg-surface-3 transition-colors text-text-muted"
                    title="Yenile"
                >
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Quick Add Form */}
            <div className="glass rounded-2xl overflow-hidden">
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
                >
                    <div className="flex items-center gap-2 font-semibold text-text-primary">
                        <UserPlus size={18} className="text-brand-400" />
                        Yeni Kullanıcı Yetkilendir
                    </div>
                    {showAddForm ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>

                {showAddForm && (
                    <form onSubmit={handleAddWhitelist} className="p-4 border-t border-white/5 bg-white/5 space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-text-muted ml-1">E-posta Adresi</label>
                            <div className="relative">
                                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                                <input
                                    type="email"
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    placeholder="ornek@mail.com"
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-2 border border-surface-4 text-sm focus:border-brand-500 focus:outline-none transition-colors"
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={newCanEdit}
                                    onChange={(e) => setNewCanEdit(e.target.checked)}
                                    className="w-4 h-4 rounded border-surface-4 bg-surface-2 text-brand-600 focus:ring-brand-500"
                                />
                                <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">
                                    Yazma Yetkisi (Post oluşturabilir)
                                </span>
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={actionLoading === 'add-email'}
                            className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-medium text-sm transition-all flex items-center justify-center gap-2"
                        >
                            {actionLoading === 'add-email' ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                            Listeye Ekle
                        </button>
                    </form>
                )}
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 size={28} className="animate-spin text-brand-400" />
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Whitelist Section */}
                    {whitelist.length > 0 && (
                        <div className="space-y-3">
                            <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider ml-1">Ön-Onay Bekleyenler</h2>
                            {whitelist.map(w => (
                                <div key={w.id} className="glass rounded-2xl p-4 border border-brand-500/10">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-brand-500/10 flex items-center justify-center">
                                                <Mail size={18} className="text-brand-300" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-text-primary">{w.email}</p>
                                                <p className="text-xs text-brand-300">Giriş yapması bekleniyor</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => withAction(w.id, async () => {
                                                const idToken = await user!.getIdToken();
                                                await removeFromWhitelist(idToken, w.id);
                                            })}
                                            className="p-2 rounded-lg text-text-muted hover:text-accent-like hover:bg-surface-3 transition-colors"
                                        >
                                            <XCircle size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Active Users Section */}
                    <div className="space-y-3">
                        <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider ml-1">Aktif Kullanıcılar</h2>
                        {users.length === 0 && (
                            <p className="text-center text-text-muted py-10 glass rounded-2xl">Henüz kullanıcı bulunmuyor.</p>
                        )}
                        {users.map((u) => {
                            const isLoading = actionLoading === u.uid;
                            const roleColor =
                                u.role === 'admin'
                                    ? 'text-brand-300'
                                    : u.role === 'allowed'
                                        ? 'text-accent-success'
                                        : 'text-text-muted';

                            return (
                                <div key={u.uid} className="glass rounded-2xl p-4 hover:border-white/10 transition-colors">
                                    <div className="flex items-start gap-3">
                                        {/* Avatar */}
                                        <div className="w-10 h-10 rounded-full bg-surface-3 flex items-center justify-center shrink-0">
                                            {u.role === 'admin' ? (
                                                <ShieldCheck size={18} className="text-brand-300" />
                                            ) : (
                                                <User size={18} className="text-text-muted" />
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-text-primary text-sm truncate">
                                                {u.displayName ?? u.email}
                                            </p>
                                            <p className="text-xs text-text-muted truncate">{u.email}</p>
                                            <div className="flex items-center gap-3 mt-1.5">
                                                <span className={`text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-white/5 ${roleColor}`}>
                                                    {u.role === 'admin' ? 'Yönetici' : u.role === 'allowed' ? 'Üye' : 'Misafir'}
                                                </span>
                                                {u.canEdit && (
                                                    <span className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300">Yazar</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        {u.role !== 'admin' && (
                                            <div className="flex items-center gap-1 shrink-0">
                                                {isLoading ? (
                                                    <Loader2 size={16} className="animate-spin text-text-muted" />
                                                ) : (
                                                    <>
                                                        {u.role === 'public' ? (
                                                            <button
                                                                onClick={() => withAction(u.uid, async () => {
                                                                    const idToken = await user!.getIdToken();
                                                                    await approveUser(idToken, u.uid);
                                                                })}
                                                                title="Onayla"
                                                                className="p-2 rounded-lg text-accent-success hover:bg-surface-3 transition-colors"
                                                            >
                                                                <CheckCircle size={18} />
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => withAction(u.uid, async () => {
                                                                    const idToken = await user!.getIdToken();
                                                                    await revokeUser(idToken, u.uid);
                                                                })}
                                                                title="Yetkiyi Kaldır"
                                                                className="p-2 rounded-lg text-accent-like hover:bg-surface-3 transition-colors"
                                                            >
                                                                <XCircle size={18} />
                                                            </button>
                                                        )}

                                                        <button
                                                            onClick={() => withAction(u.uid, async () => {
                                                                const idToken = await user!.getIdToken();
                                                                await toggleEditPermission(idToken, u.uid, !u.canEdit);
                                                            })}
                                                            title={u.canEdit ? 'Yazma Yetkisini Al' : 'Yazma Yetkisi Ver'}
                                                            className={`p-2 rounded-lg hover:bg-surface-3 transition-colors ${u.canEdit ? 'text-purple-400' : 'text-text-muted'}`}
                                                        >
                                                            <Edit size={18} />
                                                        </button>

                                                        <button
                                                            onClick={() => {
                                                                if (!confirm(`${u.email} kullanıcısını silmek istediğinize emin misiniz?`)) return;
                                                                withAction(u.uid, async () => {
                                                                    const idToken = await user!.getIdToken();
                                                                    await deleteUser(idToken, u.uid);
                                                                });
                                                            }}
                                                            title="Kullanıcıyı Sil"
                                                            className="p-2 rounded-lg text-text-muted hover:text-accent-like hover:bg-surface-3 transition-colors"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
