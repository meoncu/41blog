import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { adminDb } from '@/lib/firebase/admin';
import { Post } from '@/types';
import { EditPostForm } from '@/components/admin/EditPostForm';

interface EditPostPageProps {
    params: Promise<{ id: string }>;
}

export const metadata: Metadata = { title: 'Edit Post' };

export default async function EditPostPage({ params }: EditPostPageProps) {
    const { id } = await params;
    const snap = await adminDb.collection('posts').doc(id).get();

    if (!snap.exists) notFound();

    const data = snap.data()!;
    const post: Post = {
        id: snap.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? data.updatedAt,
    } as Post;

    return (
        <div className="max-w-2xl mx-auto px-4 py-6">
            <h1 className="text-2xl font-bold gradient-text mb-6">Edit Post</h1>
            <EditPostForm post={post} />
        </div>
    );
}
