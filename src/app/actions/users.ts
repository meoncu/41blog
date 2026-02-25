'use server';

/**
 * User Management Server Actions (Admin only)
 */
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { AppUser, UserRole } from '@/types';

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase());

async function assertAdmin(idToken: string) {
    const decoded = await adminAuth.verifyIdToken(idToken);
    if (!ADMIN_EMAILS.includes(decoded.email?.toLowerCase() ?? '')) {
        throw new Error('Forbidden: admin only');
    }
    return decoded;
}

// ─── List all users ───────────────────────────────────────────────────────────

export async function listUsers(idToken: string): Promise<AppUser[]> {
    await assertAdmin(idToken);
    const snap = await adminDb
        .collection('users')
        .orderBy('createdAt', 'desc')
        .get();
    return snap.docs.map((d) => ({ ...d.data(), uid: d.id } as AppUser));
}

// ─── Approve user ─────────────────────────────────────────────────────────────

export async function approveUser(
    idToken: string,
    targetUid: string,
    canEdit: boolean = false
): Promise<void> {
    const decoded = await assertAdmin(idToken);
    await adminDb.collection('users').doc(targetUid).update({
        role: 'allowed',
        canEdit,
        approvedAt: new Date().toISOString(),
        approvedBy: decoded.email,
    });
}

// ─── Revoke user ──────────────────────────────────────────────────────────────

export async function revokeUser(idToken: string, targetUid: string): Promise<void> {
    await assertAdmin(idToken);
    await adminDb.collection('users').doc(targetUid).update({
        role: 'public',
        canEdit: false,
        approvedAt: null,
        approvedBy: null,
    });
}

// ─── Toggle edit permission ───────────────────────────────────────────────────

export async function toggleEditPermission(
    idToken: string,
    targetUid: string,
    canEdit: boolean
): Promise<void> {
    await assertAdmin(idToken);
    await adminDb.collection('users').doc(targetUid).update({ canEdit });
}

// ─── Whitelist (Pre-approval) ────────────────────────────────────────────────
export interface WhitelistedUser {
    id: string;
    email: string;
    role: UserRole;
    canEdit: boolean;
    createdAt: string;
}

export async function addToWhitelist(
    idToken: string,
    email: string,
    role: UserRole = 'allowed',
    canEdit: boolean = false
): Promise<void> {
    await assertAdmin(idToken);
    const lowercaseEmail = email.trim().toLowerCase();

    // Check if already in whitelist
    const existing = await adminDb
        .collection('whitelist')
        .where('email', '==', lowercaseEmail)
        .get();

    if (!existing.empty) {
        throw new Error('Email already in whitelist');
    }

    await adminDb.collection('whitelist').add({
        email: lowercaseEmail,
        role,
        canEdit,
        createdAt: new Date().toISOString(),
    });
}

export async function removeFromWhitelist(idToken: string, id: string): Promise<void> {
    await assertAdmin(idToken);
    await adminDb.collection('whitelist').doc(id).delete();
}

export async function getWhitelist(idToken: string): Promise<WhitelistedUser[]> {
    await assertAdmin(idToken);
    const snap = await adminDb.collection('whitelist').orderBy('createdAt', 'desc').get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as WhitelistedUser));
}

// ─── Delete user ──────────────────────────────────────────────────────────────

export async function deleteUser(idToken: string, targetUid: string): Promise<void> {
    await assertAdmin(idToken);
    await adminDb.collection('users').doc(targetUid).delete();
    try {
        await adminAuth.deleteUser(targetUid);
    } catch {
        // User may not exist in Auth (e.g., manually added)
    }
}
