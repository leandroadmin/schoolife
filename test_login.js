import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function signInUser() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'super@admin.com',
    password: 'admin123',
  });

  if (error) {
    console.error('Error signing in:', error.message);
  } else {
    console.log('Successfully signed in:', data.user.email);
  }
}

signInUser();
