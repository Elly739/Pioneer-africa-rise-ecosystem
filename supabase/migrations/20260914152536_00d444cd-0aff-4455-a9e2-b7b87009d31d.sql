-- 1. Discussion votes
CREATE TABLE public.discussion_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  discussion_id uuid REFERENCES public.discussions(id) ON DELETE CASCADE,
  reply_id uuid REFERENCES public.discussion_replies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT one_target CHECK (num_nonnulls(discussion_id, reply_id) = 1)
);
CREATE UNIQUE INDEX discussion_votes_disc_uniq ON public.discussion_votes(user_id, discussion_id) WHERE discussion_id IS NOT NULL;
CREATE UNIQUE INDEX discussion_votes_reply_uniq ON public.discussion_votes(user_id, reply_id) WHERE reply_id IS NOT NULL;
GRANT SELECT ON public.discussion_votes TO anon;
GRANT SELECT, INSERT, DELETE ON public.discussion_votes TO authenticated;
GRANT ALL ON public.discussion_votes TO service_role;
ALTER TABLE public.discussion_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "votes readable" ON public.discussion_votes FOR SELECT USING (true);
CREATE POLICY "vote own" ON public.discussion_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "unvote own" ON public.discussion_votes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 2. Accepted answer + office hours
ALTER TABLE public.discussions ADD COLUMN accepted_reply_id uuid REFERENCES public.discussion_replies(id) ON DELETE SET NULL;
ALTER TABLE public.discussions ADD COLUMN is_office_hours boolean NOT NULL DEFAULT false;
ALTER TABLE public.discussions ADD COLUMN office_hours_at timestamptz;

-- 3. Reports
CREATE TABLE public.content_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('project','discussion','reply')),
  target_id uuid NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','dismissed')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.content_reports TO authenticated;
GRANT ALL ON public.content_reports TO service_role;
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "report own insert" ON public.content_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "reporter or staff read" ON public.content_reports FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
CREATE POLICY "staff update" ON public.content_reports FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
CREATE TRIGGER content_reports_updated_at BEFORE UPDATE ON public.content_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Verified partners
ALTER TABLE public.profiles ADD COLUMN partner_verified boolean NOT NULL DEFAULT false;

-- 5. Project milestones
CREATE TABLE public.project_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  happened_on date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.project_milestones TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_milestones TO authenticated;
GRANT ALL ON public.project_milestones TO service_role;
ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "milestones readable" ON public.project_milestones FOR SELECT USING (true);
CREATE POLICY "milestones owner write" ON public.project_milestones FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid()));
CREATE POLICY "milestones owner update" ON public.project_milestones FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "milestones owner delete" ON public.project_milestones FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 6. Course cohorts
CREATE TABLE public.course_cohorts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  enroll_deadline date,
  capacity integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.course_cohorts TO anon;
GRANT SELECT ON public.course_cohorts TO authenticated;
GRANT ALL ON public.course_cohorts TO service_role;
ALTER TABLE public.course_cohorts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cohorts readable" ON public.course_cohorts FOR SELECT USING (true);
CREATE POLICY "cohorts staff manage" ON public.course_cohorts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'teacher'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'teacher'));
ALTER TABLE public.enrollments ADD COLUMN cohort_id uuid REFERENCES public.course_cohorts(id) ON DELETE SET NULL;

-- 7. Course assignments
CREATE TABLE public.course_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  prompt text NOT NULL,
  rubric text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.course_assignments TO anon;
GRANT SELECT ON public.course_assignments TO authenticated;
GRANT ALL ON public.course_assignments TO service_role;
ALTER TABLE public.course_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assignments readable" ON public.course_assignments FOR SELECT USING (true);
CREATE POLICY "assignments staff manage" ON public.course_assignments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'teacher'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'teacher'));

CREATE TABLE public.assignment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.course_assignments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  response text NOT NULL,
  ai_score integer,
  ai_feedback text,
  graded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX assignment_submissions_uniq ON public.assignment_submissions(assignment_id, user_id);
GRANT SELECT, INSERT, UPDATE ON public.assignment_submissions TO authenticated;
GRANT ALL ON public.assignment_submissions TO service_role;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own submissions read" ON public.assignment_submissions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'teacher'));
CREATE POLICY "own submissions insert" ON public.assignment_submissions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own submissions update" ON public.assignment_submissions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER assignment_submissions_updated_at BEFORE UPDATE ON public.assignment_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Public certificate verification
CREATE OR REPLACE FUNCTION public.verify_certificate(_code text)
RETURNS TABLE(code text, holder_name text, course_title text, issued_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT c.code, p.display_name, co.title, c.issued_at
  FROM public.certificates c
  JOIN public.profiles p ON p.id = c.user_id
  JOIN public.courses co ON co.id = c.course_id
  WHERE upper(c.code) = upper(_code)
  LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.verify_certificate(text) TO anon, authenticated;