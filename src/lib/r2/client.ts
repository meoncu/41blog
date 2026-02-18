/**
 * Cloudflare R2 client (S3-compatible)
 * Server-side only. Used in API routes for signed URL generation.
 */
import { S3Client } from '@aws-sdk/client-s3';

if (
    !process.env.R2_ACCOUNT_ID ||
    !process.env.R2_ACCESS_KEY_ID ||
    !process.env.R2_SECRET_ACCESS_KEY
) {
    // Only warn – allows build to succeed without env vars
    console.warn('[R2] Missing R2 environment variables. Upload will fail.');
}

export const r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
    },
});

export const R2_BUCKET = process.env.R2_BUCKET_NAME ?? '41blog';
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL ?? '';
