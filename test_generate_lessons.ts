import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { format, eachDayOfInterval, parseISO, getDay } from "date-fns"

const envContent = readFileSync('.env.local', 'utf-8')
const env = envContent.split('\n').reduce((acc, line) => {
  const [key, val] = line.split('=')
  if (key) acc[key.trim()] = val?.trim()
  return acc
}, {} as any)

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)

async function test() {
    const classId = "some-fake-id"
    const start = "2026-03-01"
    const end = "2026-03-31"
    const days = ["Mon", "Wed"]
    const time = "19:00"
    const duration = 60

    const startDate = parseISO(start)
    const endDate = parseISO(end)

    const dayMap = {
        'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
    }
    const selectedDays = days.map(d => (dayMap as any)[d])

    const allDays = eachDayOfInterval({ start: startDate, end: endDate })
    const lessonDates = allDays.filter(d => selectedDays.includes(getDay(d)))

    console.log("total dates:", lessonDates.length)

    const eventsPayload = lessonDates.map(date => {
        const [hours, minutes] = time.split(':').map(Number)
        const startTime = new Date(date)
        startTime.setHours(hours, minutes, 0, 0)

        const endTime = new Date(date)
        endTime.setHours(hours, minutes + duration, 0, 0)

        return {
            title: `Aula Fake`,
            description: `Aula regular da turma`,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            class_id: classId,
            type: 'class',
            target_type: 'class'
        }
    })
    console.log("calendar payload length:", eventsPayload.length)
    if(eventsPayload.length > 0) {
      console.log("sample event:", eventsPayload[0])
    }

    // Try a dry-run insert into calendar_events just for a real class
    const { data: realClass } = await supabase.from('classes').select('*').limit(1).single()
    if (realClass) {
        eventsPayload[0].class_id = realClass.id
        const res = await supabase.from('calendar_events').insert([eventsPayload[0]]).select()
        console.log("insert res:", res.error || "success")
        if (!res.error) {
           await supabase.from('calendar_events').delete().eq('id', res.data[0].id)
        }
    }
}

test()
