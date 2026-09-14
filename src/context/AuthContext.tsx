import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { DEMO_USERS } from '../data/mockData';
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
  needsProfileCompletion: boolean;
  setNeedsProfileCompletion: (val: boolean) => void;
  saveProfileDetails: (details: {
    uidOrRoll: string;
    phone: string;
    department: string;
    name?: string;
  }) => Promise<void>;
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
  loginAsDemo: (role: 'student' | 'admin') => Promise<void>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthModalOpen: boolean;
  openAuthModal: (mode?: 'login' | 'signup', promptMessage?: string) => void;
  closeAuthModal: () => void;
  authModalMode: 'login' | 'signup';
  authPromptMessage: string | null;
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

// Check if a profile requires UID or mobile completion
export const checkProfileIncomplete = (profile: UserProfile | null): boolean => {
  if (!profile) return false;
  // Admin & Security Staff never require student profile completion
  if (profile.role === 'admin') return false;
  if (profile.profileCompleted === false) return true;
  const uid = (profile.uidOrRoll || '').trim();
  const phone = (profile.phone || '').trim();
  if (!uid || !phone) return true;
  if (phone === '+91 98765 00000' || phone === '9876500000' || phone === '0000000000') return true;
  return false;
};

// Strips undefined fields to prevent Firestore unsupported field value errors
function sanitizeProfile(profile: UserProfile): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(profile)) {
    if (val !== undefined) {
      clean[key] = val;
    }
  }
  return clean;
}

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
  const [authPromptMessage, setAuthPromptMessage] = useState<string | null>(null);
  const [needsProfileCompletion, setNeedsProfileCompletion] = useState(false);

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
            const email = user.email || '';
            const admin = isUserAdmin(email, profileData.role);
            const finalizedProfile: UserProfile = {
              ...profileData,
              role: admin ? 'admin' : (profileData.role || 'student'),
              uidOrRoll: profileData.uidOrRoll || (admin ? 'EMP-CU-ADMIN' : ''),
              department: profileData.department || (admin ? 'Campus Security & Administration' : 'Computer Science & Engineering (CSE)'),
              profileCompleted: admin ? true : profileData.profileCompleted,
            };
            setCurrentUser(finalizedProfile);
            if (!admin && checkProfileIncomplete(finalizedProfile)) {
              setNeedsProfileCompletion(true);
            } else {
              setNeedsProfileCompletion(false);
            }
          } else {
            // New user signed in with Google, initialize and immediately request UID + Mobile
            const email = user.email || '';
            const admin = isUserAdmin(email);
            const initialGoogleProfile: UserProfile = {
              id: user.uid,
              name: user.displayName || email.split('@')[0].replace('.', ' '),
              email: email,
              uidOrRoll: admin ? 'EMP-CU-ADMIN' : '',
              phone: '',
              department: admin ? 'Campus Security & Administration' : 'Computer Science & Engineering (CSE)',
              role: admin ? 'admin' : 'student',
              avatarUrl: user.photoURL || undefined,
              joinedDate: new Date().toISOString().split('T')[0],
              profileCompleted: admin ? true : false,
            };

            try {
              await setDoc(userDocRef, sanitizeProfile(initialGoogleProfile), { merge: true });
            } catch (err) {
              console.warn('Could not initialize profile in Firestore:', err);
            }
            setCurrentUser(initialGoogleProfile);
            setNeedsProfileCompletion(admin ? false : checkProfileIncomplete(initialGoogleProfile));
          }
        } catch (err) {
          console.warn('Error fetching Firestore user profile:', err);
          if (!currentUser || currentUser.id !== user.uid) {
            const email = user.email || '';
            const admin = isUserAdmin(email);
            const fallbackProfile: UserProfile = {
              id: user.uid,
              name: user.displayName || email.split('@')[0],
              email: email,
              uidOrRoll: admin ? 'EMP-CU-ADMIN' : '',
              phone: '',
              department: admin ? 'Campus Security & Administration' : 'Computer Science & Engineering (CSE)',
              role: admin ? 'admin' : 'student',
              joinedDate: new Date().toISOString().split('T')[0],
              profileCompleted: admin ? true : false,
            };
            setCurrentUser(fallbackProfile);
            setNeedsProfileCompletion(admin ? false : checkProfileIncomplete(fallbackProfile));
          }
        }
      } else {
        setCurrentUser(null);
        setNeedsProfileCompletion(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithEmail = async (email: string, password: string): Promise<void> => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const user = credential.user;
    
    // Fetch profile from Firestore
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(userDocRef);
      if (docSnap.exists()) {
        const profileData = docSnap.data() as UserProfile;
        setCurrentUser(profileData);
        if (checkProfileIncomplete(profileData)) {
          setNeedsProfileCompletion(true);
        } else {
          setNeedsProfileCompletion(false);
        }
      }
    } catch (err) {
      console.warn('Firestore fetch failed on login, using fallback profile:', err);
    }
    setIsAuthModalOpen(false);
    setAuthPromptMessage(null);
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
      uidOrRoll: data.uidOrRoll.trim().toUpperCase(),
      department: data.department,
      phone: data.phone.trim(),
      role: admin ? 'admin' : 'student',
      joinedDate: new Date().toISOString().split('T')[0],
      profileCompleted: true,
    };

    // Save to Firestore users collection
    try {
      await setDoc(doc(db, 'users', user.uid), sanitizeProfile(newProfile));
    } catch (err) {
      console.warn('Could not save new profile to Firestore:', err);
    }

    setCurrentUser(newProfile);
    setNeedsProfileCompletion(false);
    setIsAuthModalOpen(false);
    setAuthPromptMessage(null);
  };

  const loginWithGoogle = async (): Promise<void> => {
    const credential = await signInWithPopup(auth, googleProvider);
    const user = credential.user;
    
    const email = user.email || '';
    const admin = isUserAdmin(email);
    
    // Check if doc exists in Firestore
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(userDocRef);
      if (docSnap.exists()) {
        const profileData = docSnap.data() as UserProfile;
        const finalizedProfile: UserProfile = {
          ...profileData,
          role: admin ? 'admin' : (profileData.role || 'student'),
          uidOrRoll: profileData.uidOrRoll || (admin ? 'EMP-CU-ADMIN' : ''),
          department: profileData.department || (admin ? 'Campus Security & Administration' : 'Computer Science & Engineering (CSE)'),
          profileCompleted: admin ? true : profileData.profileCompleted,
        };
        setCurrentUser(finalizedProfile);
        if (!admin && checkProfileIncomplete(finalizedProfile)) {
          setNeedsProfileCompletion(true);
        } else {
          setNeedsProfileCompletion(false);
        }
      } else {
        const newProfile: UserProfile = {
          id: user.uid,
          name: user.displayName || email.split('@')[0].replace('.', ' '),
          email: email,
          uidOrRoll: admin ? 'EMP-CU-ADMIN' : '',
          phone: '',
          department: admin ? 'Campus Security & Administration' : 'Computer Science & Engineering (CSE)',
          role: admin ? 'admin' : 'student',
          avatarUrl: user.photoURL || undefined,
          joinedDate: new Date().toISOString().split('T')[0],
          profileCompleted: admin ? true : false,
        };
        try {
          await setDoc(userDocRef, sanitizeProfile(newProfile), { merge: true });
        } catch (writeErr) {
          console.warn('Could not write new profile to Firestore:', writeErr);
        }
        setCurrentUser(newProfile);
        setNeedsProfileCompletion(admin ? false : checkProfileIncomplete(newProfile));
      }
    } catch (err) {
      console.warn('Error saving Google user in Firestore:', err);
      const fallbackGoogle: UserProfile = {
        id: user.uid,
        name: user.displayName || email.split('@')[0].replace('.', ' '),
        email: email,
        uidOrRoll: admin ? 'EMP-CU-ADMIN' : '',
        phone: '',
        department: admin ? 'Campus Security & Administration' : 'Computer Science & Engineering (CSE)',
        role: admin ? 'admin' : 'student',
        avatarUrl: user.photoURL || undefined,
        joinedDate: new Date().toISOString().split('T')[0],
        profileCompleted: admin ? true : false,
      };
      setCurrentUser(fallbackGoogle);
      setNeedsProfileCompletion(admin ? false : checkProfileIncomplete(fallbackGoogle));
      setDoc(doc(db, 'users', user.uid), sanitizeProfile(fallbackGoogle), { merge: true }).catch(() => {});
    }

    setIsAuthModalOpen(false);
    setAuthPromptMessage(null);
  };

  const saveProfileDetails = async (details: {
    uidOrRoll: string;
    phone: string;
    department: string;
    name?: string;
  }): Promise<void> => {
    const targetUser = currentUser || (firebaseUser ? {
      id: firebaseUser.uid,
      name: firebaseUser.displayName || 'Student',
      email: firebaseUser.email || '',
      uidOrRoll: '',
      phone: '',
      department: details.department,
      role: isUserAdmin(firebaseUser.email || '') ? 'admin' : 'student',
      avatarUrl: firebaseUser.photoURL || undefined,
      joinedDate: new Date().toISOString().split('T')[0],
    } as UserProfile : null);

    if (!targetUser) return;

    const email = targetUser.email || '';
    const admin = isUserAdmin(email, targetUser.role);
    const updatedProfile: UserProfile = {
      ...targetUser,
      name: details.name || targetUser.name,
      uidOrRoll: details.uidOrRoll.trim().toUpperCase(),
      phone: details.phone.trim(),
      department: details.department,
      role: admin ? 'admin' : 'student',
      profileCompleted: true,
    };

    // Save to Firestore
    try {
      const userDocRef = doc(db, 'users', updatedProfile.id);
      await setDoc(userDocRef, sanitizeProfile(updatedProfile), { merge: true });
    } catch (err) {
      console.error('Failed to save profile details to Firestore:', err);
    }

    setCurrentUser(updatedProfile);
    setNeedsProfileCompletion(false);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedProfile));
  };

  const loginAsDemo = async (role: 'student' | 'admin'): Promise<void> => {
    const demoProfile = role === 'admin' ? DEMO_USERS[2] : DEMO_USERS[0];
    const fullDemo: UserProfile = {
      ...demoProfile,
      profileCompleted: true,
    };
    setCurrentUser(fullDemo);
    setNeedsProfileCompletion(false);
    setIsAuthModalOpen(false);
    setAuthPromptMessage(null);

    // Persist demo user profile to Firestore
    try {
      await setDoc(doc(db, 'users', fullDemo.id), sanitizeProfile(fullDemo), { merge: true });
    } catch (err) {
      console.warn('Could not save demo user profile to Firestore:', err);
    }
  };

  const updateUserProfile = async (updates: Partial<UserProfile>): Promise<void> => {
    if (!currentUser) return;
    const updated = { ...currentUser, ...updates };
    setCurrentUser(updated);

    // Save to Firestore
    try {
      await setDoc(doc(db, 'users', updated.id), sanitizeProfile(updated), { merge: true });
    } catch (err) {
      console.warn('Could not update user profile in Firestore:', err);
    }
  };

  const resetPassword = async (email: string): Promise<void> => {
    await sendPasswordResetEmail(auth, email);
  };

  const logout = async (): Promise<void> => {
    await signOut(auth);
    setCurrentUser(null);
    setNeedsProfileCompletion(false);
  };

  const openAuthModal = (mode: 'login' | 'signup' = 'login', promptMessage?: string) => {
    setAuthModalMode(mode);
    setAuthPromptMessage(promptMessage || null);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
    setAuthPromptMessage(null);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        firebaseUser,
        loading,
        isAuthenticated: !!currentUser,
        isAdmin: currentUser?.role === 'admin' || (currentUser?.email ? isUserAdmin(currentUser.email) : false),
        needsProfileCompletion,
        setNeedsProfileCompletion,
        saveProfileDetails,
        loginWithEmail,
        signupWithEmail,
        loginWithGoogle,
        loginAsDemo,
        updateUserProfile,
        resetPassword,
        logout,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
        authModalMode,
        authPromptMessage,
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
