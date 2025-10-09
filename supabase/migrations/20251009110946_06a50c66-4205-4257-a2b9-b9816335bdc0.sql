-- Add curriculum support to profiles and tutor_profiles tables

-- Add curriculum column to profiles
ALTER TABLE public.profiles 
ADD COLUMN curriculum text;

-- Add curriculum column to tutor_profiles
ALTER TABLE public.tutor_profiles 
ADD COLUMN curriculum text[];