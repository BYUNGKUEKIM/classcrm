import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/firebase';
import { toast } from '@/components/ui/use-toast';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (user) => {
    if (!user) return null;
    try {
      const { data, error, status } = await supabase
        .from('profiles')
        .select(`*`)
        .eq('id', user.id)
        .single();
      
      if (error && status !== 406) {
        console.error('Error fetching profile:', error);
        return null;
      }
      return data;
    } catch (error) {
      console.error('Exception when fetching profile:', error);
      return null;
    }
  }, []);

  useEffect(() => {
    const setAuthData = async (session) => {
      if (session?.user) {
        const userProfile = await fetchProfile(session.user);
        setSession(session);
        setProfile(userProfile);
      } else {
        setSession(null);
        setProfile(null);
      }
      setLoading(false);
    };

    const initialize = async () => {
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      await setAuthData(initialSession);
    };

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthData(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signUp = useCallback(async (email, password, options) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "회원가입 실패",
        description: error.message || "알 수 없는 오류가 발생했습니다.",
      });
    } else {
       toast({
        title: "회원가입 성공!",
        description: "인증 메일을 확인해주세요.",
      });
    }
    return { data, error };
  }, []);

  const signIn = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "로그인 실패",
        description: "이메일 또는 비밀번호를 확인해주세요.",
      });
    }
    return { data, error };
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        variant: "destructive",
        title: "로그아웃 실패",
        description: error.message || "알 수 없는 오류가 발생했습니다.",
      });
    }
    return { error };
  }, []);

  const value = useMemo(() => ({
    user: session?.user ?? null,
    profile,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  }), [session, profile, loading, signUp, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};