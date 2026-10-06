-- Direct messaging: one conversation per pair of people, participant read markers, and messages.

ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'direct_message';

CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a uuid NOT NULL,
  user_b uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT conversations_order_check CHECK (user_a < user_b),
  CONSTRAINT conversations_pair_unique UNIQUE (user_a, user_b)
);

CREATE TABLE public.conversation_participants (
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX messages_conversation_created_idx ON public.messages (conversation_id, created_at);
CREATE INDEX conversation_participants_user_idx ON public.conversation_participants (user_id, conversation_id);
CREATE INDEX conversations_last_message_idx ON public.conversations (last_message_at DESC);

GRANT SELECT ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
GRANT SELECT, UPDATE ON public.conversation_participants TO authenticated;
GRANT ALL ON public.conversation_participants TO service_role;
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Participation check that does not recurse through RLS on conversation_participants.
CREATE OR REPLACE FUNCTION public.is_conversation_participant(_conversation_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = _conversation_id AND user_id = _user_id
  );
$$;

CREATE POLICY conversations_participant_read
  ON public.conversations FOR SELECT TO authenticated
  USING (public.is_conversation_participant(id, auth.uid()));

CREATE POLICY participants_own_read
  ON public.conversation_participants FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY participants_own_update
  ON public.conversation_participants FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY messages_participant_read
  ON public.messages FOR SELECT TO authenticated
  USING (public.is_conversation_participant(conversation_id, auth.uid()));

CREATE POLICY messages_participant_insert
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND public.is_conversation_participant(conversation_id, auth.uid()));

-- Start a conversation, or return the existing one for this pair. Creates both participant rows.
CREATE OR REPLACE FUNCTION public.start_or_open_conversation(_other_user uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a uuid;
  b uuid;
  conv uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF _other_user IS NULL OR _other_user = auth.uid() THEN RAISE EXCEPTION 'Cannot message yourself'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _other_user) THEN RAISE EXCEPTION 'No such member'; END IF;

  IF auth.uid() < _other_user THEN a := auth.uid(); b := _other_user; ELSE a := _other_user; b := auth.uid(); END IF;

  SELECT id INTO conv FROM public.conversations WHERE user_a = a AND user_b = b;
  IF conv IS NULL THEN
    INSERT INTO public.conversations (user_a, user_b) VALUES (a, b) RETURNING id INTO conv;
    INSERT INTO public.conversation_participants (conversation_id, user_id) VALUES (conv, a), (conv, b);
  END IF;
  RETURN conv;
END $$;

GRANT EXECUTE ON FUNCTION public.start_or_open_conversation(uuid) TO authenticated;

-- Inbox summary: one row per conversation for the signed-in member, with unread count.
CREATE OR REPLACE FUNCTION public.conversation_summaries()
RETURNS TABLE (
  conversation_id uuid,
  other_user_id uuid,
  other_name text,
  other_avatar text,
  last_message_at timestamptz,
  last_message_body text,
  last_message_sender_id uuid,
  unread_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id,
         o.uid,
         pr.display_name,
         pr.avatar_url,
         c.last_message_at,
         m.body,
         m.sender_id,
         (SELECT count(*)
            FROM public.messages mm
           WHERE mm.conversation_id = c.id
             AND mm.sender_id <> auth.uid()
             AND mm.created_at > p.last_read_at) AS unread_count
    FROM public.conversations c
    JOIN public.conversation_participants p ON p.conversation_id = c.id AND p.user_id = auth.uid()
    CROSS JOIN LATERAL (SELECT CASE WHEN c.user_a = auth.uid() THEN c.user_b ELSE c.user_a END AS uid) o
    LEFT JOIN public.profiles pr ON pr.id = o.uid
    LEFT JOIN LATERAL (
      SELECT body, sender_id FROM public.messages
       WHERE conversation_id = c.id ORDER BY created_at DESC, id DESC LIMIT 1
    ) m ON TRUE
   ORDER BY c.last_message_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.conversation_summaries() TO authenticated;

-- Keep the conversation list sorted by the newest message.
CREATE OR REPLACE FUNCTION public.touch_conversation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations SET last_message_at = NEW.created_at WHERE id = NEW.conversation_id;
  RETURN NEW;
END $$;

CREATE TRIGGER messages_touch_conversation
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.touch_conversation();

-- Notify the other person, using the same security-definer pattern as the other notification triggers.
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE other_id uuid; sender_name text;
BEGIN
  SELECT CASE WHEN user_a = NEW.sender_id THEN user_b ELSE user_a END INTO other_id
    FROM public.conversations WHERE id = NEW.conversation_id;
  IF other_id IS NULL OR other_id = NEW.sender_id THEN RETURN NEW; END IF;
  SELECT display_name INTO sender_name FROM public.profiles WHERE id = NEW.sender_id;
  INSERT INTO public.notifications(user_id, type, title, body, link)
  VALUES (other_id, 'direct_message', 'New message',
          COALESCE(sender_name, 'Someone') || ' sent you a message',
          '/inbox/' || NEW.conversation_id);
  RETURN NEW;
END $$;

CREATE TRIGGER messages_notify_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();