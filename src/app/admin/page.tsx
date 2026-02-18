'use client';
import { SiteModeToggle } from '@/components/admin/SiteModeToggle';
import Link from 'next/link';
import { PlusSquare, Users, FileText } from 'lucide-react';

const adminLinks = [
    {
        href: '/admin/posts/new',
        icon: PlusSquare,
        label: 'Yeni Post',
        desc: 'Fotoğraflı yeni blog yazısı oluştur',
        color: 'from-brand-600 to-brand-800',
    },
    {
        href: '/admin/posts',
        icon: FileText,
        label: 'Postları Yönet',
        desc: 'Düzenle, sil veya görünürlüğü değiştir',
        color: 'from-purple-600 to-purple-900',
    },
    {
        href: '/admin/users',
        icon: Users,
        label: 'Kullanıcı Yönetimi',
        desc: 'Kullanıcıları onayla ve izinleri yönet',
        color: 'from-teal-600 to-teal-900',
    },
];

export default function AdminPage() {
    return (
        <div className="max-w-2xl mx-auto px-4 py-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold gradient-text mb-1">Admin Paneli</h1>
                <p className="text-sm text-text-muted">Blog ve topluluğunu yönet</p>
            </div>

            {/* Site Modu Ayarı */}
            <div className="mb-6">
                <SiteModeToggle />
            </div>

            {/* Navigasyon Kartları */}
            <div className="grid gap-4">
                {adminLinks.map(({ href, icon: Icon, label, desc, color }) => (
                    <Link
                        key={href}
                        href={href}
                        className="glass rounded-2xl p-5 flex items-center gap-4 hover:scale-[1.01] active:scale-[0.99] transition-transform"
                    >
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shrink-0`}>
                            <Icon size={22} className="text-white" />
                        </div>
                        <div>
                            <p className="font-semibold text-text-primary">{label}</p>
                            <p className="text-sm text-text-muted">{desc}</p>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
