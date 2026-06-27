/**
 * Image processing utilities – browser only.
 * Handles compression, resize, canvas text overlay, and GPS extraction.
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

const MAX_WIDTH = 1600;
const MAX_INPUT_BYTES = 30 * 1024 * 1024; // 30 MB hard cap before processing
const JPEG_QUALITY = 0.78; // ~78% quality – good balance

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function friendlyError(err: unknown): Error {
    if (err instanceof Error) return err;
    return new Error(String(err));
}

/**
 * Compress and resize an image file.
 * Returns a Blob ready for upload.
 *
 * Strategy:
 * 1. Validate file (size, type) up front
 * 2. Use createImageBitmap with resizeWidth hint → browser decodes at smaller size
 *    (avoids OOM on huge Android photos that can be 50MP+)
 * 3. Draw to OffscreenCanvas if available (no main-thread block), else regular canvas
 * 4. Optional text overlay, then convert to JPEG blob
 */
export async function compressImage(
    file: File,
    overlay?: TextOverlayOptions
): Promise<ProcessedImage> {
    // ── 1. Validate ──────────────────────────────────────────────────────
    if (!file) {
        throw new Error('Dosya seçilmedi');
    }
    if (!file.type || !file.type.startsWith('image/')) {
        throw new Error(
            `Geçersiz dosya tipi: ${file.type || 'bilinmiyor'}. JPEG, PNG veya WebP deneyin.`
        );
    }
    if (file.size > MAX_INPUT_BYTES) {
        throw new Error(
            `Resim çok büyük (${formatBytes(file.size)}). Maksimum ${formatBytes(MAX_INPUT_BYTES)}.`
        );
    }

    // ── 2. Decode + resize in one step via createImageBitmap ─────────────
    // The browser decodes the image at the target size, avoiding full-resolution
    // decode that can OOM on Android Chrome with 50MP phone photos.
    let bitmap: ImageBitmap;
    try {
        bitmap = await createImageBitmap(file, {
            resizeWidth: MAX_WIDTH,
            resizeQuality: 'medium',
        });
    } catch (err) {
        const e = friendlyError(err);
        // HEIC files often fail here on browsers without HEIC decoder
        if (file.name.toLowerCase().endsWith('.heic') || file.type === 'image/heic') {
            throw new Error(
                'HEIC formatı desteklenmiyor. Ayarlar → Kamera → Format → "En uyumlu" (JPEG) seçin.'
            );
        }
        throw new Error(
            `Resim okunamadı (${file.type}, ${formatBytes(file.size)}): ${e.message}`
        );
    }

    const width = bitmap.width;
    const height = bitmap.height;

    if (width === 0 || height === 0) {
        bitmap.close();
        throw new Error('Resim boyutları geçersiz (0x0)');
    }

    // ── 3. Draw to canvas + apply overlay + export blob ─────────────────
    let blob: Blob | null = null;
    try {
        if (typeof OffscreenCanvas !== 'undefined') {
            const canvas = new OffscreenCanvas(width, height);
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('OffscreenCanvas 2D context alınamadı');
            ctx.drawImage(bitmap, 0, 0);
            if (overlay?.text) {
                applyTextOverlay(ctx as unknown as CanvasRenderingContext2D, overlay, width, height);
            }
            blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: JPEG_QUALITY });
        } else {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Canvas 2D context alınamadı');
            ctx.drawImage(bitmap, 0, 0);
            if (overlay?.text) {
                applyTextOverlay(ctx, overlay, width, height);
            }
            blob = await new Promise<Blob | null>((resolve) => {
                canvas.toBlob((b) => resolve(b), 'image/jpeg', JPEG_QUALITY);
            });
        }
    } catch (err) {
        bitmap.close();
        const e = friendlyError(err);
        throw new Error(`Resim işlenemedi: ${e.message}`);
    } finally {
        bitmap.close();
    }

    if (!blob || blob.size === 0) {
        throw new Error('Resim dönüştürülemedi (blob boş)');
    }

    return {
        blob,
        width,
        height,
        originalSize: file.size,
        compressedSize: blob.size,
    };
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

    // Background pill – use rect with arc if roundRect missing (older WebViews)
    ctx.fillStyle = backgroundColor;
    if (typeof (ctx as unknown as { roundRect?: unknown }).roundRect === 'function') {
        ctx.beginPath();
        (ctx as unknown as { roundRect: (x: number, y: number, w: number, h: number, r: number) => void }).roundRect(x, y, boxW, boxH, 8);
        ctx.fill();
    } else {
        ctx.fillRect(x, y, boxW, boxH);
    }

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
        if (!navigator.geolocation) {
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
    const ext = originalName.split('.').pop() ?? 'jpg';
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 8);
    return `posts/${timestamp}-${random}.${ext}`;
}

/**
 * Format bytes to human-readable string.
 */
export { formatBytes };
