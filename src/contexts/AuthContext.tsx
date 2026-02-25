'use client';

import {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
    ReactNode,
} from 'react';
import {
    User,
    GoogleAuthProvider,
    signInWithPopup,
    signOut as firebaseSignOut,
    onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/client';
import { AppUser, UserRole } from '@/types';
import { isAdmin } from '@/lib/permissions';

interface AuthContextValue {
    user: User | null;
    appUser: AppUser | null;
    loading: boolean;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
    isAdmin: boolean;
    canEdit: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [appUser, setAppUser] = useState<AppUser | null>(null);
    const [loading, setLoading] = useState(true);

    const loadAppUser = useCallback(async (firebaseUser: User) => {
        const email = firebaseUser.email ?? '';
        const role: UserRole = isAdmin(email) ? 'admin' : 'public';

        const userRef = doc(db, 'users', firebaseUser.uid);
        const snap = await getDoc(userRef);

        if (snap.exists()) {
            const data = snap.data() as AppUser;
            // Upgrade role if admin email
            const resolvedRole: UserRole = isAdmin(email) ? 'admin' : data.role;
            setAppUser({ ...data, role: resolvedRole });
        } else {
            // Check whitelist for pre-approval
            let initialRole = role;
            let initialCanEdit = role === 'admin';

            try {
                // We use client-side SDK check here (faster)
                // Note: whitelist collection should have proper rules
                const { collection, query, where, getDocs, limit } = await import('firebase/firestore');
                const q = query(collection(db, 'whitelist'), where('email', '==', email.toLowerCase()), limit(1));
                const whitelistSnap = await getDocs(q);

                if (!whitelistSnap.empty) {
                    const whiteData = whitelistSnap.docs[0].data();
                    initialRole = whiteData.role || 'allowed';
                    initialCanEdit = whiteData.canEdit || false;
                }
            } catch (err) {
                console.error('Whitelist check failed:', err);
            }

            // First login – create user document
            const newUser: Omit<AppUser, 'approvedAt' | 'approvedBy'> = {
                uid: firebaseUser.uid,
                email,
                displayName: firebaseUser.displayName,
                photoURL: firebaseUser.photoURL,
                role: initialRole,
                canEdit: initialCanEdit,
                createdAt: new Date().toISOString(),
            };
            await setDoc(userRef, { ...newUser, createdAt: serverTimestamp() });
            setAppUser(newUser as AppUser);
        }
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);
            if (firebaseUser) {
                await loadAppUser(firebaseUser);
            } else {
                setAppUser(null);
            }
            setLoading(false);
        });
        return unsubscribe;
    }, [loadAppUser]);

    const signInWithGoogle = useCallback(async () => {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        await signInWithPopup(auth, provider);
    }, []);

    const signOut = useCallback(async () => {
        await firebaseSignOut(auth);
        setAppUser(null);
    }, []);

    const value: AuthContextValue = {
        user,
        appUser,
        loading,
        signInWithGoogle,
        signOut,
        isAdmin: appUser?.role === 'admin',
        canEdit: appUser?.role === 'admin' || (appUser?.canEdit ?? false),
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
