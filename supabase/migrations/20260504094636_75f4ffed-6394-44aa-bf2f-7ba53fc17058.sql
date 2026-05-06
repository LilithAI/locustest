-- Step 1: Add scoped admin role values to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'opportunities_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'waitlist_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'bar_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'broadcast_admin';