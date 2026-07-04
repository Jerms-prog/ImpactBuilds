// =============================================
//   SUPABASE CONFIGURATION
//   Fill in your credentials from:
//   https://app.supabase.com → your project → Settings → API
// =============================================

const SUPABASE_URL  = 'https://yflzyfuqzqsdeyoaljwx.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmbHp5ZnVxenFzZGV5b2Fsand4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MzIwNTQsImV4cCI6MjA5ODUwODA1NH0.e3xqwT7SdH3DXbJx36buc7sEdOKTmRmu8Sji1xJSTRg';

window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    storage: window.sessionStorage,
    storageKey: 'ib-session',
    persistSession: true,
    autoRefreshToken: true,
  }
});
