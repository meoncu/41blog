import { Metadata } from 'next';
import { PostFeed } from '@/components/posts/PostFeed';
import { SearchBar } from '@/components/ui/SearchBar';

interface SearchPageProps {
    searchParams: Promise<{ q?: string }>;
}

export async function generateMetadata({
    searchParams,
}: SearchPageProps): Promise<Metadata> {
    const { q } = await searchParams;
    return {
        title: q ? `Search: "${q}"` : 'Search Posts',
    };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
    const { q } = await searchParams;

    return (
        <div className="max-w-2xl mx-auto px-4 py-6">
            <h1 className="text-2xl font-bold gradient-text mb-6">Search</h1>
            <div className="mb-6">
                <SearchBar />
            </div>
            {q && (
                <p className="text-sm text-text-muted mb-4">
                    Results for <span className="text-text-primary font-medium">"{q}"</span>
                </p>
            )}
            <PostFeed searchQuery={q} />
        </div>
    );
}
