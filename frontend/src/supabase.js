import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://awlafzzhunvzorrxyxog.supabase.co";
const supabaseAnonKey = "sb_publishable_p-cbyqWolyVILQZ2IDWY6w_ttOy6Hy9";

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
}


export const supabase = createClient(supabaseUrl, supabaseAnonKey,{
     auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});