'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
    listUsers,
    approveUser,
    revokeUser,
    toggleEditPermission,
    deleteUser,
} from '@/app/actions/users';
import { AppUser } from '@/types';
import {
    CheckCircle,
    XCircle,
    Edit,
    Trash2,
    Loader2,
    ShieldCheck,
    User,
} from 'lucide-react';

export function UserManagementClient() {
    const { user, isAdmin } = useAuth();
    const [users, setUsers] = useState<AppUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const loadUsers = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const idToken = await user.getIdToken();
            const list = await listUsers(idToken);
            setUsers(list);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    const withAction = useCallback(
        async (uid: string, fn: () => Promise<void>) => {
            setActionLoading(uid);
            try {
                await fn();
                await loadUsers();
            } catch (err: any) {
                alert(err.message ?? 'Action failed');
            } finally {
                setActionLoading(null);
            }
        },
        [loadUsers]
    );

    if (!isAdmin) {
        return (
            <div className="text-center py-20 text-text-muted">
                Admin access required.
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 size={28} className="animate-spin text-brand-400" />
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {users.length === 0 && (
                <p className="text-center text-text-muted py-10">No users yet.</p>
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
                    <div key={u.uid} className="glass rounded-2xl p-4">
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
                                <p className="font-medium text-text-primary text-sm truncate">
                                    {u.displayName ?? u.email}
                                </p>
                                <p className="text-xs text-text-muted truncate">{u.email}</p>
                                <div className="flex items-center gap-3 mt-1.5">
                                    <span className={`text-xs font-medium ${roleColor}`}>
                                        {u.role}
                                    </span>
                                    {u.canEdit && (
                                        <span className="text-xs text-purple-400">can edit</span>
                                    )}
                                    {u.approvedAt && (
                                        <span className="text-xs text-text-muted">
                                            approved {new Date(u.approvedAt).toLocaleDateString()}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            {u.role !== 'admin' && (
                                <div className="flex items-center gap-1.5 shrink-0">
                                    {isLoading ? (
                                        <Loader2 size={16} className="animate-spin text-text-muted" />
                                    ) : (
                                        <>
                                            {u.role === 'public' ? (
                                                <button
                                                    onClick={() =>
                                                        withAction(u.uid, async () => {
                                                            const idToken = await user!.getIdToken();
                                                            await approveUser(idToken, u.uid);
                                                        })
                                                    }
                                                    title="Approve user"
                                                    className="p-2 rounded-lg text-accent-success hover:bg-surface-3 transition-colors"
                                                >
                                                    <CheckCircle size={16} />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() =>
                                                        withAction(u.uid, async () => {
                                                            const idToken = await user!.getIdToken();
                                                            await revokeUser(idToken, u.uid);
                                                        })
                                                    }
                                                    title="Revoke access"
                                                    className="p-2 rounded-lg text-accent-like hover:bg-surface-3 transition-colors"
                                                >
                                                    <XCircle size={16} />
                                                </button>
                                            )}

                                            {u.role === 'allowed' && (
                                                <button
                                                    onClick={() =>
                                                        withAction(u.uid, async () => {
                                                            const idToken = await user!.getIdToken();
                                                            await toggleEditPermission(idToken, u.uid, !u.canEdit);
                                                        })
                                                    }
                                                    title={u.canEdit ? 'Remove edit permission' : 'Grant edit permission'}
                                                    className={`p-2 rounded-lg hover:bg-surface-3 transition-colors ${u.canEdit ? 'text-purple-400' : 'text-text-muted'
                                                        }`}
                                                >
                                                    <Edit size={16} />
                                                </button>
                                            )}

                                            <button
                                                onClick={() => {
                                                    if (!confirm(`Delete ${u.email}?`)) return;
                                                    withAction(u.uid, async () => {
                                                        const idToken = await user!.getIdToken();
                                                        await deleteUser(idToken, u.uid);
                                                    });
                                                }}
                                                title="Delete user"
                                                className="p-2 rounded-lg text-text-muted hover:text-accent-like hover:bg-surface-3 transition-colors"
                                            >
                                                <Trash2 size={16} />
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
    );
}
