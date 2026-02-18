/**
 * Unit tests for permission logic.
 * Run with: npx jest src/__tests__/permissions.test.ts
 */

import {
    resolveRole,
    isAdmin,
    canViewPost,
    canWritePost,
    canDeletePost,
    hasLiked,
} from '../lib/permissions';
import { AppUser, Post } from '../types';

// Mock env
process.env.NEXT_PUBLIC_ADMIN_EMAILS = 'admin@example.com,superadmin@example.com';

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeUser(overrides: Partial<AppUser> = {}): AppUser {
    return {
        uid: 'user-1',
        email: 'user@example.com',
        displayName: 'Test User',
        photoURL: null,
        role: 'public',
        canEdit: false,
        createdAt: new Date().toISOString(),
        ...overrides,
    };
}

function makePost(overrides: Partial<Post> = {}): Post {
    return {
        id: 'post-1',
        title: 'Test Post',
        content: 'Hello world',
        images: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'admin-uid',
        createdByEmail: 'admin@example.com',
        createdByName: 'Admin',
        visibility: 'public',
        allowedUsers: [],
        likesCount: 0,
        likedBy: [],
        ...overrides,
    };
}

// ── Role resolution ────────────────────────────────────────────────────────────

describe('resolveRole', () => {
    it('returns admin for admin email', () => {
        expect(resolveRole('admin@example.com')).toBe('admin');
    });

    it('is case-insensitive', () => {
        expect(resolveRole('ADMIN@EXAMPLE.COM')).toBe('admin');
    });

    it('returns public for unknown email', () => {
        expect(resolveRole('random@example.com')).toBe('public');
    });

    it('returns public for null', () => {
        expect(resolveRole(null)).toBe('public');
    });
});

describe('isAdmin', () => {
    it('returns true for admin email', () => {
        expect(isAdmin('superadmin@example.com')).toBe(true);
    });

    it('returns false for non-admin', () => {
        expect(isAdmin('user@example.com')).toBe(false);
    });
});

// ── Post visibility ────────────────────────────────────────────────────────────

describe('canViewPost', () => {
    it('allows everyone to view public posts', () => {
        const post = makePost({ visibility: 'public' });
        expect(canViewPost(post, null)).toBe(true);
        expect(canViewPost(post, makeUser())).toBe(true);
    });

    it('blocks unauthenticated users from private posts', () => {
        const post = makePost({ visibility: 'private' });
        expect(canViewPost(post, null)).toBe(false);
    });

    it('allows admin to view private posts', () => {
        const post = makePost({ visibility: 'private' });
        const admin = makeUser({ role: 'admin' });
        expect(canViewPost(post, admin)).toBe(true);
    });

    it('allows allowed user in allowedUsers list', () => {
        const post = makePost({
            visibility: 'private',
            allowedUsers: ['user@example.com'],
        });
        const user = makeUser({ role: 'allowed', email: 'user@example.com' });
        expect(canViewPost(post, user)).toBe(true);
    });

    it('blocks allowed user NOT in allowedUsers list', () => {
        const post = makePost({
            visibility: 'private',
            allowedUsers: ['other@example.com'],
        });
        const user = makeUser({ role: 'allowed', email: 'user@example.com' });
        expect(canViewPost(post, user)).toBe(false);
    });
});

// ── Write permissions ──────────────────────────────────────────────────────────

describe('canWritePost', () => {
    it('allows admin', () => {
        expect(canWritePost(makeUser({ role: 'admin' }))).toBe(true);
    });

    it('allows allowed user with canEdit', () => {
        expect(canWritePost(makeUser({ role: 'allowed', canEdit: true }))).toBe(true);
    });

    it('blocks allowed user without canEdit', () => {
        expect(canWritePost(makeUser({ role: 'allowed', canEdit: false }))).toBe(false);
    });

    it('blocks public user', () => {
        expect(canWritePost(makeUser({ role: 'public' }))).toBe(false);
    });

    it('blocks null user', () => {
        expect(canWritePost(null)).toBe(false);
    });
});

// ── Delete permissions ─────────────────────────────────────────────────────────

describe('canDeletePost', () => {
    it('allows admin', () => {
        expect(canDeletePost(makeUser({ role: 'admin' }))).toBe(true);
    });

    it('blocks non-admin', () => {
        expect(canDeletePost(makeUser({ role: 'allowed', canEdit: true }))).toBe(false);
    });
});

// ── Like logic ─────────────────────────────────────────────────────────────────

describe('hasLiked', () => {
    it('returns true if uid in likedBy', () => {
        const post = makePost({ likedBy: ['uid-1', 'uid-2'] });
        expect(hasLiked(post, 'uid-1')).toBe(true);
    });

    it('returns false if uid not in likedBy', () => {
        const post = makePost({ likedBy: ['uid-2'] });
        expect(hasLiked(post, 'uid-1')).toBe(false);
    });

    it('returns false for null uid', () => {
        const post = makePost({ likedBy: ['uid-1'] });
        expect(hasLiked(post, null)).toBe(false);
    });
});
