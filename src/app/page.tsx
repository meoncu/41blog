import { Metadata } from 'next';
import { PostFeed } from '@/components/posts/PostFeed';
import { SearchBar } from '@/components/ui/SearchBar';

export const metadata: Metadata = {
  title: '41Blog – Share Your World',
  description: 'A private, mobile-first blog for sharing moments and stories.',
};

export default function HomePage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 whitespace-pre-wrap">

      {/* Search */}
      <div className="mb-6">
        <SearchBar />
      </div>

      {/* Feed */}
      <PostFeed />
    </div>
  );
}
