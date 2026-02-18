'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createPost } from '@/app/actions/posts';
import { ImageUploader } from '@/components/upload/ImageUploader';
import { GpsLocation, PostVisibility } from '@/types';
import { Globe, Lock, Loader2, CheckCircle } from 'lucide-react';

interface UploadedImage {
    publicUrl: string;
    key: string;
    originalSize: number;
    compressedSize: number;
}

export function NewPostForm() {
    const { user, canEdit } = useAuth();
    const router = useRouter();

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [visibility, setVisibility] = useState<PostVisibility>('private');
    const [allowedUsers, setAllowedUsers] = useState('');
    const [uploadedImages, setUploadedImages] = useState<string[]>([]);
    const [location, setLocation] = useState<GpsLocation | undefined>();
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleImagesUploaded = useCallback(
        (images: UploadedImage[], loc?: GpsLocation) => {
            setUploadedImages(images.map((i) => i.publicUrl));
            if (loc) setLocation(loc);
        },
        []
    );

    const handleSubmit = useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault();
            if (!user || !canEdit) return;
            if (!title.trim()) {
                setError('Title is required');
                return;
            }

            setSubmitting(true);
            setError('');

            try {
                const idToken = await user.getIdToken();
                const emails = allowedUsers
                    .split(',')
                    .map((e) => e.trim().toLowerCase())
                    .filter(Boolean);

                const { id } = await createPost(idToken, {
                    title: title.trim(),
                    content: content.trim(),
                    images: uploadedImages,
                    location,
                    visibility,
                    allowedUsers: emails,
                });

                setSuccess(true);
                setTimeout(() => router.push(`/posts/${id}`), 1200);
            } catch (err: any) {
                setError(err.message ?? 'Failed to create post');
                setSubmitting(false);
            }
        },
        [user, canEdit, title, content, uploadedImages, location, visibility, allowedUsers, router]
    );

    if (!canEdit) {
        return (
            <div className="text-center py-20 text-text-muted">
                <p>You don&apos;t have permission to create posts.</p>
            </div>
        );
    }

    if (success) {
        return (
            <div className="text-center py-20">
                <CheckCircle size={48} className="mx-auto mb-4 text-accent-success" />
                <p className="text-lg font-semibold text-text-primary">Post created!</p>
                <p className="text-sm text-text-muted">Redirecting…</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            {/* Title */}
            <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                    Title *
                </label>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="What's this post about?"
                    required
                    className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-surface-4 text-text-primary placeholder:text-text-muted focus:border-brand-500 focus:outline-none transition-colors"
                />
            </div>

            {/* Content */}
            <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                    Content
                </label>
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Share your story…"
                    rows={5}
                    className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-surface-4 text-text-primary placeholder:text-text-muted focus:border-brand-500 focus:outline-none transition-colors resize-none"
                />
            </div>

            {/* Images */}
            <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                    Images
                </label>
                <ImageUploader onUploaded={handleImagesUploaded} />
                {uploadedImages.length > 0 && (
                    <p className="text-xs text-accent-success mt-2">
                        ✓ {uploadedImages.length} image{uploadedImages.length > 1 ? 's' : ''} ready
                    </p>
                )}
            </div>

            {/* Visibility */}
            <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                    Visibility
                </label>
                <div className="grid grid-cols-2 gap-3">
                    {(['public', 'private'] as PostVisibility[]).map((v) => (
                        <button
                            key={v}
                            type="button"
                            onClick={() => setVisibility(v)}
                            className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-colors ${visibility === v
                                    ? 'border-brand-500 bg-brand-600/20 text-brand-300'
                                    : 'border-surface-4 bg-surface-2 text-text-secondary hover:border-surface-3'
                                }`}
                        >
                            {v === 'public' ? <Globe size={16} /> : <Lock size={16} />}
                            {v.charAt(0).toUpperCase() + v.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Allowed users (for private posts) */}
            {visibility === 'private' && (
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1.5">
                        Allowed emails (comma-separated)
                    </label>
                    <input
                        type="text"
                        value={allowedUsers}
                        onChange={(e) => setAllowedUsers(e.target.value)}
                        placeholder="user@example.com, another@example.com"
                        className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-surface-4 text-text-primary placeholder:text-text-muted focus:border-brand-500 focus:outline-none transition-colors text-sm"
                    />
                </div>
            )}

            {/* Error */}
            {error && (
                <p className="text-sm text-accent-like bg-accent-like/10 px-4 py-3 rounded-xl">
                    {error}
                </p>
            )}

            {/* Submit */}
            <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-colors flex items-center justify-center gap-2"
            >
                {submitting ? (
                    <>
                        <Loader2 size={18} className="animate-spin" />
                        Publishing…
                    </>
                ) : (
                    'Publish Post'
                )}
            </button>
        </form>
    );
}
