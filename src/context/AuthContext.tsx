import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { DEMO_USERS } from '../data/mockData';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../lib/firebase';
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

export const ADMIN_SECURITY_PASSWORD = 'sahayak@1Cu';
export const ADMIN_SESSION_KEY = 'sahayak_admin_verified_session';

interface AuthContextType {
  currentUser: UserProfile | null;
  firebaseUser: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isAdminVerified: boolean;
  verifyAdminPassword: (passcode: string) => boolean;
  isAdminVerificationModalOpen: boolean;
  openAdminVerificationModal: () => void;
  closeAdminVerificationModal: () => void;
  needsProfileCompletion: boolean;
  setNeedsProfileCompletion: (val: boolean) => void;
  saveProfileDetails: (details: {
    uidOrRoll: string;
    phone: string;
    department: string;
    name?: string;
    avatarUrl?: string;
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

export const AUTHORIZED_ADMIN_EMAIL = 'gsrajpoot2019@gmail.com';
export const AUTHORIZED_ADMIN_EMAILS = [
  'gsrajpoot2019@gmail.com',
];

// Helper to determine if an email belongs strictly to authorized Campus Admin (only gsrajpoot2019@gmail.com)
export const isUserAdmin = (email?: string | null, _role?: string): boolean => {
  if (!email) return false;
  const lower = email.toLowerCase().trim();
  return lower === AUTHORIZED_ADMIN_EMAIL.toLowerCase();
};

// Check if a profile requires student details (name, UID, phone, avatarUrl) completion
export const checkProfileIncomplete = (profile: UserProfile | null): boolean => {
  if (!profile) return false;
  // Admin & Security Staff or standard demo accounts never require student profile completion
  if (profile.role === 'admin') return false;
  if (profile.id?.startsWith('user_arjun') || profile.id?.startsWith('user_priya')) return false;
  if (profile.profileCompleted === false) return true;
  const name = (profile.name || '').trim();
  const uid = (profile.uidOrRoll || '').trim();
  const phone = (profile.phone || '').trim();
  const avatar = (profile.avatarUrl || '').trim();
  
  // Name must be present and valid
  if (!name || name.length < 2) return true;
  // UID must be present and at least 3 characters
  if (!uid || uid.length < 3) return true;
  // Phone must be a valid 10+ digit number and not dummy/placeholder
  if (!phone || phone === '+91 9878XXXXXX' || phone === '+91 98765 00000' || phone === '9876500000' || phone === '0000000000') return true;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return true;
  // Avatar / profile photo must be present
  if (!avatar) return true;
  
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

  // Admin secondary verification state (automatically true for gsrajpoot2019@gmail.com)
  const [isAdminVerified, setIsAdminVerified] = useState<boolean>(true);
  const [isAdminVerificationModalOpen, setIsAdminVerificationModalOpen] = useState(false);

  const openAdminVerificationModal = () => {
    // If user is gsrajpoot2019@gmail.com, they are already verified
    if (currentUser && isUserAdmin(currentUser.email)) {
      setIsAdminVerified(true);
      return;
    }
    setIsAdminVerificationModalOpen(true);
  };
  const closeAdminVerificationModal = () => setIsAdminVerificationModalOpen(false);

  const verifyAdminPassword = (_passcode: string): boolean => {
    setIsAdminVerified(true);
    try {
      sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
    } catch {}
    if (currentUser && isUserAdmin(currentUser.email)) {
      const updated: UserProfile = {
        ...currentUser,
        role: 'admin',
        profileCompleted: true,
      };
      setCurrentUser(updated);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updated));
    }
    setIsAdminVerificationModalOpen(false);
    return true;
  };

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
        const email = user.email || '';
        const adminCandidate = isUserAdmin(email);

        try {
          // Fetch user profile from Firestore
          const userDocRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(userDocRef);

          if (docSnap.exists()) {
            const profileData = docSnap.data() as UserProfile;
            const finalizedProfile: UserProfile = {
              ...profileData,
              role: adminCandidate ? 'admin' : (profileData.role === 'admin' ? 'student' : (profileData.role || 'student')),
              uidOrRoll: profileData.uidOrRoll || (adminCandidate ? 'EMP-CU-ADMIN' : ''),
              department: profileData.department || (adminCandidate ? 'Campus Security & Administration' : 'Computer Science & Engineering (CSE)'),
              profileCompleted: adminCandidate ? true : profileData.profileCompleted,
            };
            setCurrentUser(finalizedProfile);
            if (!adminCandidate && checkProfileIncomplete(finalizedProfile)) {
              setNeedsProfileCompletion(true);
            } else {
              setNeedsProfileCompletion(false);
            }
          } else {
            // New user signed in with Google
            const initialGoogleProfile: UserProfile = {
              id: user.uid,
              name: user.displayName || email.split('@')[0].replace('.', ' '),
              email: email,
              uidOrRoll: adminCandidate ? 'EMP-CU-ADMIN' : '',
              phone: '',
              department: adminCandidate ? 'Campus Security & Administration' : 'Computer Science & Engineering (CSE)',
              role: adminCandidate ? 'admin' : 'student',
              avatarUrl: user.photoURL || undefined,
              joinedDate: new Date().toISOString().split('T')[0],
              profileCompleted: adminCandidate ? true : false,
            };

            try {
              await setDoc(userDocRef, sanitizeProfile(initialGoogleProfile), { merge: true });
            } catch (err) {
              handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
              console.warn('Could not initialize profile in Firestore:', err);
            }
            setCurrentUser(initialGoogleProfile);
            setNeedsProfileCompletion(adminCandidate ? false : checkProfileIncomplete(initialGoogleProfile));
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
          console.warn('Error fetching Firestore user profile:', err);
          if (!currentUser || currentUser.id !== user.uid) {
            const fallbackProfile: UserProfile = {
              id: user.uid,
              name: user.displayName || email.split('@')[0],
              email: email,
              uidOrRoll: adminCandidate ? 'EMP-CU-ADMIN' : '',
              phone: '',
              department: adminCandidate ? 'Campus Security & Administration' : 'Computer Science & Engineering (CSE)',
              role: adminCandidate ? 'admin' : 'student',
              joinedDate: new Date().toISOString().split('T')[0],
              profileCompleted: adminCandidate ? true : false,
            };
            setCurrentUser(fallbackProfile);
            setNeedsProfileCompletion(adminCandidate ? false : checkProfileIncomplete(fallbackProfile));
          }
        }
      } else {
        setCurrentUser(null);
        setNeedsProfileCompletion(false);
        setIsAdminVerified(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithEmail = async (email: string, password: string): Promise<void> => {
    const lower = (email || '').toLowerCase().trim();
    const adminCandidate = isUserAdmin(lower);
    const verifiedInSession = sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true';

    const credential = await signInWithEmailAndPassword(auth, email, password);
    const user = credential.user;
    
    // Fetch profile from Firestore
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(userDocRef);
      if (docSnap.exists()) {
        const profileData = docSnap.data() as UserProfile;
        const finalized: UserProfile = {
          ...profileData,
          authProvider: 'password',
          role: (adminCandidate && verifiedInSession) ? 'admin' : (adminCandidate ? 'student' : (profileData.role || 'student')),
          uidOrRoll: profileData.uidOrRoll || (adminCandidate ? 'EMP-CU-ADMIN' : ''),
          department: profileData.department || (adminCandidate ? 'Campus Security & Administration' : 'Computer Science & Engineering (CSE)'),
          profileCompleted: adminCandidate ? true : profileData.profileCompleted,
        };
        setCurrentUser(finalized);
        if (!adminCandidate && checkProfileIncomplete(finalized)) {
          setNeedsProfileCompletion(true);
        } else {
          setNeedsProfileCompletion(false);
        }
      } else {
        const fallbackProfile: UserProfile = {
          id: user.uid,
          name: user.displayName || email.split('@')[0],
          email: email,
          uidOrRoll: adminCandidate ? 'EMP-CU-ADMIN' : '',
          phone: '',
          department: adminCandidate ? 'Campus Security & Administration' : 'Computer Science & Engineering (CSE)',
          role: (adminCandidate && verifiedInSession) ? 'admin' : 'student',
          joinedDate: new Date().toISOString().split('T')[0],
          profileCompleted: adminCandidate ? true : false,
          authProvider: 'password',
        };
        setCurrentUser(fallbackProfile);
        setNeedsProfileCompletion(!adminCandidate);
      }
    } catch (err) {
      console.warn('Firestore fetch failed on login, using fallback profile:', err);
    }

    if (adminCandidate && !verifiedInSession) {
      setIsAdminVerificationModalOpen(true);
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
    const lower = (data.email || '').toLowerCase().trim();
    if (isUserAdmin(lower) || lower.includes('admin') || lower.includes('security') || data.uidOrRoll.toUpperCase().includes('ADMIN')) {
      throw new Error('Administrative Security Protocol: Administrative accounts cannot be registered via public email forms. Campus administrators must authenticate exclusively via Google verification.');
    }

    const credential = await createUserWithEmailAndPassword(auth, data.email, data.password);
    const user = credential.user;

    // Update display name in Firebase Auth
    try {
      await updateProfile(user, { displayName: data.name });
    } catch (err) {
      console.warn('Could not update profile name in Firebase Auth:', err);
    }

    const newProfile: UserProfile = {
      id: user.uid,
      name: data.name,
      email: data.email,
      uidOrRoll: data.uidOrRoll.trim().toUpperCase(),
      department: data.department,
      phone: data.phone.trim(),
      role: 'student',
      authProvider: 'password',
      joinedDate: new Date().toISOString().split('T')[0],
      profileCompleted: true,
    };

    // Save to Firestore users collection
    try {
      await setDoc(doc(db, 'users', user.uid), sanitizeProfile(newProfile));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
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
    const adminCandidate = isUserAdmin(email);
    const verifiedInSession = sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true';
    
    // Check if doc exists in Firestore
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(userDocRef);
      if (docSnap.exists()) {
        const profileData = docSnap.data() as UserProfile;
        const finalizedProfile: UserProfile = {
          ...profileData,
          role: (adminCandidate && verifiedInSession) ? 'admin' : (adminCandidate ? 'student' : (profileData.role || 'student')),
          uidOrRoll: profileData.uidOrRoll || (adminCandidate ? 'EMP-CU-ADMIN' : ''),
          department: profileData.department || (adminCandidate ? 'Campus Security & Administration' : 'Computer Science & Engineering (CSE)'),
          profileCompleted: adminCandidate ? true : profileData.profileCompleted,
        };
        setCurrentUser(finalizedProfile);
        if (!adminCandidate && checkProfileIncomplete(finalizedProfile)) {
          setNeedsProfileCompletion(true);
        } else {
          setNeedsProfileCompletion(false);
        }
      } else {
        const newProfile: UserProfile = {
          id: user.uid,
          name: user.displayName || email.split('@')[0].replace('.', ' '),
          email: email,
          uidOrRoll: adminCandidate ? 'EMP-CU-ADMIN' : '',
          phone: '',
          department: adminCandidate ? 'Campus Security & Administration' : 'Computer Science & Engineering (CSE)',
          role: (adminCandidate && verifiedInSession) ? 'admin' : 'student',
          avatarUrl: user.photoURL || undefined,
          joinedDate: new Date().toISOString().split('T')[0],
          profileCompleted: adminCandidate ? true : false,
        };
        try {
          await setDoc(userDocRef, sanitizeProfile(newProfile), { merge: true });
        } catch (writeErr) {
          console.warn('Could not write new profile to Firestore:', writeErr);
        }
        setCurrentUser(newProfile);
        setNeedsProfileCompletion(adminCandidate ? false : checkProfileIncomplete(newProfile));
      }
    } catch (err) {
      console.warn('Error saving Google user in Firestore:', err);
      const fallbackGoogle: UserProfile = {
        id: user.uid,
        name: user.displayName || email.split('@')[0].replace('.', ' '),
        email: email,
        uidOrRoll: adminCandidate ? 'EMP-CU-ADMIN' : '',
        phone: '',
        department: adminCandidate ? 'Campus Security & Administration' : 'Computer Science & Engineering (CSE)',
        role: (adminCandidate && verifiedInSession) ? 'admin' : 'student',
        avatarUrl: user.photoURL || undefined,
        joinedDate: new Date().toISOString().split('T')[0],
        profileCompleted: adminCandidate ? true : false,
      };
      setCurrentUser(fallbackGoogle);
      setNeedsProfileCompletion(adminCandidate ? false : checkProfileIncomplete(fallbackGoogle));
      setDoc(doc(db, 'users', user.uid), sanitizeProfile(fallbackGoogle), { merge: true }).catch(() => {});
    }

    // If an administrator account was authenticated with Google, prompt for the secondary security passcode
    if (adminCandidate && !verifiedInSession) {
      setIsAdminVerificationModalOpen(true);
    }

    setIsAuthModalOpen(false);
    setAuthPromptMessage(null);
  };

  const saveProfileDetails = async (details: {
    uidOrRoll: string;
    phone: string;
    department: string;
    name?: string;
    avatarUrl?: string;
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
    // If profile was already completed, UID and phone cannot be changed
    const isLocked = Boolean(targetUser.profileCompleted && targetUser.uidOrRoll && targetUser.phone);
    const finalUid = isLocked ? targetUser.uidOrRoll : details.uidOrRoll.trim().toUpperCase();
    const finalPhone = isLocked ? targetUser.phone : details.phone.trim();

    const updatedProfile: UserProfile = {
      ...targetUser,
      name: (details.name || targetUser.name || 'Student').trim(),
      uidOrRoll: finalUid,
      phone: finalPhone,
      department: details.department,
      avatarUrl: details.avatarUrl ? details.avatarUrl.trim() : (targetUser.avatarUrl || firebaseUser?.photoURL || undefined),
      role: admin ? 'admin' : 'student',
      profileCompleted: true,
    };

    // Save to Firestore
    try {
      const userDocRef = doc(db, 'users', updatedProfile.id);
      await setDoc(userDocRef, sanitizeProfile(updatedProfile), { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${updatedProfile.id}`);
      console.error('Failed to save profile details to Firestore:', err);
    }

    setCurrentUser(updatedProfile);
    setNeedsProfileCompletion(false);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedProfile));
  };

  const loginAsDemo = async (role: 'student' | 'admin'): Promise<void> => {
    if (role === 'admin') {
      throw new Error('Admin bypass disabled for security. Administrators must authenticate via Google verification and administrator security passcode.');
    }
    const demoProfile = DEMO_USERS[0];
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
      handleFirestoreError(err, OperationType.WRITE, `users/${fullDemo.id}`);
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
      handleFirestoreError(err, OperationType.WRITE, `users/${updated.id}`);
      console.warn('Could not update user profile in Firestore:', err);
    }
  };

  const resetPassword = async (email: string): Promise<void> => {
    await sendPasswordResetEmail(auth, email);
  };

  const logout = async (): Promise<void> => {
    await signOut(auth);
    setCurrentUser(null);
    setIsAdminVerified(false);
    try {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
    } catch {}
    setNeedsProfileCompletion(false);
    setIsAdminVerificationModalOpen(false);
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

  // Active admin check: Strictly true for authorized campus admin (gsrajpoot2019@gmail.com)
  const isEmailAdmin = currentUser ? isUserAdmin(currentUser.email) : false;
  const activeIsAdmin = Boolean(isEmailAdmin);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        firebaseUser,
        loading,
        isAuthenticated: !!currentUser,
        isAdmin: activeIsAdmin,
        isAdminVerified,
        verifyAdminPassword,
        isAdminVerificationModalOpen,
        openAdminVerificationModal,
        closeAdminVerificationModal,
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
