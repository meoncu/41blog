/**
 * Shared TypeScript types for the entire application.
 * Keep this file as the single source of truth for data shapes.
 */

// ─── User & Roles ────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'allowed' | 'public';

export interface AppUser {
    uid: string;
    email: string;
    displayName: string | null;
    photoURL: string | null;
    role: UserRole;
    /** If true, this allowed user can also create/edit posts */
    canEdit: boolean;
    createdAt: string; // ISO string
    approvedAt?: string;
    approvedBy?: string;
}

// ─── Post ────────────────────────────────────────────────────────────────────

export type PostVisibility = 'public' | 'private';

export interface GpsLocation {
    latitude: number;
    longitude: number;
    accuracy?: number;
}

export interface Post {
    id: string;
    title: string;
    content: string;
    images: string[]; // R2 public URLs
    location?: GpsLocation;
    createdAt: string; // ISO string
    updatedAt: string;
    createdBy: string; // uid
    createdByEmail: string;
    createdByName: string;
    visibility: PostVisibility;
    /** List of emails that can see this post when visibility = 'private' */
    allowedUsers: string[];
    likesCount: number;
    likedBy: string[]; // uids
}

// ─── API Payloads ─────────────────────────────────────────────────────────────

export interface SignedUploadRequest {
    fileName: string;
    contentType: string;
    /** File size in bytes – validated server-side */
    fileSize: number;
}

export interface SignedUploadResponse {
    uploadUrl: string;
    publicUrl: string;
    key: string;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginatedResult<T> {
    items: T[];
    nextCursor: string | null;
    hasMore: boolean;
}

// ─── Permission helpers ───────────────────────────────────────────────────────

export interface PermissionContext {
    userEmail: string | null;
    userRole: UserRole | null;
    canEdit: boolean;
}
