-- event_templates: 日程入力テンプレート（リーダーのみ表示）
CREATE TABLE IF NOT EXISTS event_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('practice', 'match', 'event')),
  title TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  detail TEXT NOT NULL DEFAULT '',
  belongings TEXT NOT NULL DEFAULT '',
  start_time TEXT,
  end_time TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE event_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage event_templates"
  ON event_templates FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- デフォルトテンプレート
INSERT INTO event_templates (name, type, title, location, detail, belongings, start_time, end_time, sort_order)
VALUES
  ('通常練習（火木金）', 'practice', '練習', 'コート面', '', 'フットサルできる服、水筒、トレシュー、タオル、着替え', '15:15', '17:30', 0),
  ('土曜練習', 'practice', '練習', 'コート面', '', 'フットサルできる服、水筒、トレシュー、タオル、着替え', '12:30', '16:00', 1),
  ('試合', 'match', '', '', '', 'フットサルできる服、水筒、トレシュー、タオル、着替え、ユニフォーム', '', '', 2);
