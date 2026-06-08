import { createClient } from "@supabase/supabase-js";

// Backend service_role anahtarı ile bağlanır (RLS bypass — yalnızca sunucuda).
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } }
);
