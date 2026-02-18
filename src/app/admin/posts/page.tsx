import { Metadata } from 'next';
import { AdminPostsClient } from '@/components/admin/AdminPostsClient';

export const metadata: Metadata = {
    title: 'Manage Posts',
};

export default function AdminPostsPage() {
    return (
        <div className="max-w-2xl mx-auto px-4 py-6">
            <h1 className="text-2xl font-bold gradient-text mb-6">Manage Posts</h1>
            <AdminPostsClient />
        </div>
    );
}
