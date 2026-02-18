/**
 * POST /api/upload/signed-url
 *
 * Generates a pre-signed PUT URL for direct upload to Cloudflare R2.
 * The client uploads directly to R2 – this server never receives the file data.
 *
 * Security:
 * - Requires valid Firebase ID token in Authorization header
 * - Validates file type (images only)
 * - Validates file size (max 10MB)
 * - Only admin or canEdit users can upload
 */
import { NextRequest, NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Client, R2_BUCKET, R2_PUBLIC_URL } from '@/lib/r2/client';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { SignedUploadRequest, SignedUploadResponse, AppUser } from '@/types';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const URL_EXPIRY_SECONDS = 300; // 5 minutes

export async function POST(req: NextRequest) {
    try {
        // ── 1. Authenticate ────────────────────────────────────────────────────
        const authHeader = req.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const idToken = authHeader.slice(7);
        let decodedToken;
        try {
            decodedToken = await adminAuth.verifyIdToken(idToken);
        } catch {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        // ── 2. Check permissions ───────────────────────────────────────────────
        const userSnap = await adminDb
            .collection('users')
            .doc(decodedToken.uid)
            .get();

        if (!userSnap.exists) {
            return NextResponse.json({ error: 'User not found' }, { status: 403 });
        }

        const userData = userSnap.data() as AppUser;
        const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '')
            .split(',')
            .map((e) => e.trim().toLowerCase());
        const isAdmin = adminEmails.includes(decodedToken.email?.toLowerCase() ?? '');

        if (!isAdmin && !userData.canEdit) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // ── 3. Validate request body ───────────────────────────────────────────
        const body: SignedUploadRequest = await req.json();
        const { fileName, contentType, fileSize } = body;

        if (!ALLOWED_TYPES.includes(contentType)) {
            return NextResponse.json(
                { error: `File type not allowed. Allowed: ${ALLOWED_TYPES.join(', ')}` },
                { status: 400 }
            );
        }

        if (fileSize > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: `File too large. Max size: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
                { status: 400 }
            );
        }

        // ── 4. Generate unique key ─────────────────────────────────────────────
        const ext = fileName.split('.').pop()?.toLowerCase() ?? 'jpg';
        const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(ext) ? ext : 'jpg';
        const key = `posts/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`;

        // ── 5. Generate signed URL ─────────────────────────────────────────────
        const command = new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: key,
            ContentType: contentType,
            ContentLength: fileSize,
        });

        const uploadUrl = await getSignedUrl(r2Client, command, {
            expiresIn: URL_EXPIRY_SECONDS,
        });

        const publicUrl = `${R2_PUBLIC_URL}/${key}`;

        const response: SignedUploadResponse = { uploadUrl, publicUrl, key };
        return NextResponse.json(response);
    } catch (error) {
        console.error('[signed-url] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
