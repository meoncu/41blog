'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { updatePost } from '@/app/actions/posts';
import { Post, PostVisibility } from '@/types';
import { Globe, Lock, Loader2, CheckCircle } from 'lucide-react';

interface EditPostFormProps {
    post: Post;
}

export function EditPostForm({ post }: EditPostFormProps) {
    const { user, canEdit } = useAuth();
    const router = useRouter();

    const [title, setTitle] = useState(post.title);
    const [content, setContent] = useState(post.content);
    const [visibility, setVisibility] = useState<PostVisibility>(post.visibility);
    const [allowedUsers, setAllowedUsers] = useState(post.allowedUsers.join(', '));
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault();
            if (!user || !canEdit) return;

            setSubmitting(true);
            setError('');

            try {
                const idToken = await user.getIdToken();
                const emails = allowedUsers
                    .split(',')
                    .map((e) => e.trim().toLowerCase())
                    .filter(Boolean);

                await updatePost(idToken, post.id, {
                    title: title.trim(),
                    content: content.trim(),
                    visibility,
                    allowedUsers: emails,
                });

                setSuccess(true);
                setTimeout(() => router.push(`/posts/${post.id}`), 1200);
            } catch (err: any) {
                setError(err.message ?? 'Update failed');
                setSubmitting(false);
            }
        },
        [user, canEdit, title, content, visibility, allowedUsers, post.id, router]
    );

    if (!canEdit) {
        return (
            <p className="text-center text-text-muted py-10">
                You don&apos;t have permission to edit posts.
            </p>
        );
    }

    if (success) {
        return (
            <div className="text-center py-20">
                <CheckCircle size={48} className="mx-auto mb-4 text-accent-success" />
                <p className="text-lg font-semibold text-text-primary">Post updated!</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                    Title *
                </label>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-surface-4 text-text-primary focus:border-brand-500 focus:outline-none transition-colors"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                    Content
                </label>
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={6}
                    className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-surface-4 text-text-primary focus:border-brand-500 focus:outline-none transition-colors resize-none"
                />
            </div>

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
                                    : 'border-surface-4 bg-surface-2 text-text-secondary'
                                }`}
                        >
                            {v === 'public' ? <Globe size={16} /> : <Lock size={16} />}
                            {v.charAt(0).toUpperCase() + v.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {visibility === 'private' && (
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1.5">
                        Allowed emails (comma-separated)
                    </label>
                    <input
                        type="text"
                        value={allowedUsers}
                        onChange={(e) => setAllowedUsers(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-surface-4 text-text-primary focus:border-brand-500 focus:outline-none transition-colors text-sm"
                    />
                </div>
            )}

            {error && (
                <p className="text-sm text-accent-like bg-accent-like/10 px-4 py-3 rounded-xl">
                    {error}
                </p>
            )}

            <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold transition-colors flex items-center justify-center gap-2"
            >
                {submitting ? (
                    <>
                        <Loader2 size={18} className="animate-spin" />
                        Saving…
                    </>
                ) : (
                    'Save Changes'
                )}
            </button>
        </form>
    );
}
