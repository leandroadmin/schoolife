import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const envContent = readFileSync('.env.local', 'utf-8')
const env = envContent.split('\n').reduce((acc, line) => {
  const [key, val] = line.split('=')
  if (key) acc[key.trim()] = val?.trim()
  return acc
}, {} as any)

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)

async function test() {
  const { data: students } = await supabase.from('students').select('*, enrollments(*)').limit(1)
  console.log("Students:", JSON.stringify(students, null, 2))
}

test()
