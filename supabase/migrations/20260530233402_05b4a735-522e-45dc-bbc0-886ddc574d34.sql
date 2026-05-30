-- Ensure pgcrypto is available for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Insert the user into auth.users if it doesn't already exist
DO $$
DECLARE
    user_id UUID := gen_random_uuid();
BEGIN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'viniciusbataglia500@gmail.com') THEN
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            recovery_sent_at,
            last_sign_in_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            confirmation_token,
            email_change,
            email_change_token_new,
            recovery_token
        )
        VALUES (
            '00000000-0000-0000-0000-000000000000',
            user_id,
            'authenticated',
            'authenticated',
            'viniciusbataglia500@gmail.com',
            crypt('001811', gen_salt('bf')),
            now(),
            now(),
            now(),
            '{"provider":"email","providers":["email"]}',
            '{"name":"Melissa"}',
            now(),
            now(),
            '',
            '',
            '',
            ''
        );

        -- Also create an identity for the user
        INSERT INTO auth.identities (
            id,
            user_id,
            identity_data,
            provider,
            provider_id,
            last_sign_in_at,
            created_at,
            updated_at
        )
        VALUES (
            gen_random_uuid(),
            user_id,
            format('{"sub":"%s","email":"%s"}', user_id, 'viniciusbataglia500@gmail.com')::jsonb,
            'email',
            'viniciusbataglia500@gmail.com',
            now(),
            now(),
            now()
        );
    END IF;
END $$;
