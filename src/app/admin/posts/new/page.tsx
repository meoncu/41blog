import { Metadata } from 'next';
import { NewPostForm } from '@/components/admin/NewPostForm';

export const metadata: Metadata = {
    title: 'New Post',
};

export default function NewPostPage() {
    return (
        <div className="max-w-2xl mx-auto px-4 py-6">
            <h1 className="text-2xl font-bold gradient-text mb-6">New Post</h1>
            <NewPostForm />
        </div>
    );
}
