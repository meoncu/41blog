import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { adminDb } from '@/lib/firebase/admin';
import { Post } from '@/types';
import { PostDetailClient } from '@/components/posts/PostDetailClient';

interface PostPageProps {
    params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
    const { id } = await params;
    try {
        const snap = await adminDb.collection('posts').doc(id).get();
        if (!snap.exists) return { title: 'Post Not Found' };
        const post = snap.data() as Post;
        return {
            title: post.title,
            description: post.content.slice(0, 160),
            openGraph: {
                title: post.title,
                description: post.content.slice(0, 160),
                images: post.images.length > 0 ? [post.images[0]] : [],
            },
        };
    } catch {
        return { title: 'Post' };
    }
}

export default async function PostPage({ params }: PostPageProps) {
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

    return <PostDetailClient post={post} />;
}
