-- December desk: a class the team opens on the desk (status `confirmed`, "running") stays readable like a class that takes
-- reservations (`active`). Without this, opening a class would take it off the public page and out of the student's and
-- the tutor's Bootcamp tabs, which read classes as the signed-in user. Archived classes stay hidden; admins keep their own
-- policy. Safe to run more than once.
DROP POLICY IF EXISTS "Anyone can view active classes" ON public.intensive_classes;
DROP POLICY IF EXISTS "Anyone can view active or running classes" ON public.intensive_classes;
CREATE POLICY "Anyone can view active or running classes" ON public.intensive_classes
  FOR SELECT USING (status IN ('active', 'confirmed'));
