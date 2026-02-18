'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

export function SearchBar() {
    const [value, setValue] = useState('');
    const router = useRouter();
    const debounced = useDebounce(value, 400);

    const handleSearch = useCallback(
        (q: string) => {
            if (q.trim()) {
                router.push(`/search?q=${encodeURIComponent(q.trim())}`);
            }
        },
        [router]
    );

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                handleSearch(value);
            }}
            className="relative"
        >
            <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
            />
            <input
                type="search"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Search posts…"
                className="w-full pl-10 pr-10 py-3 rounded-xl bg-surface-2 border border-surface-4 text-text-primary placeholder:text-text-muted text-sm focus:border-brand-500 focus:outline-none transition-colors"
            />
            {value && (
                <button
                    type="button"
                    onClick={() => setValue('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                >
                    <X size={16} />
                </button>
            )}
        </form>
    );
}
