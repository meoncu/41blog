import { Metadata } from 'next';
import { UserManagementClient } from '@/components/admin/UserManagementClient';

export const metadata: Metadata = {
    title: 'User Management',
};

export default function UsersPage() {
    return (
        <div className="max-w-2xl mx-auto px-4 py-6">
            <h1 className="text-2xl font-bold gradient-text mb-6">User Management</h1>
            <UserManagementClient />
        </div>
    );
}
