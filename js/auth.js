import { supabase } from '../supabase-config.js';
import { extractSessionFromUrl, getAuthRedirectUrl } from './auth-helpers.js';

export { extractSessionFromUrl, getAuthRedirectUrl };

export const authConfig = {
  get configured() { return Boolean(supabase); },
  get loadError() { return null; }
};

function getSupabaseClient() {
  return supabase;
}

export async function initializeAuth() {
  const supabaseClient = getSupabaseClient();
  if (supabaseClient) return { provider: 'supabase', auth: supabaseClient.auth };
  return { provider: 'supabase', auth: null };
}

export async function getSession() {
  const supabaseClient = getSupabaseClient();
  if (!supabaseClient) {
    return { session: null, error: new Error('Supabase is not configured.') };
  }

  const { data: { session }, error } = await supabaseClient.auth.getSession();
  return { session: session ? { user: session.user } : null, error };
}

export async function signInWithGoogle() {
  const supabaseClient = getSupabaseClient();
  if (!supabaseClient) {
    return { redirecting: false, user: null, error: new Error('Supabase is not configured. Check your project URL and anonymous key.') };
  }

  try {
    const redirectTo = getAuthRedirectUrl();
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo }
    });
    return { redirecting: !error, user: null, error };
  } catch (error) {
    return { user: null, error };
  }
}

export async function signOut() {
  const supabaseClient = getSupabaseClient();
  if (supabaseClient) {
    const userId = supabaseClient.auth.user()?.id;
    await supabaseClient.auth.signOut();
    if (userId) localStorage.removeItem(`opta-profile:${userId}`);
    sessionStorage.removeItem('opta-preview-session');
    sessionStorage.removeItem('opta-preview-profile');
    window.location.href = 'index.html';
    return;
  }

  sessionStorage.removeItem('opta-preview-session');
  sessionStorage.removeItem('opta-preview-profile');
  window.location.href = 'index.html';
}

export async function getProfile(userId) {
  const supabaseClient = getSupabaseClient();
  if (supabaseClient && userId) {
    try {
      const { data, error } = await supabaseClient.from('profiles').select('*').eq('id', userId).maybeSingle();
      if (error) return { profile: null, error };
      return { profile: data ? { id: data.id, ...data } : null, error: null };
    } catch (error) {
      return { profile: null, error };
    }
  }

  if (!userId) return { profile: null, error: null };
  const stored = JSON.parse(localStorage.getItem(`opta-profile:${userId}`) || 'null');
  return { profile: stored || null, error: null };
}

function readStoredLessons() {
  try {
    const raw = localStorage.getItem('learn-fola-shared-lessons');
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

export async function getSharedLessons() {
  const supabaseClient = getSupabaseClient();
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from('lessons').select('*').order('updated_at', { ascending: false });
      const lessons = data || [];
      if (lessons.length) localStorage.setItem('learn-fola-shared-lessons', JSON.stringify(lessons));
      return { lessons, error, local: false };
    } catch (error) {
      return { lessons: readStoredLessons(), error, local: true };
    }
  }

  return { lessons: readStoredLessons(), error: null, local: true };
}

export async function saveSharedLesson(lesson) {
  const supabaseClient = getSupabaseClient();
  const normalized = { ...lesson, updated_at: new Date().toISOString() };
  const current = readStoredLessons();
  const merged = [...current.filter((item) => item.id !== normalized.id), normalized];
  localStorage.setItem('learn-fola-shared-lessons', JSON.stringify(merged));

  if (supabaseClient && normalized?.id) {
    try {
      const { data, error } = await supabaseClient.from('lessons').upsert({ ...normalized, id: String(normalized.id) }).select().single();
      return { lesson: data || normalized, error, local: false };
    } catch (error) {
      return { lesson: normalized, error, local: true };
    }
  }

  return { lesson: normalized, error: null, local: true };
}

export async function uploadLessonVideo(file) {
  const supabaseClient = getSupabaseClient();
  const user = supabaseClient?.auth?.user?.() || null;

  if (supabaseClient && user) {
    try {
      const extension = (file.name?.split('.').pop() || 'mp4').toLowerCase();
      const safeName = `${user.id}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extension}`;
      const filePath = `teacher-videos/${user.id}/${safeName}`;
      const { error } = await supabaseClient.storage.from('teacher-videos').upload(filePath, file, { upsert: true });
      if (error) return { url: '', error };
      const { data } = supabaseClient.storage.from('teacher-videos').getPublicUrl(filePath);
      return { url: data?.publicUrl || '', error: null };
    } catch (error) {
      return { url: '', error };
    }
  }

  return { url: '', error: new Error('You must be signed in to upload a video.') };
}

export async function saveOnboarding(profile) {
  const supabaseClient = getSupabaseClient();
  if (supabaseClient && profile?.id) {
    try {
      const payload = { ...profile, updated_at: new Date().toISOString() };
      const { data, error } = await supabaseClient.from('profiles').upsert(payload, { onConflict: 'id' }).select().single();
      return { profile: data || payload, error };
    } catch (error) {
      return { profile, error };
    }
  }

  if (!profile?.id) {
    localStorage.setItem(`opta-profile:guest`, JSON.stringify({ ...profile, updated_at: new Date().toISOString() }));
    return { profile, error: null, local: true };
  }

  localStorage.setItem(`opta-profile:${profile.id}`, JSON.stringify({ ...profile, updated_at: new Date().toISOString() }));
  return { profile, error: null, local: true };
}

export function localProfile(user) {
  const userId = user?.uid || user?.id || 'guest';
  const saved = JSON.parse(localStorage.getItem(`opta-profile:${userId}`) || 'null');
  const avatarUrl = user?.photoURL || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || user?.avatar_url || saved?.avatar_url || '';
  const fullName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.displayName || user?.full_name || saved?.full_name || '';
  return saved ? { ...saved, full_name: fullName || saved.full_name || '', avatar_url: avatarUrl || saved.avatar_url || '' } : {
    id: userId,
    full_name: fullName,
    email: user?.email || '',
    avatar_url: avatarUrl,
    requested_role: null,
    grade_id: null,
    role: 'student'
  };
}
