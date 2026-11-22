
// IdeaForge Supabase Configuration

const SUPABASE_URL = "https://jcgqegvsvydgnkiozsyg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_NYHgJAFAy4Fny01At8sPvA_c5m9zZ8Q";

window.supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

