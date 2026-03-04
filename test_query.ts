import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

async function testQuery() {
    console.log("URL:", supabaseUrl)
    const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select(`
            id, name,
            students (id, full_name)
        `)
        .limit(1)

    console.log("Classes query result error:", classesError)
    
    // Test alternative: fetching from enrollments
    const { data: classesData2, error: classesError2 } = await supabase
        .from('classes')
        .select(`
            id, name,
            enrollments ( student_id, students (id, full_name) )
        `)
        .limit(1)

    console.log("Classes query 2 result error:", classesError2)
}

testQuery()
