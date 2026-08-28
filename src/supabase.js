import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  console.warn(
    "Supabase environment variables are missing. Authentication will not work until Netlify variables are configured."
  );
}

export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey
);
