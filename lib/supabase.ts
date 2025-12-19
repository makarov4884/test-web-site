import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kvpkghcflwtmylmenfkc.supabase.co';
const supabaseKey = 'sb_publishable_FsH_8CyrfV41PsUFPFudXw_MeQLPGFq'; // Anon Key

// Supabase 클라이언트 생성
export const supabase = createClient(supabaseUrl, supabaseKey);

// 관리자 권한 클라이언트 (쓰기/수정용 - 일단 비밀키 사용)
const serviceRoleKey = 'sb_secret_JE1HtwuIatNRDBOp4C_9ow_ph8_KzhW';
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
