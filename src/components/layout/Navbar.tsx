'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
    Home,
    Search,
    PlusSquare,
    LayoutDashboard,
    LogIn,
    LogOut,
    User,
} from 'lucide-react';
import Image from 'next/image';

export function Navbar() {
    const { user, appUser, signInWithGoogle, signOut, isAdmin, loading } = useAuth();
    const pathname = usePathname();

    const navItems = [
        { href: '/', icon: Home, label: 'Feed' },
        { href: '/search', icon: Search, label: 'Ara' },
        ...(isAdmin || appUser?.canEdit
            ? [{ href: '/admin/posts/new', icon: PlusSquare, label: 'Yeni Post' }]
            : []),
        ...(isAdmin
            ? [{ href: '/admin', icon: LayoutDashboard, label: 'Admin' }]
            : []),
    ];

    return (
        <>
            {/* ── Top bar ── */}
            <header className="fixed top-0 left-0 right-0 z-50 glass safe-top">
                <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2">
                        <span className="text-xl font-bold gradient-text">41Blog</span>
                    </Link>

                    {/* Desktop nav links — ortada */}
                    <nav className="hidden md:flex items-center gap-1">
                        {navItems.map(({ href, icon: Icon, label }) => {
                            const active = pathname === href;
                            return (
                                <Link
                                    key={href}
                                    href={href}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${active
                                            ? 'bg-brand-600/20 text-brand-300'
                                            : 'text-text-secondary hover:text-text-primary hover:bg-surface-3'
                                        }`}
                                >
                                    <Icon size={17} strokeWidth={active ? 2.5 : 1.8} />
                                    {label}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Sağ: kullanıcı */}
                    <div className="flex items-center gap-3">
                        {loading ? (
                            <div className="w-8 h-8 skeleton rounded-full" />
                        ) : user ? (
                            <div className="flex items-center gap-2">
                                {user.photoURL ? (
                                    <Image
                                        src={user.photoURL}
                                        alt={user.displayName ?? 'User'}
                                        width={32}
                                        height={32}
                                        className="rounded-full ring-2 ring-brand-500/40"
                                    />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center">
                                        <User size={16} />
                                    </div>
                                )}
                                {/* İsim — sadece desktop */}
                                {user.displayName && (
                                    <span className="hidden md:block text-sm text-text-secondary max-w-[120px] truncate">
                                        {user.displayName.split(' ')[0]}
                                    </span>
                                )}
                                <button
                                    onClick={signOut}
                                    className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-colors"
                                    aria-label="Çıkış yap"
                                >
                                    <LogOut size={18} />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={signInWithGoogle}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors"
                            >
                                <LogIn size={16} />
                                Giriş Yap
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* ── Bottom nav — sadece mobil ── */}
            <nav className="fixed bottom-0 left-0 right-0 z-50 glass safe-bottom md:hidden">
                <div className="flex items-center justify-around h-16 px-2">
                    {navItems.map(({ href, icon: Icon, label }) => {
                        const active = pathname === href;
                        return (
                            <Link
                                key={href}
                                href={href}
                                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors ${active
                                        ? 'text-brand-400'
                                        : 'text-text-secondary hover:text-text-primary'
                                    }`}
                                aria-label={label}
                            >
                                <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
                                <span className="text-[10px] font-medium">{label}</span>
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </>
    );
}
