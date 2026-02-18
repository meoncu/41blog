/**
 * Permission logic – pure functions, no side effects.
 * Tested in unit tests. Used both client and server side.
 */
import { AppUser, Post, UserRole } from '@/types';

function getAdminEmails(): string[] {
    return (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '')
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);
}

// ─── Role resolution ──────────────────────────────────────────────────────────

export function resolveRole(email: string | null | undefined): UserRole {
    if (!email) return 'public';
    if (getAdminEmails().includes(email.toLowerCase())) return 'admin';
    return 'public'; // default; upgraded to 'allowed' after DB check
}

export function isAdmin(email: string | null | undefined): boolean {
    return resolveRole(email) === 'admin';
}


// ─── Post visibility ──────────────────────────────────────────────────────────

/**
 * Determines if a user can VIEW a post.
 * Rules:
 *  - Public post → everyone
 *  - Private post → admin OR user in allowedUsers list
 */
export function canViewPost(post: Post, user: AppUser | null): boolean {
    if (post.visibility === 'public') return true;
    if (!user) return false;
    if (user.role === 'admin') return true;
    return post.allowedUsers.includes(user.email);
}

/**
 * Determines if a user can CREATE or EDIT posts.
 */
export function canWritePost(user: AppUser | null): boolean {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (user.role === 'allowed' && user.canEdit) return true;
    return false;
}

/**
 * Determines if a user can DELETE a post.
 * Only admins can delete.
 */
export function canDeletePost(user: AppUser | null): boolean {
    if (!user) return false;
    return user.role === 'admin';
}

/**
 * Determines if a user can manage other users.
 */
export function canManageUsers(user: AppUser | null): boolean {
    if (!user) return false;
    return user.role === 'admin';
}

// ─── Like logic ───────────────────────────────────────────────────────────────

export function hasLiked(post: Post, uid: string | null): boolean {
    if (!uid) return false;
    return post.likedBy.includes(uid);
}
