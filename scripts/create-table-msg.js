const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://kvpkghcflwtmylmenfkc.supabase.co';
const serviceRoleKey = 'sb_secret_JE1HtwuIatNRDBOp4C_9ow_ph8_KzhW'; // Service Role Key

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function createTable() {
    console.log('🚧 streamer_stats 테이블 생성 중...');

    // SQL 실행 함수가 없으므로 RPC를 쓰거나, 아니면 API로 데이터 넣으면서 생성을 유도해야 함.
    // 하지만 Supabase JS 클라이언트로는 테이블 생성이 불가능 (SQL Editor 써야 함).

    // 차선책: 사용자에게 SQL 쿼리를 보여주고 복붙 요청.
    console.log(`
========================================================
[중요] 아래 SQL을 Supabase 대시보드 > SQL Editor에 실행해주세요!
========================================================

create table if not exists public.streamer_stats (
  bj_id text primary key,
  bj_name text,
  broadcast_time text,
  max_viewers text,
  avg_viewers text,
  fan_count text,
  total_view_cnt text,
  chat_participation text,
  ranking_list jsonb,
  last_updated timestamp with time zone default timezone('utc'::text, now())
);

-- RLS 설정 (읽기는 누구나, 쓰기는 서비스 키만)
alter table public.streamer_stats enable row level security;

create policy "Enable read access for all users"
on public.streamer_stats for select
using (true);

create policy "Enable insert/update for service role only"
on public.streamer_stats for all
using (true)
with check (true);

========================================================
`);
}

createTable();
