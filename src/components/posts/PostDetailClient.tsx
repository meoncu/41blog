'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
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
    ArrowLeft,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import Link from 'next/link';

interface PostDetailClientProps {
    post: Post;
}

export function PostDetailClient({ post }: PostDetailClientProps) {
    const { user } = useAuth();
    const [liked, setLiked] = useState(user ? post.likedBy.includes(user.uid) : false);
    const [likesCount, setLikesCount] = useState(post.likesCount);
    const [currentImage, setCurrentImage] = useState(0);

    const handleLike = useCallback(async () => {
        if (!user) return;
        const newLiked = !liked;
        setLiked(newLiked);
        setLikesCount((c) => (newLiked ? c + 1 : Math.max(0, c - 1)));
        try {
            const idToken = await user.getIdToken();
            await toggleLike(idToken, post.id);
        } catch {
            setLiked(!newLiked);
            setLikesCount((c) => (newLiked ? Math.max(0, c - 1) : c + 1));
        }
    }, [user, liked, post.id]);

    const handleShare = useCallback(async () => {
        const shareData = {
            title: post.title,
            text: post.content.slice(0, 100),
            url: window.location.href,
        };
        if (navigator.share) {
            await navigator.share(shareData);
        } else {
            await navigator.clipboard.writeText(window.location.href);
        }
    }, [post]);

    const createdAt = post.createdAt
        ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: tr })
        : '';
    const createdDate = post.createdAt
        ? format(new Date(post.createdAt), 'd MMMM yyyy, HH:mm', { locale: tr })
        : '';

    return (
        <div className="max-w-2xl mx-auto">
            {/* Back button */}
            <div className="px-4 py-3">
                <Link
                    href="/"
                    className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                    <ArrowLeft size={16} />
                    Back to feed
                </Link>
            </div>

            {/* Image gallery */}
            {post.images.length > 0 && (
                <div className="relative aspect-[4/3] bg-surface-2">
                    <Image
                        src={post.images[currentImage]}
                        alt={post.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 672px) 100vw, 672px"
                        priority
                    />
                    {post.images.length > 1 && (
                        <>
                            <button
                                onClick={() => setCurrentImage((i) => Math.max(0, i - 1))}
                                disabled={currentImage === 0}
                                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 flex items-center justify-center disabled:opacity-30"
                            >
                                <ChevronLeft size={20} className="text-white" />
                            </button>
                            <button
                                onClick={() =>
                                    setCurrentImage((i) => Math.min(post.images.length - 1, i + 1))
                                }
                                disabled={currentImage === post.images.length - 1}
                                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 flex items-center justify-center disabled:opacity-30"
                            >
                                <ChevronRight size={20} className="text-white" />
                            </button>
                            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                                {post.images.map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setCurrentImage(i)}
                                        className={`h-1.5 rounded-full transition-all ${i === currentImage ? 'w-6 bg-white' : 'w-1.5 bg-white/50'
                                            }`}
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Content */}
            <div className="px-4 py-5 space-y-4">
                {/* Meta */}
                <div className="flex items-center gap-2 text-xs text-text-muted">
                    <span className="flex items-center gap-1">
                        {post.visibility === 'public' ? <Globe size={11} /> : <Lock size={11} />}
                        {post.visibility}
                    </span>
                    <span>·</span>
                    <span>{post.createdByName || post.createdByEmail}</span>
                    <span>·</span>
                    <span>{createdDate}</span>
                    <span>·</span>
                    <span>{createdAt}</span>
                </div>

                {/* Title */}
                <h1 className="text-2xl font-bold text-text-primary leading-tight">
                    {post.title}
                </h1>

                {/* Content */}
                <p className="text-text-secondary leading-relaxed whitespace-pre-wrap">
                    {post.content}
                </p>

                {/* GPS */}
                {post.location && (
                    <a
                        href={`https://maps.google.com/?q=${post.location.latitude},${post.location.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-brand-300 hover:text-brand-200 transition-colors"
                    >
                        <MapPin size={14} />
                        {post.location.latitude.toFixed(6)}, {post.location.longitude.toFixed(6)}
                    </a>
                )}

                {/* Actions */}
                <div className="flex items-center gap-6 pt-4 border-t border-white/5">
                    <button
                        onClick={handleLike}
                        disabled={!user}
                        className={`flex items-center gap-2 text-sm font-medium transition-colors ${liked ? 'text-accent-like' : 'text-text-muted hover:text-accent-like'
                            } disabled:opacity-40`}
                    >
                        <Heart size={20} fill={liked ? 'currentColor' : 'none'} />
                        {likesCount} {likesCount === 1 ? 'like' : 'likes'}
                    </button>

                    <button
                        onClick={handleShare}
                        className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors ml-auto"
                    >
                        <Share2 size={20} />
                        Share
                    </button>
                </div>
            </div>
        </div>
    );
}
