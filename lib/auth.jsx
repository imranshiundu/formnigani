'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { USE_SUPABASE, getBrowser } from './db/client';

const Ctx = createContext({ active: false });
export const useAuth = () => useContext(Ctx);

// When Supabase env is missing this provider is inert and the app keeps its
// local guest flow. When configured, it owns session + profile.
export function AuthProvider({ children }) {
  const [sbUser, setSbUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(USE_SUPABASE);

  useEffect(() => {
    if (!USE_SUPABASE) {
      setLoading(false);
      return;
    }
    const sb = getBrowser();
    sb.auth.getSession().then(({ data }) => {
      setSbUser(data.session?.user || null);
      setLoading(false);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => setSbUser(session?.user || null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const refreshProfile = async (uid) => {
    const id = uid || sbUser?.id;
    if (!id) {
      setProfile(null);
      return null;
    }
    const { data } = await getBrowser().from('profiles').select('*').eq('id', id).single();
    setProfile(data || null);
    return data || null;
  };

  useEffect(() => {
    if (!USE_SUPABASE || !sbUser) {
      if (!sbUser) setProfile(null);
      return;
    }
    refreshProfile(sbUser.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sbUser]);

  const signUpEmail = async (email, password, name) => {
    const { data, error } = await getBrowser().auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) throw error;
    return data;
  };
  const signInEmail = async (email, password) => {
    const { data, error } = await getBrowser().auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };
  const signInGoogle = async () => {
    const { error } = await getBrowser().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) throw error;
  };
  const signOut = async () => {
    if (USE_SUPABASE) await getBrowser().auth.signOut();
    setSbUser(null);
    setProfile(null);
  };
  const saveProfile = async (patch) => {
    if (!sbUser) return null;
    const { data, error } = await getBrowser().from('profiles').update(patch).eq('id', sbUser.id).select().single();
    if (error) throw error;
    setProfile(data);
    return data;
  };
  const changePassword = async (newPassword) => {
    const { error } = await getBrowser().auth.updateUser({ password: newPassword });
    if (error) throw error;
  };
  const changeEmail = async (newEmail) => {
    const { error } = await getBrowser().auth.updateUser({ email: newEmail });
    if (error) throw error;
  };

  return (
    <Ctx.Provider value={{ active: USE_SUPABASE, sbUser, profile, loading, signUpEmail, signInEmail, signInGoogle, signOut, refreshProfile, saveProfile, changePassword, changeEmail }}>
      {children}
    </Ctx.Provider>
  );
}
