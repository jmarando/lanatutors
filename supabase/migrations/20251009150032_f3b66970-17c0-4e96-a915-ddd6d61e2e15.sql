-- Grant admin roles to specified users
DO $$
BEGIN
  INSERT INTO public.user_roles (user_id, role) VALUES 
    ('83aee4d3-6ffc-4456-a4cd-c9869a10df9b', 'admin'),
    ('0fff2f81-b6eb-4bbd-bad9-3c96eb4f59dd', 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;