import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envFile = fs.readFileSync('.env.local', 'utf8')
const getEnv = (key) => {
    const match = envFile.match(new RegExp(`${key}=(.*)`))
    return match ? match[1].trim() : null
}

const supabaseUrl = getEnv('VITE_SUPABASE_URL')
const supabaseKey = getEnv('VITE_SUPABASE_ANON_KEY')

const supabase = createClient(supabaseUrl, supabaseKey)

async function seed() {
    const users = [
        { email: 'super@admin.com', password: 'admin123' },
        { email: 'admin@escola.com', password: 'admin123' }
    ]

    for (const u of users) {
        const { data, error } = await supabase.auth.signUp({
            email: u.email,
            password: u.password,
        })

        if (error) {
            console.error(`Error creating ${u.email}:`, error.message)
        } else {
            console.log(`Successfully created ${u.email} with ID: ${data?.user?.id}`)
        }
    }
}

seed()
