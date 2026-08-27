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
Commit that file.
Then create:
src/Auth.jsx
Paste:
import React, { useState } from "react";
import { supabase } from "./supabase";

function Auth({ onAuthenticated }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMagicLink(event) {
    event.preventDefault();

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) return;

    setLoading(true);
    setStatus("");
