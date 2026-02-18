/**
 * Firebase Admin SDK
 * Server-side only. NEVER import in client components or pages.
 * Used in API routes and Server Actions.
 */
import { getApps, initializeApp, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

function getAdminApp(): App {
    if (getApps().length > 0) {
        return getApps()[0];
    }

    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(
        /\\n/g,
        '\n'
    );

    return initializeApp({
        credential: cert({
            projectId: process.env.FIREBASE_ADMIN_PROJECT_ID!,
            clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
            privateKey,
        }),
    });
}

const adminApp = getAdminApp();

export const adminAuth: Auth = getAuth(adminApp);
export const adminDb: Firestore = getFirestore(adminApp);

export default adminApp;
