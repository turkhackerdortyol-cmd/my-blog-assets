import { supabase } from "./supabaseClient.js";

let cachedProfile = null;

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function getCurrentProfile(forceRefresh = false) {
  if (cachedProfile && !forceRefresh) return cachedProfile;
  const session = await getSession();
  if (!session) {
    cachedProfile = null;
    return null;
  }
  const { data, error } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
  if (error) {
    cachedProfile = null;
    return null;
  }
  cachedProfile = data;
  return data;
}

export function clearProfileCache() {
  cachedProfile = null;
}

export async function signUp({ username, email, password }) {
  username = username.trim();
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    throw new Error("Kullanıcı adı 3-20 karakter olmalı ve sadece harf, rakam, alt çizgi içerebilir.");
  }
  // Kullanıcı adı benzersizliğini önceden kontrol et
  const { data: existing } = await supabase.from("profiles").select("id").eq("username", username).maybeSingle();
  if (existing) throw new Error("Bu kullanıcı adı zaten alınmış.");

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } },
  });
  if (error) throw error;
  return data;
}

// Giriş: kullanıcı hem e-posta hem de kullanıcı adıyla girebilir
export async function signIn({ identifier, password }) {
  identifier = identifier.trim();
  let email = identifier;

  const looksLikeEmail = /.+@.+\..+/.test(identifier);
  if (!looksLikeEmail) {
    const { data, error } = await supabase.rpc("get_email_by_username", { p_username: identifier });
    if (error || !data) throw new Error("Kullanıcı adı veya şifre hatalı.");
    email = data;
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error("Kullanıcı adı/e-posta veya şifre hatalı.");

  // Ban kontrolü
  const { data: profile } = await supabase.from("profiles").select("banned").eq("id", data.user.id).single();
  if (profile?.banned) {
    await supabase.auth.signOut();
    throw new Error("Bu hesap askıya alınmış.");
  }

  clearProfileCache();
  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
  clearProfileCache();
}

export async function sendPasswordReset(email) {
  const redirectTo = location.origin + "/?reset=1";
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
}

export async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

supabase.auth.onAuthStateChange(() => {
  clearProfileCache();
});
