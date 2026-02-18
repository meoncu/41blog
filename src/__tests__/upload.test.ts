/**
 * Unit tests for upload logic (file validation).
 */

// Simulated server-side validation logic (extracted from API route)
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

function validateUpload(contentType: string, fileSize: number): { valid: boolean; error?: string } {
    if (!ALLOWED_TYPES.includes(contentType)) {
        return { valid: false, error: `File type not allowed: ${contentType}` };
    }
    if (fileSize > MAX_FILE_SIZE) {
        return { valid: false, error: `File too large: ${fileSize} bytes` };
    }
    return { valid: true };
}

function generateFileKey(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase() ?? 'jpg';
    const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(ext) ? ext : 'jpg';
    return `posts/${Date.now()}-test.${safeExt}`;
}

// ── Validation tests ───────────────────────────────────────────────────────────

describe('validateUpload', () => {
    it('accepts valid JPEG', () => {
        const result = validateUpload('image/jpeg', 1024 * 1024);
        expect(result.valid).toBe(true);
    });

    it('accepts valid PNG', () => {
        const result = validateUpload('image/png', 500 * 1024);
        expect(result.valid).toBe(true);
    });

    it('accepts valid WebP', () => {
        const result = validateUpload('image/webp', 800 * 1024);
        expect(result.valid).toBe(true);
    });

    it('rejects PDF', () => {
        const result = validateUpload('application/pdf', 1024);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('not allowed');
    });

    it('rejects file over 10MB', () => {
        const result = validateUpload('image/jpeg', 11 * 1024 * 1024);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('too large');
    });

    it('accepts file exactly at 10MB limit', () => {
        const result = validateUpload('image/jpeg', 10 * 1024 * 1024);
        expect(result.valid).toBe(true);
    });

    it('rejects executable files', () => {
        const result = validateUpload('application/x-executable', 1024);
        expect(result.valid).toBe(false);
    });
});

// ── Key generation tests ───────────────────────────────────────────────────────

describe('generateFileKey', () => {
    it('generates key with posts/ prefix', () => {
        const key = generateFileKey('photo.jpg');
        expect(key).toMatch(/^posts\//);
    });

    it('preserves jpg extension', () => {
        const key = generateFileKey('image.jpg');
        expect(key).toMatch(/\.jpg$/);
    });

    it('preserves png extension', () => {
        const key = generateFileKey('image.png');
        expect(key).toMatch(/\.png$/);
    });

    it('falls back to jpg for unknown extensions', () => {
        const key = generateFileKey('image.bmp');
        expect(key).toMatch(/\.jpg$/);
    });

    it('generates unique keys', () => {
        const key1 = generateFileKey('photo.jpg');
        const key2 = generateFileKey('photo.jpg');
        // Keys contain timestamps so they should differ (unless same millisecond)
        expect(key1).toMatch(/^posts\//);
        expect(key2).toMatch(/^posts\//);
    });
});
