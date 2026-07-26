
-- profiles
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- preferences
CREATE TABLE public.user_preferences (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  silence_threshold_db NUMERIC NOT NULL DEFAULT -40,
  min_silence_ms INTEGER NOT NULL DEFAULT 800,
  default_export_format TEXT NOT NULL DEFAULT 'premiere',
  email_notifications BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_preferences TO authenticated;
GRANT ALL ON public.user_preferences TO service_role;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own prefs all" ON public.user_preferences FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- episodes
CREATE TABLE public.episodes (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  topic TEXT NOT NULL DEFAULT '',
  duration_seconds NUMERIC NOT NULL DEFAULT 0,
  audio_path TEXT,
  audio_mime TEXT,
  waveform_peaks JSONB,
  transcript_text TEXT,
  transcript_segments JSONB,
  analysis_status TEXT NOT NULL DEFAULT 'ready',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.episodes TO authenticated;
GRANT ALL ON public.episodes TO service_role;
ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own episodes all" ON public.episodes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX episodes_user_created_idx ON public.episodes(user_id, created_at DESC);

-- cuts
CREATE TABLE public.cuts (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id UUID NOT NULL REFERENCES public.episodes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_sec NUMERIC NOT NULL,
  end_sec NUMERIC NOT NULL,
  cut_type TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  accepted BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cuts TO authenticated;
GRANT ALL ON public.cuts TO service_role;
ALTER TABLE public.cuts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own cuts all" ON public.cuts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX cuts_episode_idx ON public.cuts(episode_id, start_sec);

-- chat threads
CREATE TABLE public.chat_threads (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL, -- 'support' | 'episode'
  episode_id UUID REFERENCES public.episodes(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Chat',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_threads TO authenticated;
GRANT ALL ON public.chat_threads TO service_role;
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own threads all" ON public.chat_threads FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX chat_threads_user_kind_idx ON public.chat_threads(user_id, kind);

-- chat messages
CREATE TABLE public.chat_messages (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'user' | 'assistant' | 'system'
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own msgs all" ON public.chat_messages FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX chat_messages_thread_idx ON public.chat_messages(thread_id, created_at);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_touch_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER touch_profiles BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
CREATE TRIGGER touch_prefs BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
CREATE TRIGGER touch_episodes BEFORE UPDATE ON public.episodes
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
CREATE TRIGGER touch_threads BEFORE UPDATE ON public.chat_threads
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- new user handler: create profile + prefs
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles(id, display_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)))
    ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_preferences(user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
