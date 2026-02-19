'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createPost } from '@/app/actions/posts';
import { ImageUploader, ImageUploaderRef } from '@/components/upload/ImageUploader';
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
    const uploaderRef = useRef<ImageUploaderRef>(null);

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
                setError('Lütfen bir başlık girin');
                return;
            }

            setSubmitting(true);
            setError('');

            try {
                // If there are pending files, upload them first
                let finalImages = uploadedImages;
                if (uploaderRef.current?.hasPendingFiles) {
                    const results = await uploaderRef.current.upload();
                    if (results && results.length > 0) {
                        finalImages = results.map(r => r.publicUrl);
                    }
                }

                const idToken = await user.getIdToken();
                const emails = allowedUsers
                    .split(',')
                    .map((e) => e.trim().toLowerCase())
                    .filter(Boolean);

                const { id } = await createPost(idToken, {
                    title: title.trim(),
                    content: content.trim(),
                    images: finalImages,
                    location,
                    visibility,
                    allowedUsers: emails,
                });

                setSuccess(true);
                setTimeout(() => router.push(`/posts/${id}`), 1200);
            } catch (err: any) {
                setError(err.message ?? 'Gönderi paylaşılamadı');
                setSubmitting(false);
            }
        },
        [user, canEdit, title, content, uploadedImages, location, visibility, allowedUsers, router]
    );

    if (!canEdit) {
        return (
            <div className="text-center py-20 text-text-muted">
                <p>Bu alanı kullanmak için yetkiniz bulunmuyor.</p>
            </div>
        );
    }

    if (success) {
        return (
            <div className="text-center py-20">
                <CheckCircle size={48} className="mx-auto mb-4 text-accent-success" />
                <p className="text-lg font-semibold text-text-primary">Gönderi paylaşıldı!</p>
                <p className="text-sm text-text-muted">Yönlendiriliyor…</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            {/* Title */}
            <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                    Başlık *
                </label>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Bu gönderi ne hakkında?"
                    required
                    className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-surface-4 text-text-primary placeholder:text-text-muted focus:border-brand-500 focus:outline-none transition-colors"
                />
            </div>

            {/* Content */}
            <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                    İçerik
                </label>
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Hikayeni paylaş…"
                    rows={5}
                    className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-surface-4 text-text-primary placeholder:text-text-muted focus:border-brand-500 focus:outline-none transition-colors resize-none"
                />
            </div>

            {/* Images */}
            <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                    Görseller
                </label>
                <ImageUploader ref={uploaderRef} onUploaded={handleImagesUploaded} />
                {uploadedImages.length > 0 && (
                    <p className="text-xs text-accent-success mt-2">
                        ✓ {uploadedImages.length} görsel hazır
                    </p>
                )}
            </div>

            {/* Visibility */}
            <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                    Görünürlük
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
                            {v === 'public' ? 'Herkese Açık' : 'Gizli'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Allowed users (for private posts) */}
            {visibility === 'private' && (
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1.5">
                        İzin verilen e-postalar (virgülle ayırın)
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
                        Paylaşılıyor…
                    </>
                ) : (
                    'Gönderiyi Paylaş'
                )}
            </button>
        </form>
    );
}
