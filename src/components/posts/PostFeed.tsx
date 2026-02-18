'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    collection,
    query,
    where,
    orderBy,
    limit,
    startAfter,
    getDocs,
    DocumentSnapshot,
    or,
    QueryConstraint,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Post } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { PostCard } from './PostCard';
import Link from 'next/link';
import { Loader2, PlusSquare } from 'lucide-react';

const PAGE_SIZE = 12;

interface PostFeedProps {
    searchQuery?: string;
}

export function PostFeed({ searchQuery }: PostFeedProps) {
    const { appUser, user, isAdmin } = useAuth();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const lastDocRef = useRef<DocumentSnapshot | null>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const sentinelRef = useRef<HTMLDivElement | null>(null);

    const buildQuery = useCallback(
        (afterDoc?: DocumentSnapshot) => {
            const postsRef = collection(db, 'posts');
            const constraints: QueryConstraint[] = [];

            // Visibility filter
            if (!appUser) {
                constraints.push(where('visibility', '==', 'public'));
            } else if (appUser.role !== 'admin') {
                // Allowed user: public OR their email in allowedUsers
                constraints.push(
                    where('visibility', '==', 'public')
                );
                // Note: Firestore doesn't support OR across fields without composite index
                // For private posts, we do a separate query and merge client-side
            }

            constraints.push(orderBy('createdAt', 'desc'));
            constraints.push(limit(PAGE_SIZE));

            if (afterDoc) {
                constraints.push(startAfter(afterDoc));
            }

            return query(postsRef, ...constraints);
        },
        [appUser]
    );

    const fetchPosts = useCallback(
        async (reset = false) => {
            if (reset) {
                setLoading(true);
                lastDocRef.current = null;
            } else {
                setLoadingMore(true);
            }

            try {
                const q = buildQuery(reset ? undefined : lastDocRef.current ?? undefined);
                const snap = await getDocs(q);

                const fetched: Post[] = snap.docs.map((d) => ({
                    id: d.id,
                    ...(d.data() as Omit<Post, 'id'>),
                    createdAt:
                        d.data().createdAt?.toDate?.()?.toISOString() ?? d.data().createdAt,
                    updatedAt:
                        d.data().updatedAt?.toDate?.()?.toISOString() ?? d.data().updatedAt,
                }));

                // Client-side search filter
                const filtered = searchQuery
                    ? fetched.filter(
                        (p) =>
                            p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            p.content.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    : fetched;

                if (reset) {
                    setPosts(filtered);
                } else {
                    setPosts((prev) => [...prev, ...filtered]);
                }

                lastDocRef.current = snap.docs[snap.docs.length - 1] ?? null;
                setHasMore(snap.docs.length === PAGE_SIZE);
            } catch (err) {
                console.error('Failed to fetch posts:', err);
            } finally {
                setLoading(false);
                setLoadingMore(false);
            }
        },
        [buildQuery, searchQuery]
    );

    // Initial load + search reset
    useEffect(() => {
        fetchPosts(true);
    }, [fetchPosts]);

    // Infinite scroll via IntersectionObserver
    useEffect(() => {
        if (!sentinelRef.current) return;

        observerRef.current = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !loadingMore) {
                    fetchPosts(false);
                }
            },
            { rootMargin: '200px' }
        );

        observerRef.current.observe(sentinelRef.current);
        return () => observerRef.current?.disconnect();
    }, [hasMore, loadingMore, fetchPosts]);

    const handleDeleted = useCallback((id: string) => {
        setPosts((prev) => prev.filter((p) => p.id !== id));
    }, []);

    if (loading) {
        return (
            <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="glass rounded-2xl overflow-hidden">
                        <div className="skeleton aspect-[4/3]" />
                        <div className="p-4 space-y-3">
                            <div className="skeleton h-5 w-3/4" />
                            <div className="skeleton h-4 w-1/2" />
                            <div className="skeleton h-16" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (posts.length === 0) {
        return (
            <div className="text-center py-20 text-text-muted">
                <p className="text-4xl mb-4">📝</p>
                <p className="text-lg font-medium mb-2 text-text-primary">
                    {searchQuery ? 'Sonuç bulunamadı' : 'Henüz post yok'}
                </p>
                <p className="text-sm mb-6">
                    {searchQuery ? 'Farklı bir arama dene.' : 'İlk postu sen oluştur!'}
                </p>
                {!searchQuery && (isAdmin || appUser?.canEdit) && (
                    <Link
                        href="/admin/posts/new"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold transition-colors"
                    >
                        <PlusSquare size={18} />
                        Yeni Post Oluştur
                    </Link>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {posts.map((post) => (
                <PostCard key={post.id} post={post} onDeleted={handleDeleted} />
            ))}

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="h-4" />

            {loadingMore && (
                <div className="flex justify-center py-4">
                    <Loader2 size={24} className="animate-spin text-brand-400" />
                </div>
            )}

            {!hasMore && posts.length > 0 && (
                <p className="text-center text-text-muted text-sm py-4">
                    You&apos;ve seen all posts ✓
                </p>
            )}
        </div>
    );
}
