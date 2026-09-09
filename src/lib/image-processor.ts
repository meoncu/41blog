/**
 * Image processing utilities – browser only.
 * Handles compression, resize, canvas text overlay, HEIC conversion, and GPS extraction.
 */

export interface ProcessedImage {
    blob: Blob;
    width: number;
    height: number;
    originalSize: number;
    compressedSize: number;
}

export interface TextOverlayOptions {
    text: string;
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
    fontSize?: number;
    color?: string;
    backgroundColor?: string;
}

const MAX_DIMENSION = 1920; // 1920px max width or height
const JPEG_QUALITY = 0.80; // 80% quality – optimal balance

/**
 * Check if a file is HEIC / HEIF format.
 */
function isHeicFile(file: File | Blob): boolean {
    const type = file.type?.toLowerCase() || '';
    if (type.includes('heic') || type.includes('heif')) return true;
    if ('name' in file && typeof file.name === 'string') {
        const ext = file.name.split('.').pop()?.toLowerCase();
        return ext === 'heic' || ext === 'heif';
    }
    return false;
}

/**
 * Convert HEIC / HEIF file to a standard JPEG Blob if needed.
 */
async function ensureStandardImage(file: File | Blob): Promise<Blob> {
    if (!isHeicFile(file)) {
        return file;
    }

    try {
        const heic2any = (await import('heic2any')).default;
        const converted = await heic2any({
            blob: file,
            toType: 'image/jpeg',
            quality: 0.85,
        });

        if (Array.isArray(converted)) {
            return converted[0];
        }
        return converted;
    } catch (err) {
        console.warn('HEIC conversion fallback failed, proceeding with original file:', err);
        return file;
    }
}

/**
 * Compress and resize an image file.
 * Returns a Blob ready for upload.
 */
export async function compressImage(
    file: File | Blob,
    overlay?: TextOverlayOptions
): Promise<ProcessedImage> {
    const standardBlob = await ensureStandardImage(file);

    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(standardBlob);

        img.onload = () => {
            URL.revokeObjectURL(objectUrl);

            // Calculate new dimensions preserving aspect ratio
            let { width, height } = img;
            if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
                if (width > height) {
                    height = Math.round((height * MAX_DIMENSION) / width);
                    width = MAX_DIMENSION;
                } else {
                    width = Math.round((width * MAX_DIMENSION) / height);
                    height = MAX_DIMENSION;
                }
            }

            // Ensure minimum 1px dimension
            width = Math.max(1, width);
            height = Math.max(1, height);

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                reject(new Error('Canvas 2D context not available'));
                return;
            }

            // Draw image
            ctx.drawImage(img, 0, 0, width, height);

            // Optional text overlay
            if (overlay?.text) {
                applyTextOverlay(ctx, overlay, width, height);
            }

            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        reject(new Error('Canvas toBlob failed'));
                        return;
                    }
                    resolve({
                        blob,
                        width,
                        height,
                        originalSize: file.size,
                        compressedSize: blob.size,
                    });
                },
                'image/jpeg',
                JPEG_QUALITY
            );
        };

        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Görsel yüklenemedi. Lütfen geçerli bir resim seçin.'));
        };

        img.src = objectUrl;
    });
}

/**
 * Fallback-safe rounded rectangle drawing for canvas context.
 */
function drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
): void {
    if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(x, y, w, h, r);
        return;
    }

    // Polyfill for older mobile browsers
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
}

function applyTextOverlay(
    ctx: CanvasRenderingContext2D,
    options: TextOverlayOptions,
    width: number,
    height: number
): void {
    const {
        text,
        position = 'bottom-right',
        fontSize = 28,
        color = '#ffffff',
        backgroundColor = 'rgba(0,0,0,0.55)',
    } = options;

    ctx.font = `bold ${fontSize}px Inter, sans-serif`;
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    const textHeight = fontSize;
    const padding = 12;
    const boxW = textWidth + padding * 2;
    const boxH = textHeight + padding * 2;

    let x = 0;
    let y = 0;

    switch (position) {
        case 'top-left':
            x = 16;
            y = 16;
            break;
        case 'top-right':
            x = width - boxW - 16;
            y = 16;
            break;
        case 'bottom-left':
            x = 16;
            y = height - boxH - 16;
            break;
        case 'bottom-right':
            x = width - boxW - 16;
            y = height - boxH - 16;
            break;
        case 'center':
            x = (width - boxW) / 2;
            y = (height - boxH) / 2;
            break;
    }

    // Background pill
    ctx.fillStyle = backgroundColor;
    ctx.beginPath();
    drawRoundedRect(ctx, x, y, boxW, boxH, 8);
    ctx.fill();

    // Text
    ctx.fillStyle = color;
    ctx.fillText(text, x + padding, y + padding + textHeight - 4);
}

/**
 * Extract GPS coordinates from browser Geolocation API.
 * Returns null if permission denied or unavailable.
 */
export function getCurrentLocation(): Promise<GeolocationCoordinates | null> {
    return new Promise((resolve) => {
        if (typeof window === 'undefined' || !navigator.geolocation) {
            resolve(null);
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => resolve(pos.coords),
            () => resolve(null),
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
        );
    });
}

/**
 * Generate a unique file key for R2 storage.
 */
export function generateFileKey(originalName: string): string {
    const ext = originalName.split('.').pop()?.toLowerCase() ?? 'jpg';
    const safeExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg';
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 8);
    return `posts/${timestamp}-${random}.${safeExt}`;
}

/**
 * Format bytes to human-readable string.
 */
export function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
