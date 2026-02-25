'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Post } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { toggleLike } from '@/app/actions/posts';
import { formatDistanceToNow, format } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
    Heart,
    Share2,
    MapPin,
    Lock,
    Globe,
    MoreHorizontal,
    Trash2,
    Edit,
} from 'lucide-react';
import { deletePost } from '@/app/actions/posts';

interface PostCardProps {
    post: Post;
    onDeleted?: (id: string) => void;
}

export function PostCard({ post, onDeleted }: PostCardProps) {
    const { user, appUser, isAdmin } = useAuth();
    const [liked, setLiked] = useState(
        user ? post.likedBy.includes(user.uid) : false
    );
    const [likesCount, setLikesCount] = useState(post.likesCount);
    const [likeAnimating, setLikeAnimating] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    const handleLike = useCallback(async () => {
        if (!user) return;
        setLikeAnimating(true);
        setTimeout(() => setLikeAnimating(false), 350);

        const newLiked = !liked;
        setLiked(newLiked);
        setLikesCount((c) => (newLiked ? c + 1 : Math.max(0, c - 1)));

        try {
            const idToken = await user.getIdToken();
            await toggleLike(idToken, post.id);
        } catch {
            // Revert on error
            setLiked(!newLiked);
            setLikesCount((c) => (newLiked ? Math.max(0, c - 1) : c + 1));
        }
    }, [user, liked, post.id]);

    const handleShare = useCallback(async () => {
        const shareData = {
            title: post.title,
            text: post.content.slice(0, 100),
            url: `${window.location.origin}/posts/${post.id}`,
        };
        if (navigator.share) {
            await navigator.share(shareData);
        } else {
            await navigator.clipboard.writeText(shareData.url);
        }
    }, [post]);

    const handleDelete = useCallback(async () => {
        if (!confirm('Delete this post?')) return;
        setDeleting(true);
        try {
            const idToken = await user!.getIdToken();
            await deletePost(idToken, post.id);
            onDeleted?.(post.id);
        } catch (e) {
            alert('Failed to delete post');
            setDeleting(false);
        }
    }, [user, post.id, onDeleted]);

    const createdAt = post.createdAt
        ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: tr })
        : '';
    const createdDate = post.createdAt
        ? format(new Date(post.createdAt), 'd MMM yyyy', { locale: tr })
        : '';

    return (
        <article className="glass rounded-2xl overflow-hidden animate-fade-up">
            {/* Images carousel */}
            {post.images.length > 0 && (
                <div className="relative aspect-[4/3] bg-surface-2">
                    <Image
                        src={post.images[currentImageIndex]}
                        alt={post.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 672px) 100vw, 672px"
                        priority={false}
                    />
                    {post.images.length > 1 && (
                        <>
                            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                                {post.images.map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setCurrentImageIndex(i)}
                                        className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentImageIndex
                                                ? 'bg-white w-4'
                                                : 'bg-white/50'
                                            }`}
                                    />
                                ))}
                            </div>
                        </>
                    )}
                    {/* Visibility badge */}
                    <div className="absolute top-3 right-3">
                        <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-black/50 text-white text-xs">
                            {post.visibility === 'public' ? (
                                <Globe size={11} />
                            ) : (
                                <Lock size={11} />
                            )}
                            {post.visibility}
                        </span>
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                        <Link href={`/posts/${post.id}`}>
                            <h2 className="font-semibold text-text-primary text-base leading-snug hover:text-brand-300 transition-colors line-clamp-2">
                                {post.title}
                            </h2>
                        </Link>
                        <div className="flex items-center gap-2 mt-1 text-xs text-text-muted">
                            <span>{post.createdByName || post.createdByEmail}</span>
                            <span>·</span>
                            <span>{createdDate}</span>
                            <span>·</span>
                            <span>{createdAt}</span>
                            {post.location && (
                                <>
                                    <span>·</span>
                                    <span className="flex items-center gap-0.5">
                                        <MapPin size={10} />
                                        {post.location.latitude.toFixed(4)},{' '}
                                        {post.location.longitude.toFixed(4)}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Admin menu */}
                    {isAdmin && (
                        <div className="relative">
                            <button
                                onClick={() => setMenuOpen((o) => !o)}
                                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-3 transition-colors"
                            >
                                <MoreHorizontal size={18} />
                            </button>
                            {menuOpen && (
                                <div className="absolute right-0 top-8 z-20 glass rounded-xl shadow-xl min-w-[140px] py-1">
                                    <Link
                                        href={`/admin/posts/${post.id}/edit`}
                                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-colors"
                                        onClick={() => setMenuOpen(false)}
                                    >
                                        <Edit size={14} /> Edit
                                    </Link>
                                    <button
                                        onClick={handleDelete}
                                        disabled={deleting}
                                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-accent-like hover:bg-surface-3 transition-colors"
                                    >
                                        <Trash2 size={14} />
                                        {deleting ? 'Deleting…' : 'Delete'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Content preview */}
                <p className="text-sm text-text-secondary leading-relaxed line-clamp-3 mb-3">
                    {post.content}
                </p>

                {/* Actions */}
                <div className="flex items-center gap-4 pt-2 border-t border-white/5">
                    <button
                        onClick={handleLike}
                        disabled={!user}
                        className={`flex items-center gap-1.5 text-sm transition-colors ${liked ? 'text-accent-like' : 'text-text-muted hover:text-accent-like'
                            } disabled:opacity-40`}
                        aria-label={liked ? 'Unlike' : 'Like'}
                    >
                        <Heart
                            size={18}
                            fill={liked ? 'currentColor' : 'none'}
                            className={likeAnimating ? 'animate-pulse-like' : ''}
                        />
                        <span className="font-medium">{likesCount}</span>
                    </button>

                    <button
                        onClick={handleShare}
                        className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors ml-auto"
                        aria-label="Share"
                    >
                        <Share2 size={18} />
                        <span>Share</span>
                    </button>
                </div>
            </div>
        </article>
    );
}
