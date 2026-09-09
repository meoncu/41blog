'use client';

import { useState, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
    compressImage,
    getCurrentLocation,
    formatBytes,
    TextOverlayOptions,
} from '@/lib/image-processor';
import { GpsLocation } from '@/types';
import {
    Camera,
    Upload,
    X,
    MapPin,
    Type,
    CheckCircle,
    AlertCircle,
    Loader2,
} from 'lucide-react';
import { forwardRef, useImperativeHandle } from 'react';

interface UploadedImage {
    publicUrl: string;
    key: string;
    originalSize: number;
    compressedSize: number;
}

interface ImageUploaderProps {
    onUploaded: (images: UploadedImage[], location?: GpsLocation) => void;
    maxImages?: number;
}

export interface ImageUploaderRef {
    upload: () => Promise<UploadedImage[]>;
    hasPendingFiles: boolean;
}

type UploadStatus = 'idle' | 'compressing' | 'uploading' | 'done' | 'error';

interface FileState {
    file: File;
    preview: string;
    status: UploadStatus;
    progress: number;
    result?: UploadedImage;
    error?: string;
}

export const ImageUploader = forwardRef<ImageUploaderRef, ImageUploaderProps>(
    ({ onUploaded, maxImages = 10 }, ref) => {
        const { user } = useAuth();
        const [files, setFiles] = useState<FileState[]>([]);
        const [overlayText, setOverlayText] = useState('');
        const [overlayPosition, setOverlayPosition] = useState<TextOverlayOptions['position']>('bottom-right');
        const [location, setLocation] = useState<GpsLocation | null>(null);
        const [gpsLoading, setGpsLoading] = useState(false);
        const [uploading, setUploading] = useState(false);
        const fileInputRef = useRef<HTMLInputElement>(null);
        const cameraInputRef = useRef<HTMLInputElement>(null);

        const addFiles = useCallback((newFiles: FileList | File[]) => {
            const arr = Array.from(newFiles).slice(0, maxImages - files.length);
            const states: FileState[] = arr.map((file) => ({
                file,
                preview: URL.createObjectURL(file),
                status: 'idle',
                progress: 0,
            }));
            setFiles((prev) => [...prev, ...states]);
        }, [files.length, maxImages]);

        const removeFile = useCallback((index: number) => {
            setFiles((prev) => {
                const target = prev[index];
                if (target?.preview) {
                    try {
                        URL.revokeObjectURL(target.preview);
                    } catch {}
                }
                return prev.filter((_, i) => i !== index);
            });
        }, []);

        const fetchGPS = useCallback(async () => {
            setGpsLoading(true);
            try {
                const coords = await getCurrentLocation();
                if (coords) {
                    setLocation({
                        latitude: coords.latitude,
                        longitude: coords.longitude,
                        accuracy: coords.accuracy ?? undefined,
                    });
                }
            } catch (err) {
                console.warn('GPS extraction failed:', err);
            } finally {
                setGpsLoading(false);
            }
        }, []);

        const uploadAll = useCallback(async (): Promise<UploadedImage[]> => {
            if (!user || files.length === 0) return [];
            setUploading(true);

            const results: UploadedImage[] = [];

            try {
                const idToken = await user.getIdToken();

                for (let i = 0; i < files.length; i++) {
                    const fileState = files[i];
                    if (fileState.status === 'done' && fileState.result) {
                        results.push(fileState.result);
                        continue;
                    }

                    // Step 1: Compress
                    setFiles((prev) =>
                        prev.map((f, idx) =>
                            idx === i ? { ...f, status: 'compressing', progress: 15 } : f
                        )
                    );

                    let compressed;
                    try {
                        compressed = await compressImage(
                            fileState.file,
                            overlayText ? { text: overlayText, position: overlayPosition } : undefined
                        );
                    } catch (err: any) {
                        console.error('Compression error:', err);
                        setFiles((prev) =>
                            prev.map((f, idx) =>
                                idx === i ? { ...f, status: 'error', error: err?.message || 'Sıkıştırma başarısız oldu' } : f
                            )
                        );
                        continue;
                    }

                    setFiles((prev) =>
                        prev.map((f, idx) =>
                            idx === i ? { ...f, status: 'uploading', progress: 40 } : f
                        )
                    );

                    // Step 2: Get signed URL
                    let signedData;
                    try {
                        const safeFileName = (fileState.file.name || 'image.jpg')
                            .replace(/[^a-zA-Z0-9.-]/g, '_');

                        const res = await fetch('/api/upload/signed-url', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${idToken}`,
                            },
                            body: JSON.stringify({
                                fileName: safeFileName,
                                contentType: 'image/jpeg',
                                fileSize: compressed.blob.size,
                            }),
                        });

                        if (!res.ok) {
                            const errData = await res.json().catch(() => ({}));
                            throw new Error(errData.error ?? 'Yükleme adresi alınamadı');
                        }

                        signedData = await res.json();
                    } catch (err: any) {
                        console.error('Signed URL error:', err);
                        setFiles((prev) =>
                            prev.map((f, idx) =>
                                idx === i ? { ...f, status: 'error', error: err.message } : f
                            )
                        );
                        continue;
                    }

                    setFiles((prev) =>
                        prev.map((f, idx) =>
                            idx === i ? { ...f, progress: 70 } : f
                        )
                    );

                    // Step 3: Upload directly to R2
                    try {
                        const uploadRes = await fetch(signedData.uploadUrl, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'image/jpeg' },
                            body: compressed.blob,
                        });

                        if (!uploadRes.ok) throw new Error('Depolama sunucusuna yükleme başarısız oldu');

                        const result: UploadedImage = {
                            publicUrl: signedData.publicUrl,
                            key: signedData.key,
                            originalSize: compressed.originalSize,
                            compressedSize: compressed.compressedSize,
                        };

                        results.push(result);
                        setFiles((prev) =>
                            prev.map((f, idx) =>
                                idx === i ? { ...f, status: 'done', progress: 100, result } : f
                            )
                        );
                    } catch (err: any) {
                        console.error('R2 upload error:', err);
                        setFiles((prev) =>
                            prev.map((f, idx) =>
                                idx === i ? { ...f, status: 'error', error: err?.message || 'Yükleme başarısız' } : f
                            )
                        );
                    }
                }
            } catch (err) {
                console.error('General upload error:', err);
            } finally {
                setUploading(false);
            }

            if (results.length > 0) {
                onUploaded(results, location ?? undefined);
            }
            return results;
        }, [user, files, overlayText, overlayPosition, location, onUploaded]);

        useImperativeHandle(ref, () => ({
            upload: uploadAll,
            hasPendingFiles: files.length > 0 && files.some((f) => f.status !== 'done'),
        }));

        return (
            <div className="space-y-4">
                {/* Drop zone */}
                <div
                    className="border-2 border-dashed border-surface-4 rounded-2xl p-6 text-center hover:border-brand-500 transition-colors cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                        e.preventDefault();
                        if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
                    }}
                >
                    <Upload size={32} className="mx-auto mb-3 text-text-muted" />
                    <p className="text-sm text-text-secondary mb-1">
                        Görselleri sürükleyip bırakın veya seçmek için tıklayın
                    </p>
                    <p className="text-xs text-text-muted">JPEG, PNG, WebP, HEIC · Max 10MB</p>
                </div>

                {/* Hidden inputs */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                            addFiles(e.target.files);
                        }
                        e.target.value = '';
                    }}
                />
                <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                            addFiles(e.target.files);
                        }
                        e.target.value = '';
                    }}
                />

                {/* Camera button */}
                <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-surface-2 hover:bg-surface-3 text-text-primary hover:text-brand-300 border border-surface-4 transition-all active:scale-[0.98] text-sm font-medium"
                >
                    <Camera size={20} className="text-brand-400" />
                    Fotoğraf Çek / Kamerayı Aç
                </button>

                {/* Overlay text */}
                <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm text-text-secondary">
                        <Type size={14} />
                        Resim üzerine yazı (isteğe bağlı)
                    </label>
                    <input
                        type="text"
                        value={overlayText}
                        onChange={(e) => setOverlayText(e.target.value)}
                        placeholder="Örn: Istanbul, 2026"
                        className="w-full px-4 py-2.5 rounded-xl bg-surface-2 border border-surface-4 text-text-primary placeholder:text-text-muted text-sm focus:border-brand-500 focus:outline-none transition-colors"
                    />
                    {overlayText && (
                        <select
                            value={overlayPosition}
                            onChange={(e) => setOverlayPosition(e.target.value as TextOverlayOptions['position'])}
                            className="w-full px-4 py-2.5 rounded-xl bg-surface-2 border border-surface-4 text-text-primary text-sm focus:border-brand-500 focus:outline-none"
                        >
                            <option value="bottom-right">Alt Sağ</option>
                            <option value="bottom-left">Alt Sol</option>
                            <option value="top-right">Üst Sağ</option>
                            <option value="top-left">Üst Sol</option>
                            <option value="center">Orta</option>
                        </select>
                    )}
                </div>

                {/* GPS */}
                <button
                    type="button"
                    onClick={fetchGPS}
                    disabled={gpsLoading}
                    className="flex items-center gap-2 text-sm text-text-secondary hover:text-brand-300 transition-colors"
                >
                    {gpsLoading ? (
                        <Loader2 size={14} className="animate-spin" />
                    ) : (
                        <MapPin size={14} className={location ? 'text-accent-success' : ''} />
                    )}
                    {location
                        ? `GPS: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
                        : 'Konum ekle (GPS)'}
                </button>

                {/* File previews */}
                {files.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                        {files.map((f, i) => (
                            <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-surface-2 border border-surface-4">
                                <img
                                    src={f.preview}
                                    alt=""
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        // Fallback if browser can't render raw preview
                                        (e.target as HTMLElement).style.display = 'none';
                                    }}
                                />
                                {/* Status overlay */}
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
                                    {f.status === 'compressing' && (
                                        <div className="text-center">
                                            <Loader2 size={20} className="animate-spin text-white mx-auto" />
                                            <span className="text-white text-[10px] mt-1 block">İşleniyor</span>
                                        </div>
                                    )}
                                    {f.status === 'uploading' && (
                                        <div className="text-center">
                                            <Loader2 size={20} className="animate-spin text-white mx-auto" />
                                            <span className="text-white text-xs mt-1 block">{f.progress}%</span>
                                        </div>
                                    )}
                                    {f.status === 'done' && (
                                        <CheckCircle size={24} className="text-accent-success" />
                                    )}
                                    {f.status === 'error' && (
                                        <div className="text-center px-1">
                                            <AlertCircle size={22} className="text-accent-like mx-auto" />
                                            <span className="text-accent-like text-[9px] mt-0.5 block leading-tight">
                                                {f.error || 'Hata'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                {/* Remove button */}
                                {f.status !== 'uploading' && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeFile(i);
                                        }}
                                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/80 flex items-center justify-center hover:bg-accent-like transition-colors z-10"
                                    >
                                        <X size={13} className="text-white" />
                                    </button>
                                )}
                                {/* Size info */}
                                {f.status === 'done' && f.result && (
                                    <div className="absolute bottom-1 left-1 right-1 text-center pointer-events-none">
                                        <span className="text-[9px] text-white/90 bg-black/70 px-1 py-0.5 rounded">
                                            {formatBytes(f.result.compressedSize)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Upload button */}
                {files.length > 0 && (
                    <button
                        type="button"
                        onClick={uploadAll}
                        disabled={uploading || files.every((f) => f.status === 'done')}
                        className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        {uploading ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                Yükleniyor…
                            </>
                        ) : files.every((f) => f.status === 'done') ? (
                            <>
                                <CheckCircle size={18} />
                                Hepsi yüklendi
                            </>
                        ) : (
                            <>
                                <Upload size={18} />
                                {files.length} görseli yükle
                            </>
                        )}
                    </button>
                )}
            </div>
        );
    }
);
ImageUploader.displayName = 'ImageUploader';

