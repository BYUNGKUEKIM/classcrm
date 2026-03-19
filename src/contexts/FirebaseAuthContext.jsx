import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { toast } from '@/components/ui/use-toast';

const FirebaseAuthContext = createContext(undefined);

export const FirebaseAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // 사용자 프로필 가져오기
  const fetchProfile = useCallback(async (uid) => {
    if (!uid) return null;
    
    try {
      const profileRef = doc(db, 'users', uid);
      const profileSnap = await getDoc(profileRef);
      
      if (profileSnap.exists()) {
        return profileSnap.data();
      } else {
        console.log('No profile found for user:', uid);
        return null;
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  }, []);

  // 사용자 프로필 생성 (회원가입 시)
  const createUserProfile = useCallback(async (uid, email, additionalData = {}) => {
    try {
      const userRef = doc(db, 'users', uid);
      const userData = {
        email,
        role: additionalData.role || 'user',
        status: 'active',
        studioName: additionalData.studioName || '',
        displayName: additionalData.displayName || email.split('@')[0],
        photoURL: additionalData.photoURL || null,
        phoneNumber: additionalData.phoneNumber || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        settings: {
          notifications: {
            email: true,
            sms: false,
            push: true,
          },
          theme: 'light',
          language: 'ko',
        },
        subscription: {
          plan: 'free',
          status: 'active',
          startDate: new Date().toISOString(),
          endDate: null,
        },
      };

      await setDoc(userRef, userData);
      return userData;
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
  }, []);

  // 사용자 상태 변경 감지
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        
        // 프로필 가져오기
        const userProfile = await fetchProfile(firebaseUser.uid);
        setProfile(userProfile);
        
        // 마지막 로그인 시간 업데이트
        if (userProfile) {
          const userRef = doc(db, 'users', firebaseUser.uid);
          await updateDoc(userRef, {
            lastLoginAt: serverTimestamp(),
          }).catch(console.error);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [fetchProfile]);

  // 회원가입
  const signUp = useCallback(async (email, password, additionalData = {}) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 프로필 생성
      const profile = await createUserProfile(user.uid, email, additionalData);

      // displayName 업데이트
      if (additionalData.displayName) {
        await updateProfile(user, {
          displayName: additionalData.displayName,
        });
      }

      toast({
        title: "회원가입 성공!",
        description: "환영합니다! 로그인해주세요.",
      });

      return { user, profile, error: null };
    } catch (error) {
      console.error('Sign up error:', error);
      
      let message = "회원가입 중 오류가 발생했습니다.";
      if (error.code === 'auth/email-already-in-use') {
        message = "이미 사용 중인 이메일입니다.";
      } else if (error.code === 'auth/weak-password') {
        message = "비밀번호는 최소 6자 이상이어야 합니다.";
      } else if (error.code === 'auth/invalid-email') {
        message = "유효하지 않은 이메일 형식입니다.";
      }

      toast({
        variant: "destructive",
        title: "회원가입 실패",
        description: message,
      });

      return { user: null, profile: null, error };
    }
  }, [createUserProfile]);

  // 로그인
  const signIn = useCallback(async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      toast({
        title: "로그인 성공!",
        description: "환영합니다!",
      });

      return { user: userCredential.user, error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      
      let message = "이메일 또는 비밀번호를 확인해주세요.";
      if (error.code === 'auth/user-not-found') {
        message = "등록되지 않은 이메일입니다.";
      } else if (error.code === 'auth/wrong-password') {
        message = "비밀번호가 올바르지 않습니다.";
      } else if (error.code === 'auth/too-many-requests') {
        message = "너무 많은 로그인 시도가 있었습니다. 잠시 후 다시 시도해주세요.";
      }

      toast({
        variant: "destructive",
        title: "로그인 실패",
        description: message,
      });

      return { user: null, error };
    }
  }, []);

  // Google 로그인
  const signInWithGoogle = useCallback(async () => {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;

      // 프로필이 없으면 생성
      const existingProfile = await fetchProfile(user.uid);
      if (!existingProfile) {
        await createUserProfile(user.uid, user.email, {
          displayName: user.displayName,
          photoURL: user.photoURL,
        });
      }

      toast({
        title: "로그인 성공!",
        description: "Google 계정으로 로그인했습니다.",
      });

      return { user, error: null };
    } catch (error) {
      console.error('Google sign in error:', error);
      
      toast({
        variant: "destructive",
        title: "Google 로그인 실패",
        description: "Google 로그인 중 오류가 발생했습니다.",
      });

      return { user: null, error };
    }
  }, [createUserProfile, fetchProfile]);

  // 로그아웃
  const signOut = useCallback(async () => {
    try {
      await firebaseSignOut(auth);
      
      toast({
        title: "로그아웃",
        description: "성공적으로 로그아웃되었습니다.",
      });

      return { error: null };
    } catch (error) {
      console.error('Sign out error:', error);
      
      toast({
        variant: "destructive",
        title: "로그아웃 실패",
        description: "로그아웃 중 오류가 발생했습니다.",
      });

      return { error };
    }
  }, []);

  // 비밀번호 재설정
  const resetPassword = useCallback(async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      
      toast({
        title: "비밀번호 재설정 이메일 발송",
        description: "이메일을 확인하여 비밀번호를 재설정해주세요.",
      });

      return { error: null };
    } catch (error) {
      console.error('Password reset error:', error);
      
      let message = "비밀번호 재설정 중 오류가 발생했습니다.";
      if (error.code === 'auth/user-not-found') {
        message = "등록되지 않은 이메일입니다.";
      }

      toast({
        variant: "destructive",
        title: "비밀번호 재설정 실패",
        description: message,
      });

      return { error };
    }
  }, []);

  // 프로필 업데이트
  const updateUserProfile = useCallback(async (updates) => {
    if (!user) return { error: new Error('No user logged in') };

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });

      // Firebase Auth 프로필도 업데이트
      if (updates.displayName || updates.photoURL) {
        await updateProfile(user, {
          displayName: updates.displayName,
          photoURL: updates.photoURL,
        });
      }

      // 로컬 프로필 상태 업데이트
      const updatedProfile = await fetchProfile(user.uid);
      setProfile(updatedProfile);

      toast({
        title: "프로필 업데이트 완료",
        description: "프로필이 성공적으로 업데이트되었습니다.",
      });

      return { error: null };
    } catch (error) {
      console.error('Profile update error:', error);
      
      toast({
        variant: "destructive",
        title: "프로필 업데이트 실패",
        description: "프로필 업데이트 중 오류가 발생했습니다.",
      });

      return { error };
    }
  }, [user, fetchProfile]);

  const value = useMemo(() => ({
    user,
    profile,
    loading,
    session: user ? { user } : null,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
    updateUserProfile,
  }), [user, profile, loading, signUp, signIn, signInWithGoogle, signOut, resetPassword, updateUserProfile]);

  return (
    <FirebaseAuthContext.Provider value={value}>
      {children}
    </FirebaseAuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(FirebaseAuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within a FirebaseAuthProvider');
  }
  return context;
};

export default FirebaseAuthContext;
