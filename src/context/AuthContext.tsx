import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { auth, db, googleProvider } from '../lib/firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  signOut, 
  updateProfile,
  sendPasswordResetEmail,
  User 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface AuthContextType {
  currentUser: UserProfile | null;
  firebaseUser: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  signupWithEmail: (data: {
    name: string;
    email: string;
    password: string;
    uidOrRoll: string;
    department: string;
    phone: string;
    role?: 'student' | 'admin';
  }) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthModalOpen: boolean;
  openAuthModal: (mode?: 'login' | 'signup') => void;
  closeAuthModal: () => void;
  authModalMode: 'login' | 'signup';
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'sahayak_auth_user_v1';

// Helper to determine if an email belongs to Campus Admin / Security
export const isUserAdmin = (email: string, role?: string): boolean => {
  if (role === 'admin') return true;
  const lower = (email || '').toLowerCase();
  return (
    lower.includes('admin') || 
    lower.includes('security') || 
    lower === 'gauravsinghrajpoot2019@gmail.com' ||
    lower.startsWith('admin.')
  );
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');

  // Sync current user with localStorage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, [currentUser]);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          // Fetch user profile from Firestore
          const userDocRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(userDocRef);

          if (docSnap.exists()) {
            const profileData = docSnap.data() as UserProfile;
            setCurrentUser(profileData);
          } else {
            // Document doesn't exist yet (e.g. fresh Google login)
            const email = user.email || '';
            const admin = isUserAdmin(email);
            const generatedProfile: UserProfile = {
              id: user.uid,
              name: user.displayName || email.split('@')[0].replace('.', ' '),
              email: email,
              uidOrRoll: email.includes('@cuchd.in') 
                ? email.split('@')[0].toUpperCase() 
                : '21BCS' + Math.floor(1000 + Math.random() * 9000),
              phone: user.phoneNumber || '+91 98765 00000',
              department: 'Computer Science & Engineering (CSE)',
              role: admin ? 'admin' : 'student',
              avatarUrl: user.photoURL || undefined,
              joinedDate: new Date().toISOString().split('T')[0],
            };

            // Attempt to persist profile to Firestore
            try {
              await setDoc(userDocRef, generatedProfile, { merge: true });
            } catch (err) {
              console.warn('Could not save profile to Firestore:', err);
            }
            setCurrentUser(generatedProfile);
          }
        } catch (err) {
          console.warn('Error fetching Firestore user profile:', err);
          // Fallback to basic profile from Firebase User
          if (!currentUser || currentUser.id !== user.uid) {
            const email = user.email || '';
            setCurrentUser({
              id: user.uid,
              name: user.displayName || email.split('@')[0],
              email: email,
              uidOrRoll: '21BCS1001',
              phone: '+91 98765 00000',
              department: 'Computer Science & Engineering (CSE)',
              role: isUserAdmin(email) ? 'admin' : 'student',
              joinedDate: new Date().toISOString().split('T')[0],
            });
          }
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithEmail = async (email: string, password: string): Promise<void> => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const user = credential.user;
    
    // Fetch profile
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(userDocRef);
      if (docSnap.exists()) {
        setCurrentUser(docSnap.data() as UserProfile);
      }
    } catch (err) {
      console.warn('Firestore fetch failed on login, using fallback profile:', err);
    }
    setIsAuthModalOpen(false);
  };

  const signupWithEmail = async (data: {
    name: string;
    email: string;
    password: string;
    uidOrRoll: string;
    department: string;
    phone: string;
    role?: 'student' | 'admin';
  }): Promise<void> => {
    const credential = await createUserWithEmailAndPassword(auth, data.email, data.password);
    const user = credential.user;

    // Update display name in Firebase Auth
    try {
      await updateProfile(user, { displayName: data.name });
    } catch (err) {
      console.warn('Could not update profile name in Firebase Auth:', err);
    }

    const admin = data.role === 'admin' || isUserAdmin(data.email, data.role);
    const newProfile: UserProfile = {
      id: user.uid,
      name: data.name,
      email: data.email,
      uidOrRoll: data.uidOrRoll,
      department: data.department,
      phone: data.phone,
      role: admin ? 'admin' : 'student',
      joinedDate: new Date().toISOString().split('T')[0],
    };

    // Save to Firestore
    try {
      await setDoc(doc(db, 'users', user.uid), newProfile);
    } catch (err) {
      console.warn('Could not save new profile to Firestore:', err);
    }

    setCurrentUser(newProfile);
    setIsAuthModalOpen(false);
  };

  const loginWithGoogle = async (): Promise<void> => {
    const credential = await signInWithPopup(auth, googleProvider);
    const user = credential.user;
    
    const email = user.email || '';
    const admin = isUserAdmin(email);
    
    // Check if doc exists
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(userDocRef);
      if (docSnap.exists()) {
        setCurrentUser(docSnap.data() as UserProfile);
      } else {
        const newProfile: UserProfile = {
          id: user.uid,
          name: user.displayName || email.split('@')[0],
          email: email,
          uidOrRoll: email.includes('@cuchd.in') 
            ? email.split('@')[0].toUpperCase() 
            : '21BCS' + Math.floor(1000 + Math.random() * 9000),
          phone: '+91 98765 00000',
          department: 'Computer Science & Engineering (CSE)',
          role: admin ? 'admin' : 'student',
          avatarUrl: user.photoURL || undefined,
          joinedDate: new Date().toISOString().split('T')[0],
        };
        await setDoc(userDocRef, newProfile, { merge: true });
        setCurrentUser(newProfile);
      }
    } catch (err) {
      console.warn('Error saving Google user in Firestore:', err);
      // Fallback
      setCurrentUser({
        id: user.uid,
        name: user.displayName || email.split('@')[0],
        email: email,
        uidOrRoll: '21BCS1001',
        phone: '+91 98765 00000',
        department: 'Computer Science & Engineering (CSE)',
        role: admin ? 'admin' : 'student',
        avatarUrl: user.photoURL || undefined,
        joinedDate: new Date().toISOString().split('T')[0],
      });
    }

    setIsAuthModalOpen(false);
  };

  const resetPassword = async (email: string): Promise<void> => {
    await sendPasswordResetEmail(auth, email);
  };

  const logout = async (): Promise<void> => {
    await signOut(auth);
    setCurrentUser(null);
  };

  const openAuthModal = (mode: 'login' | 'signup' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        firebaseUser,
        loading,
        isAuthenticated: !!currentUser,
        isAdmin: currentUser?.role === 'admin' || (currentUser?.email ? isUserAdmin(currentUser.email) : false),
        loginWithEmail,
        signupWithEmail,
        loginWithGoogle,
        resetPassword,
        logout,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
        authModalMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
