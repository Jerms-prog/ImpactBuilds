/* =============================================
   IMPACT BUILDS — SHARED ADMIN SCRIPT
   admin/admin.js
   Back-end: Supabase (PostgreSQL + Auth)
   ============================================= */
'use strict';

/* ---- XSS sanitizer ---- */
function sanitize(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(String(str)));
  return d.innerHTML;
}

/* ---- Unique ID ---- */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/* ---- Format date (short) ---- */
function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

/* =============================================
   AUTH — Supabase email/password auth
   ============================================= */
const AUTH = {
  _user: null,

  /* Fetch the admin email whitelist from the settings table */
  async _getAdminEmails() {
    try {
      const { data } = await supabase.from('settings')
        .select('setting_value').eq('setting_key', 'admin_emails').maybeSingle();
      if (data && Array.isArray(data.setting_value)) return data.setting_value;
    } catch (_) {}
    return [];
  },

  async _isAdmin(email) {
    const list = await this._getAdminEmails();
    return list.map(e => e.toLowerCase()).includes(email.toLowerCase());
  },

  async login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, message: error.message };

    const allowed = await this._isAdmin(data.user.email);
    if (!allowed) {
      await supabase.auth.signOut();
      return { ok: false, message: 'This account does not have admin access.' };
    }

    /* Mark their community profile as staff */
    await supabase.from('profiles').update({ is_staff: true }).eq('user_id', data.user.id);

    this._user = { email: data.user.email, displayName: data.user.email.split('@')[0], role: 'admin' };
    return { ok: true, user: this._user };
  },

  async logout() {
    try { await supabase.auth.signOut(); } catch (e) {}
    try {
      const k = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
      if (k) localStorage.removeItem(k);
    } catch (e) {}
    window.location.replace('login.html');
  },

  getUser() { return this._user; },

  async guard(redirect = true) {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      const allowed = await this._isAdmin(data.session.user.email);
      if (allowed) {
        /* Keep is_staff in sync each session */
        await supabase.from('profiles').update({ is_staff: true }).eq('user_id', data.session.user.id);
        this._user = { email: data.session.user.email, displayName: data.session.user.email.split('@')[0], role: 'admin' };
        return true;
      }
      /* Valid session but not an admin — sign them out silently */
      await supabase.auth.signOut();
    }
    if (redirect) window.location.href = 'login.html';
    return false;
  },

  async changePassword(currentPassword, newPassword) {
    const { data: sd } = await supabase.auth.getSession();
    if (!sd.session) return { ok: false, message: 'Not authenticated.' };
    const { error: ve } = await supabase.auth.signInWithPassword({ email: sd.session.user.email, password: currentPassword });
    if (ve) return { ok: false, message: 'Current password is incorrect.' };
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  }
};

/* =============================================
   CMS — Supabase database CRUD
   ============================================= */
