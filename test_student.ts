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
  const studentId = "eb8d4a97-9e3d-4cba-a1ed-c31a7cddab63" // Let's try to query just whatever students exist

  const { data: students } = await supabase.from('students').select('*').limit(1)
  const student = students?.[0]
  if (!student) {
      console.log("No students!")
      return
  }
  console.log("Found student:", student.id, "class_id:", student.class_id)
  
  console.log("Fetching grades...")
  const grades = await supabase.from('assessment_grades').select('*').eq('student_id', student.id)
  console.log("Grades:", grades.data?.length, "Error:", grades.error)

  console.log("Fetching announcements...")
  const now = new Date().toISOString()
  const anns = await supabase.from('announcements')
                .select('*, announcement_status(student_id, is_read)')
                //.lte('start_date', now)
                //.gte('end_date', now)
  console.log("Announcements without date filter:", anns.data?.length, "Error:", anns.error)
  
  if (anns.data?.length) {
      console.log("Sample announcement:", JSON.stringify(anns.data[0], null, 2))
  }
  
  const annsFilter = await supabase.from('announcements')
                .select('*')
                .lte('start_date', now)
                .gte('end_date', now)
  console.log("Announcements WITH date filter:", annsFilter.data?.length, "Error:", annsFilter.error)
}

test()
