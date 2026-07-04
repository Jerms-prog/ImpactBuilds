# Impact Builds — Claude Context

## What this project is
A capstone thesis promotional website for a 3D construction/disaster simulation game called **Impact Builds**. Pure HTML/CSS/JS frontend hosted on Vercel, backend is Supabase (Postgres + Auth + RLS). There is also a legacy Firebase config that is unused — ignore it.

GitHub repo: `https://github.com/Jerms-prog/ImpactBuilds.git`  
Vercel deployment: live from the GitHub repo (auto-deploys on push)

## Tech stack
- Pure HTML / CSS / JS — no frameworks, no build step
- Supabase JS v2 via CDN — accessed as `window.supabase` on community pages
- Supabase project URL: `https://yflzyfuqzqsdeyoaljwx.supabase.co`
- The anon key is in `supabase-config.js`
- Auth uses **sessionStorage** (not localStorage) for per-tab isolation — key: `ib-session`
- Git push: `git -c http.sslVerify=false push` (SSL cert issue on this machine)

## File map

```
index.html          — Main landing/promo page
style.css           — Main site styles
script.js           — Main site JS

auth.html           — Community login / sign-up
feed.html           — Community post feed
post.html           — Post detail + threaded comments
profile.html        — User profile page
community.css       — Shared styles for all community pages
supabase-config.js  — Creates window.supabase client

admin/
  login.html        — Admin panel login
  admin.js          — Shared admin auth guard + helpers (AUTH object)
  admin.css         — Admin panel styles
  dashboard.html    — Admin dashboard
  users.html        — Member management (edit, staff/mod toggle, delete)
  settings.html     — Admin whitelist + site settings
  notes.html        — Internal notes CMS
  media.html        — Media uploads
  messages.html     — Contact messages

supabase-setup.sql  — ALL the SQL for the project (run in Supabase SQL editor)
                      DO NOT commit this file (it's in .gitignore)
```

## Supabase database tables

| Table | Purpose |
|---|---|
| `profiles` | One row per user. Columns: `user_id`, `username`, `display_name`, `bio`, `avatar_url`, `is_staff` (bool), `is_moderator` (bool) |
| `posts` | Community posts. Columns: `id`, `user_id`, `title`, `content`, `category`, `is_announcement` (bool), `created_at` |
| `comments` | Post comments (threaded via `parent_id`). Columns: `id`, `post_id`, `user_id`, `parent_id`, `content`, `created_at` |
| `post_likes` | Likes on posts. Columns: `post_id`, `user_id` |
| `user_badges` | Badges awarded to users. Columns: `user_id`, `badge_id` |
| `settings` | Key-value site config. `admin_emails` key holds a JSONB array of staff emails |
| `mod_actions` | Activity log for admin/mod actions. Columns: `id`, `admin_user_id`, `action`, `target_username`, `created_at` |

## Auth roles
- `is_staff = true` → **Admin** badge in community, access to admin panel
- `is_moderator = true` → **Mod** badge in community, can delete any post/comment
- Normal users can only delete their own posts/comments

## Admin accounts
The admin panel uses the same Supabase Auth as the community. Each admin must:
1. Register on `auth.html` with their personal email
2. Their email must be in the `admin_emails` whitelist (in `settings` table) — this auto-sets `is_staff: true` on signup

Admin team emails:
- allenbicaldo@yahoo.com (already registered + is_staff set)
- benedictbalayan@gmail.com
- ryouxx0@gmail.com
- saballeguemickey@gmail.com

To add/verify the whitelist, run in Supabase SQL editor:
```sql
UPDATE public.settings
SET setting_value = '["allenbicaldo@yahoo.com","benedictbalayan@gmail.com","ryouxx0@gmail.com","saballeguemickey@gmail.com"]'::jsonb
WHERE setting_key = 'admin_emails';
```

To manually set is_staff for an existing account:
```sql
UPDATE public.profiles SET is_staff = true WHERE user_id = '<uuid>';
-- find the uuid: SELECT user_id FROM public.profiles WHERE username = 'theirusername';
```

## RLS policies that matter
- Users can only update their own profile row by default
- There is a policy **"Staff can update any profile"** that allows `is_staff = true` users to update any profile row — this is needed for the admin panel to work. If mod/staff toggling breaks, check this policy exists in Supabase Dashboard > Authentication > Policies > profiles table.

SQL to recreate it if missing:
```sql
CREATE POLICY "Staff can update any profile"
ON public.profiles FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND is_staff = true
  )
);
```

## Key behaviors

**Announcements**: Posts with `is_announcement = true` are pinned at the top of every category in the feed. Only staff can create them (checkbox appears in create-post modal for staff accounts).

**Category filter**: Feed has client-side AND server-side category filtering. Announcements bypass the category filter and always show.

**sessionStorage**: Switching to sessionStorage means each browser tab is independent. Opening a new tab won't auto-login. This is intentional.

**Mod actions log**: `logAction(action, targetUsername)` in `admin/users.html` writes to `mod_actions` table. Called on: staff toggle, mod toggle, delete user. Also called on profile edits via `saveMemberChanges`.

## What was completed (as of last session)
- [x] Full community platform: auth, feed, post detail, profile
- [x] Staff (Admin) badge + Moderator badge in feed, post, profile pages
- [x] Admin Users page: member cards, management modal, staff/mod toggles, delete with FK safety, activity log sidebar
- [x] Announcement posts (is_announcement column, staff-only checkbox, pinned in feed)
- [x] Category filter fix (server + client side)
- [x] Delete own posts/comments for users; delete any post/comment for mod/staff
- [x] Per-tab session isolation via sessionStorage
- [x] RLS policy for staff updating other profiles
- [x] Admin whitelist auto-sets is_staff on signup
- [x] 6 bugs fixed (signup race condition, profile insert error handling, delete error guard, FK cleanup on user delete, sessionStorage in logout, logAction on profile edit)

## Pending / known issues
- `ryouxx0@gmail.com` Supabase team invite is expired — resend it if they need dashboard access (doesn't affect admin panel login)
- All admins except Allen still need to create a community account at `auth.html` before they can use the admin panel
- `api/` folder contains PHP files from an earlier Firebase/PHP approach — these are unused and can be ignored or deleted
- `firebase-config.js` is unused (leftover from before Supabase migration) — safe to delete

## Git workflow
```bash
# Clone fresh
git clone https://github.com/Jerms-prog/ImpactBuilds.git
cd ImpactBuilds

# Push changes (SSL workaround needed on some machines)
git add .
git commit -m "your message"
git -c http.sslVerify=false push
```
