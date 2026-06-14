import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || 'https://dqhtktvaocnwavvaqzie.supabase.co';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_YRszGyFgQsqC1Rc9bzmVqw_rNIWT4PT';


export const supabase = createClient(supabaseUrl, supabaseAnonKey);
