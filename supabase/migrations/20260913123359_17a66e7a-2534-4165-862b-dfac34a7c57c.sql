CREATE TABLE public.badges (
  code text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL DEFAULT 'award',
  tier text NOT NULL DEFAULT 'bronze',
  sort_order int NOT NULL DEFAULT 0
);
GRANT SELECT ON public.badges TO anon, authenticated;
GRANT ALL ON public.badges TO service_role;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Badges are public" ON public.badges FOR SELECT USING (true);

CREATE TABLE public.user_badges (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_code text NOT NULL REFERENCES public.badges(code) ON DELETE CASCADE,
  earned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, badge_code)
);
GRANT SELECT ON public.user_badges TO anon, authenticated;
GRANT ALL ON public.user_badges TO service_role;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User badges are public" ON public.user_badges FOR SELECT USING (true);

INSERT INTO public.badges (code, name, description, icon, tier, sort_order) VALUES
  ('first_project','First Build','Published your first project in the Innovation Hub','rocket','bronze',10),
  ('first_certificate','Certified','Earned your first course certificate','graduation-cap','bronze',20),
  ('first_discussion','Conversation Starter','Started your first community discussion','message-square','bronze',30),
  ('first_reply','Helping Hand','Posted your first reply in the community','hand-heart','bronze',40),
  ('first_submission','Challenger','Submitted your first challenge entry','trophy','silver',50),
  ('ten_likes','Crowd Favourite','Your projects received 10 likes','heart','silver',60),
  ('first_interview','Interview Ready','Reached the interview stage on an application','briefcase','silver',70),
  ('first_offer','Hired','Received your first offer through Pioneer','sparkles','gold',80),
  ('streak_7','Consistent','Kept a 7-day learning streak','flame','silver',90);

CREATE OR REPLACE FUNCTION public.grant_badge(_user_id uuid, _code text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b public.badges%ROWTYPE; inserted int;
BEGIN
  IF _user_id IS NULL THEN RETURN; END IF;
  SELECT * INTO b FROM public.badges WHERE code = _code;
  IF b.code IS NULL THEN RETURN; END IF;
  INSERT INTO public.user_badges(user_id, badge_code) VALUES (_user_id, _code)
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS inserted = ROW_COUNT;
  IF inserted > 0 THEN
    INSERT INTO public.notifications(user_id, type, title, body, link)
    VALUES (_user_id, 'system', 'Badge unlocked: ' || b.name, b.description, '/leaderboard');
    PERFORM public.award_xp(_user_id, 20);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.badge_on_project() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM public.grant_badge(NEW.user_id, 'first_project'); RETURN NEW; END $$;
CREATE TRIGGER badge_project AFTER INSERT ON public.projects FOR EACH ROW EXECUTE FUNCTION public.badge_on_project();

CREATE OR REPLACE FUNCTION public.badge_on_certificate() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM public.grant_badge(NEW.user_id, 'first_certificate'); RETURN NEW; END $$;
CREATE TRIGGER badge_certificate AFTER INSERT ON public.certificates FOR EACH ROW EXECUTE FUNCTION public.badge_on_certificate();

CREATE OR REPLACE FUNCTION public.badge_on_discussion() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM public.grant_badge(NEW.user_id, 'first_discussion'); RETURN NEW; END $$;
CREATE TRIGGER badge_discussion AFTER INSERT ON public.discussions FOR EACH ROW EXECUTE FUNCTION public.badge_on_discussion();

CREATE OR REPLACE FUNCTION public.badge_on_reply() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM public.grant_badge(NEW.user_id, 'first_reply'); RETURN NEW; END $$;
CREATE TRIGGER badge_reply AFTER INSERT ON public.discussion_replies FOR EACH ROW EXECUTE FUNCTION public.badge_on_reply();

CREATE OR REPLACE FUNCTION public.badge_on_submission() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM public.grant_badge(NEW.submitted_by, 'first_submission'); RETURN NEW; END $$;
CREATE TRIGGER badge_submission AFTER INSERT ON public.challenge_submissions FOR EACH ROW EXECUTE FUNCTION public.badge_on_submission();

CREATE OR REPLACE FUNCTION public.badge_on_project_like() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id uuid; total int;
BEGIN
  SELECT p.user_id INTO owner_id FROM public.projects p WHERE p.id = NEW.project_id;
  IF owner_id IS NULL THEN RETURN NEW; END IF;
  SELECT count(*) INTO total FROM public.project_likes l
    JOIN public.projects p ON p.id = l.project_id WHERE p.user_id = owner_id;
  IF total >= 10 THEN PERFORM public.grant_badge(owner_id, 'ten_likes'); END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER badge_project_like AFTER INSERT ON public.project_likes FOR EACH ROW EXECUTE FUNCTION public.badge_on_project_like();

CREATE OR REPLACE FUNCTION public.badge_on_application_status() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'interview' THEN PERFORM public.grant_badge(NEW.user_id, 'first_interview'); END IF;
  IF NEW.status = 'offer' THEN PERFORM public.grant_badge(NEW.user_id, 'first_offer'); END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER badge_application_status AFTER UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.badge_on_application_status();

CREATE OR REPLACE FUNCTION public.badge_on_streak() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.streak_days >= 7 THEN PERFORM public.grant_badge(NEW.user_id, 'streak_7'); END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER badge_streak AFTER UPDATE ON public.user_stats FOR EACH ROW EXECUTE FUNCTION public.badge_on_streak();

CREATE OR REPLACE VIEW public.leaderboard
WITH (security_invoker = true) AS
SELECT p.id AS user_id,
       p.display_name,
       p.avatar_url,
       p.headline,
       p.university,
       p.country,
       COALESCE(s.score, 0) AS score,
       COALESCE(s.projects_count, 0) AS projects_count,
       COALESCE(s.certificates_count, 0) AS certificates_count,
       COALESCE(st.level, 1) AS level,
       COALESCE(st.xp, 0) AS xp,
       (SELECT count(*) FROM public.user_badges ub WHERE ub.user_id = p.id) AS badge_count
FROM public.profiles p
LEFT JOIN public.innovation_scores s ON s.user_id = p.id
LEFT JOIN public.user_stats st ON st.user_id = p.id;
GRANT SELECT ON public.leaderboard TO anon, authenticated;
GRANT ALL ON public.leaderboard TO service_role;