const CMS = {

  /* ---- Notes ---- */
  async getNotes() {
    const { data } = await supabase.from('notes').select('*').order('date', { ascending: false });
    return (data || []).map(r => ({ ...r, featuredImage: r.featured_image }));
  },
  async getNote(id) {
    const { data } = await supabase.from('notes').select('*').eq('id', id).single();
    return data ? { ...data, featuredImage: data.featured_image } : null;
  },
  async saveNote(note) {
    const row = {
      id:             note.id || uid(),
      title:          note.title,
      content:        note.content,
      category:       note.category,
      status:         note.status,
      featured_image: note.featuredImage || note.featured_image || null,
      date:           note.date || new Date().toISOString()
    };
    const { error } = await supabase.from('notes').upsert(row, { onConflict: 'id' });
    return { ok: !error, error, message: error?.message };
  },
  async deleteNote(id) {
    const { error } = await supabase.from('notes').delete().eq('id', id);
    return { ok: !error };
  },
  async toggleNoteStatus(id) {
    const { data } = await supabase.from('notes').select('status').eq('id', id).single();
    const newStatus = (data?.status === 'Published') ? 'Draft' : 'Published';
    await supabase.from('notes').update({ status: newStatus }).eq('id', id);
    return newStatus;
  },

  /* ---- Media ---- */
  async getMedia() {
    const { data } = await supabase.from('media').select('*').order('created_at', { ascending: false });
    return data || [];
  },
  async getMediaItem(id) {
    const { data } = await supabase.from('media').select('*').eq('id', id).single();
    return data || null;
  },
  async saveMedia(item) {
    const row = {
      id:       item.id || uid(),
      filename: item.filename,
      data:     item.data,
      type:     item.type,
      size:     item.size || 0,
      date:     item.date || new Date().toISOString()
    };
    const { error } = await supabase.from('media').upsert(row, { onConflict: 'id' });
    return { ok: !error, message: error?.message };
  },
  async deleteMedia(id) {
    const { error } = await supabase.from('media').delete().eq('id', id);
    return { ok: !error };
  },

  /* ---- Messages ---- */
  async getMessages() {
    const { data } = await supabase.from('messages').select('*').order('date', { ascending: false });
    return (data || []).map(r => ({ ...r, read: r.is_read }));
  },
  async getMessage(id) {
    const { data } = await supabase.from('messages').select('*').eq('id', id).single();
    return data ? { ...data, read: data.is_read } : null;
  },
  async markRead(id) {
    await supabase.from('messages').update({ is_read: true }).eq('id', id);
    return { ok: true };
  },
  async markAllRead() {
    await supabase.from('messages').update({ is_read: true }).eq('is_read', false);
    return { ok: true };
  },
  async deleteMessage(id) {
    const { error } = await supabase.from('messages').delete().eq('id', id);
    return { ok: !error };
  },
  async getUnreadCount() {
    const { count } = await supabase.from('messages').select('*', { count: 'exact', head: true }).eq('is_read', false);
    return count || 0;
  },

  /* ---- Stats ---- */
  async getStats() {
    const [total, published, drafts, totalMedia, unread, posts, members] = await Promise.all([
      supabase.from('notes').select('*', { count: 'exact', head: true }),
      supabase.from('notes').select('*', { count: 'exact', head: true }).eq('status', 'Published'),
      supabase.from('notes').select('*', { count: 'exact', head: true }).eq('status', 'Draft'),
      supabase.from('media').select('*', { count: 'exact', head: true }),
      supabase.from('messages').select('*', { count: 'exact', head: true }).eq('is_read', false),
      supabase.from('posts').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
    ]);
    return {
      totalNotes:     total.count      || 0,
      publishedNotes: published.count  || 0,
      draftNotes:     drafts.count     || 0,
      totalMedia:     totalMedia.count || 0,
      unreadMessages: unread.count     || 0,
      totalPosts:     posts.count      || 0,
      totalMembers:   members.count    || 0,
    };
  },

  async seedIfEmpty() {
    const { count } = await supabase.from('notes').select('*', { count: 'exact', head: true });
    if (count > 0) return;
    await supabase.from('notes').insert([
      { id: uid(), title: 'Welcome to Impact Builds!', content: 'Our team is hard at work developing the game. Stay tuned for updates!', category: 'General', status: 'Published', date: new Date().toISOString() },
      { id: uid(), title: 'Building the World', content: 'This week we focused on the city layout and terrain generation systems. Exciting progress!', category: 'Features', status: 'Published', date: new Date(Date.now() - 86400000 * 3).toISOString() },
      { id: uid(), title: 'Disaster AI Design Notes', content: 'Early notes on how we are designing flood and earthquake simulation mechanics.', category: 'Updates', status: 'Draft', date: new Date(Date.now() - 86400000 * 7).toISOString() },
    ]);
  },

  async clearAll() {
    await Promise.all([
      supabase.from('notes').delete().neq('id', ''),
      supabase.from('media').delete().neq('id', ''),
      supabase.from('messages').delete().neq('id', ''),
    ]);
    return { ok: true };
  },

  /* ---- Settings ---- */
  async getSettings() {
    const { data } = await supabase.from('settings').select('setting_key, setting_value');
    const out = {};
    (data || []).forEach(r => { out[r.setting_key] = r.setting_value; });
    return out;
  },
  async saveSettings(key, value) {
    const { error } = await supabase.from('settings').upsert({ setting_key: key, setting_value: value }, { onConflict: 'setting_key' });
    return { ok: !error, message: error?.message };
  },

  /* ---- Team members ---- */
  async getTeam() {
    const { data } = await supabase.from('team_members').select('*').order('sort_order', { ascending: true });
    return data || [];
  },
  async saveTeamMember(member) {
    const row = {
      id:         member.id || uid(),
      name:       member.name,
      lead_role:  member.leadRole || null,
      roles:      member.roles || [],
      avatar_url: member.avatarUrl || null,
      sort_order: member.sortOrder ?? 0
    };
    const { error } = await supabase.from('team_members').upsert(row, { onConflict: 'id' });
    return { ok: !error, message: error?.message };
  },
  async deleteTeamMember(id) {
    const { error } = await supabase.from('team_members').delete().eq('id', id);
    return { ok: !error };
  },
  async uploadTeamPhoto(id, file) {
    const ext  = file.name.split('.').pop();
    const path = `team/${id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('team-photos').upload(path, file);
    if (upErr) return { ok: false, message: upErr.message };
    const { data } = supabase.storage.from('team-photos').getPublicUrl(path);
    return { ok: true, url: data.publicUrl };
  },

  /* ---- FAQ items ---- */
  async getFAQ() {
    const { data } = await supabase.from('faq_items').select('*').order('sort_order', { ascending: true });
    return data || [];
  },
  async saveFAQItem(item) {
    const row = {
      id:         item.id || uid(),
      question:   item.question,
      answer:     item.answer,
      sort_order: item.sortOrder ?? 0
    };
    const { error } = await supabase.from('faq_items').upsert(row, { onConflict: 'id' });
    return { ok: !error, message: error?.message };
  },
  async deleteFAQItem(id) {
    const { error } = await supabase.from('faq_items').delete().eq('id', id);
    return { ok: !error };
  },

  /* ---- System requirements (stored in settings) ---- */
  async getSystemRequirements() {
    const { data } = await supabase.from('settings').select('setting_value').eq('setting_key', 'system_requirements').maybeSingle();
    return Array.isArray(data?.setting_value) ? data.setting_value : [];
  },
  async saveSystemRequirements(rows) {
    const { error } = await supabase.from('settings')
      .upsert({ setting_key: 'system_requirements', setting_value: rows }, { onConflict: 'setting_key' });
    return { ok: !error, message: error?.message };
  }
};

/* =============================================
   DOM ready — logout + unread badge
   ============================================= */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-logout]').forEach(btn => {
    btn.addEventListener('click', (e) => { e.preventDefault(); AUTH.logout(); });
  });

  /* Force fresh load when opening the public site from admin */
  document.querySelectorAll('a[href="../index.html"][target="_blank"]').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      window.open('../index.html?_=' + Date.now(), '_blank');
    });
  });

  const badgeEls = document.querySelectorAll('[data-msg-badge]');
  if (badgeEls.length > 0) {
    CMS.getUnreadCount().then(count => {
      if (count > 0) {
        badgeEls.forEach(el => {
          const b = document.createElement('span');
          b.className = 'sidebar-badge';
          b.textContent = count > 99 ? '99+' : count;
          el.appendChild(b);
        });
      }
    }).catch(() => {});
  }
});
