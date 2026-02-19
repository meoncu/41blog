'use server';

/**
 * Post Server Actions
 * All mutations go through here. Firebase Admin SDK enforces server-side auth.
 */
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { Post, PostVisibility, GpsLocation, PaginatedResult } from '@/types';
import { isAdmin } from '@/lib/permissions';
import { cookies } from 'next/headers';

const POSTS_PER_PAGE = 12;
const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase());

// ─── Auth helper ──────────────────────────────────────────────────────────────

async function getVerifiedUser(idToken: string) {
    try {
        const decoded = await adminAuth.verifyIdToken(idToken);
        return decoded;
    } catch {
        throw new Error('Unauthorized');
    }
}

// ─── Create Post ──────────────────────────────────────────────────────────────

export async function createPost(
    idToken: string,
    data: {
        title: string;
        content: string;
        images: string[];
        location?: GpsLocation;
        visibility: PostVisibility;
        allowedUsers: string[];
    }
): Promise<{ id: string }> {
    const decoded = await getVerifiedUser(idToken);
    const email = decoded.email ?? '';

    // Check write permission
    const userSnap = await adminDb.collection('users').doc(decoded.uid).get();
    const userData = userSnap.data();
    const userIsAdmin = ADMIN_EMAILS.includes(email.toLowerCase());

    if (!userIsAdmin && !userData?.canEdit) {
        throw new Error('Forbidden: insufficient permissions');
    }

    const post = {
        title: data.title.trim(),
        content: data.content.trim(),
        images: data.images,
        location: data.location ?? null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        createdBy: decoded.uid,
        createdByEmail: email,
        createdByName: decoded.name ?? email,
        visibility: data.visibility,
        allowedUsers: data.allowedUsers,
        likesCount: 0,
        likedBy: [],
    };

    const ref = await adminDb.collection('posts').add(post);
    return { id: ref.id };
}

// ─── Update Post ──────────────────────────────────────────────────────────────

export async function updatePost(
    idToken: string,
    postId: string,
    data: Partial<{
        title: string;
        content: string;
        images: string[];
        visibility: PostVisibility;
        allowedUsers: string[];
        location: GpsLocation;
    }>
): Promise<void> {
    const decoded = await getVerifiedUser(idToken);
    const email = decoded.email ?? '';
    const userIsAdmin = ADMIN_EMAILS.includes(email.toLowerCase());

    if (!userIsAdmin) {
        const userSnap = await adminDb.collection('users').doc(decoded.uid).get();
        if (!userSnap.data()?.canEdit) throw new Error('Forbidden');
    }

    await adminDb.collection('posts').doc(postId).update({
        ...data,
        updatedAt: FieldValue.serverTimestamp(),
    });
}

// ─── Delete Post ──────────────────────────────────────────────────────────────

export async function deletePost(idToken: string, postId: string): Promise<void> {
    const decoded = await getVerifiedUser(idToken);
    const email = decoded.email ?? '';

    if (!ADMIN_EMAILS.includes(email.toLowerCase())) {
        throw new Error('Forbidden: only admins can delete posts');
    }

    await adminDb.collection('posts').doc(postId).delete();
}

// ─── Toggle Like ──────────────────────────────────────────────────────────────

export async function toggleLike(
    idToken: string,
    postId: string
): Promise<{ liked: boolean; count: number }> {
    const decoded = await getVerifiedUser(idToken);
    const uid = decoded.uid;

    const postRef = adminDb.collection('posts').doc(postId);
    const snap = await postRef.get();

    if (!snap.exists) throw new Error('Post not found');

    const data = snap.data()!;
    const likedBy: string[] = data.likedBy ?? [];
    const alreadyLiked = likedBy.includes(uid);

    if (alreadyLiked) {
        await postRef.update({
            likedBy: likedBy.filter((id) => id !== uid),
            likesCount: Math.max(0, (data.likesCount ?? 0) - 1),
        });
        return { liked: false, count: Math.max(0, (data.likesCount ?? 0) - 1) };
    } else {
        await postRef.update({
            likedBy: [...likedBy, uid],
            likesCount: (data.likesCount ?? 0) + 1,
        });
        return { liked: true, count: (data.likesCount ?? 0) + 1 };
    }
}
