
DO $$
DECLARE
  v_uid uuid;
  v_email text := 'admin@locus.legal';
BEGIN
  -- Skip if profile with username 'admin' already exists
  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = 'admin') THEN
    RAISE NOTICE 'admin profile already exists, skipping';
    RETURN;
  END IF;

  -- Skip if auth user with this email already exists
  SELECT id INTO v_uid FROM auth.users WHERE email = v_email LIMIT 1;

  IF v_uid IS NULL THEN
    v_uid := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email,
      encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_uid,
      'authenticated',
      'authenticated',
      v_email,
      crypt('Admin2026!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"display_name":"admin"}'::jsonb,
      now(), now(), '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), v_uid, jsonb_build_object('sub', v_uid::text, 'email', v_email), 'email', v_uid::text, now(), now(), now());
  END IF;

  -- Ensure profile has username 'admin'
  UPDATE public.profiles SET username = 'admin', display_name = 'admin' WHERE id = v_uid;
  IF NOT FOUND THEN
    INSERT INTO public.profiles (id, username, display_name) VALUES (v_uid, 'admin', 'admin');
  END IF;

  -- Grant admin role
  INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, 'admin'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;
