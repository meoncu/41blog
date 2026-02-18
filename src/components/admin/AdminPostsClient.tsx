'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    collection,
    query,
    orderBy,
    getDocs,
    limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Post } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { deletePost } from '@/app/actions/posts';
import {
    Edit,
    Trash2,
    Globe,
    Lock,
    Loader2,
    PlusSquare,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function AdminPostsClient() {
    const { user, isAdmin } = useAuth();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const loadPosts = useCallback(async () => {
        setLoading(true);
        try {
            const q = query(
                collection(db, 'posts'),
                orderBy('createdAt', 'desc'),
                limit(50)
            );
            const snap = await getDocs(q);
            const list: Post[] = snap.docs.map((d) => ({
                id: d.id,
                ...(d.data() as Omit<Post, 'id'>),
                createdAt:
                    d.data().createdAt?.toDate?.()?.toISOString() ?? d.data().createdAt,
                updatedAt:
                    d.data().updatedAt?.toDate?.()?.toISOString() ?? d.data().updatedAt,
            }));
            setPosts(list);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadPosts();
    }, [loadPosts]);

    const handleDelete = useCallback(
        async (postId: string) => {
            if (!confirm('Delete this post permanently?')) return;
            setDeletingId(postId);
            try {
                const idToken = await user!.getIdToken();
                await deletePost(idToken, postId);
                setPosts((prev) => prev.filter((p) => p.id !== postId));
            } catch (err: any) {
                alert(err.message ?? 'Delete failed');
            } finally {
                setDeletingId(null);
            }
        },
        [user]
    );

    if (!isAdmin) {
        return <p className="text-text-muted text-center py-10">Admin only.</p>;
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
            <Link
                href="/admin/posts/new"
                className="flex items-center gap-2 w-full py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium transition-colors justify-center"
            >
                <PlusSquare size={18} />
                New Post
            </Link>

            {posts.length === 0 && (
                <p className="text-center text-text-muted py-10">No posts yet.</p>
            )}

            {posts.map((post) => (
                <div key={post.id} className="glass rounded-2xl p-4">
                    <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                {post.visibility === 'public' ? (
                                    <Globe size={12} className="text-accent-success shrink-0" />
                                ) : (
                                    <Lock size={12} className="text-text-muted shrink-0" />
                                )}
                                <Link
                                    href={`/posts/${post.id}`}
                                    className="font-medium text-text-primary text-sm hover:text-brand-300 transition-colors truncate"
                                >
                                    {post.title}
                                </Link>
                            </div>
                            <p className="text-xs text-text-muted">
                                {post.createdAt
                                    ? formatDistanceToNow(new Date(post.createdAt), {
                                        addSuffix: true,
                                    })
                                    : ''}{' '}
                                · {post.likesCount} likes · {post.images.length} images
                            </p>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                            <Link
                                href={`/admin/posts/${post.id}/edit`}
                                className="p-2 rounded-lg text-text-muted hover:text-brand-300 hover:bg-surface-3 transition-colors"
                            >
                                <Edit size={16} />
                            </Link>
                            <button
                                onClick={() => handleDelete(post.id)}
                                disabled={deletingId === post.id}
                                className="p-2 rounded-lg text-text-muted hover:text-accent-like hover:bg-surface-3 transition-colors disabled:opacity-50"
                            >
                                {deletingId === post.id ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <Trash2 size={16} />
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
