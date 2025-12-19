// Supabase 설정 파일 (임시)
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://kvpkghcflwtmylmenfkc.supabase.co';
const supabaseKey = 'sb_secret_JE1HtwuIatNRDBOp4C_9ow_ph8_KzhW'; // Service Role Key (관리자 권한)

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
