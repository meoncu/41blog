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

const MAX_WIDTH = 1200;
const JPEG_QUALITY = 0.78; // ~78% quality – good balance

/**
 * Compress and resize an image file.
 * Returns a Blob ready for upload.
 */
export async function compressImage(
    file: File,
    overlay?: TextOverlayOptions
): Promise<ProcessedImage> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(objectUrl);

            // Calculate new dimensions
            let { width, height } = img;
            if (width > MAX_WIDTH) {
                height = Math.round((height * MAX_WIDTH) / width);
                width = MAX_WIDTH;
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d')!;

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
            reject(new Error('Failed to load image'));
        };

        img.src = objectUrl;
    });
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
    ctx.roundRect(x, y, boxW, boxH, 8);
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
export function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
