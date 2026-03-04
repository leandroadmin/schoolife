import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testProvision() {
  const { data, error } = await supabase.rpc('provision_new_tenant', {
    p_school_name: 'Test Tenant XYZ',
    p_subdomain: 'testxyz',
    p_admin_email: 'xyzadmin@test.com',
    p_admin_password: 'changeme123'
  });

  if (error) {
    console.error('Error provisioning:', error.message);
  } else {
    console.log('Successfully provisioned tenant:', data);
  }
}

testProvision();
