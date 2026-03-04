import { useState, useEffect } from "react"
import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar"
import type { View } from "react-big-calendar"
import { format, parse, startOfWeek, getDay } from "date-fns"
import { ptBR } from "date-fns/locale"
import "react-big-calendar/lib/css/react-big-calendar.css"
import "@/styles/calendar.css"
import { Calendar as CalendarIcon, Download, ExternalLink, FileText, Link as LinkIcon, Paperclip, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

const locales = {
    "pt-BR": ptBR,
}

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
})

type CalendarEvent = {
    id: string
    title: string
    description?: string
    homework?: string
    start_time: string
    end_time: string
    event_type: 'class' | 'exam' | 'meeting' | 'holiday' | 'general'
    color: string
    class_id?: string
    class?: { name: string; teacher?: { full_name: string } }
    start: Date
    end: Date
}

interface EventAttachment {
    id: string
    file_name: string
    file_url: string
    file_type: string
    file_size: number
}

const COLOR_LEGENDS = [
    { color: "#10b981", label: "Aulas e Turmas" },
    { color: "#f59e0b", label: "Lições" },
    { color: "#3b82f6", label: "Conteúdo Geral" },
    { color: "#f43f5e", label: "Anexos" },
    { color: "#8b5cf6", label: "Eventos" },
]

export default function StudentCalendarPage() {
    const [events, setEvents] = useState<CalendarEvent[]>([])
    const [loading, setLoading] = useState(true)
    const [view, setView] = useState<View>(Views.MONTH)
    const [date, setDate] = useState(new Date())

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
    const [attachments, setAttachments] = useState<EventAttachment[]>([])
    const [loadingAttachments, setLoadingAttachments] = useState(false)

    const studentId = localStorage.getItem('student_id')

    useEffect(() => {
        fetchEvents()
    }, [studentId])

    const fetchEvents = async () => {
        try {
            setLoading(true)

            if (!studentId) return

            // Get student's class
            const { data: studentData, error: studentError } = await supabase
                .from('students')
                .select('class_id')
                .eq('id', studentId)
                .single()

            if (studentError) throw studentError

            const classId = studentData?.class_id

            // Fetch events: either global (class_id is null) or specific to student's class
            let query = supabase.from('calendar_events').select('*, class:classes(name, teacher:teachers(full_name))')

            if (classId) {
                query = query.or(`class_id.eq.${classId},class_id.is.null`)
            } else {
                query = query.is('class_id', null)
            }

            const { data, error } = await query

            if (error) throw error

            const formattedEvents = (data || []).map(e => ({
                ...e,
                start: new Date(e.start_time),
                end: new Date(e.end_time)
            }))

            setEvents(formattedEvents)
        } catch (error) {
            console.error('Error fetching calendar events:', error)
            toast.error("Erro ao carregar seu calendário")
        } finally {
            setLoading(false)
        }
    }

    const fetchAttachments = async (eventId: string) => {
        try {
            setLoadingAttachments(true)
            const { data, error } = await supabase
                .from('event_attachments')
                .select('*')
                .eq('event_id', eventId)

            if (error) throw error
            setAttachments(data || [])
        } catch (error) {
            console.error('Error fetching attachments:', error)
        } finally {
            setLoadingAttachments(false)
        }
    }

    const handleSelectEvent = (event: CalendarEvent) => {
        setSelectedEvent(event)
        setIsModalOpen(true)
        fetchAttachments(event.id)
    }

    const eventStyleGetter = (event: CalendarEvent) => {
        return {
            style: {
                backgroundColor: event.color || '#3b82f6',
                borderRadius: '6px',
                opacity: 0.9,
                color: 'white',
                border: 'none',
                display: 'block',
                fontWeight: 600,
                fontSize: '11px',
                padding: '2px 6px',
            }
        }
    }

    const CustomEvent = ({ event }: { event: CalendarEvent }) => {
        return (
            <div className="flex flex-col h-full overflow-hidden" title={event.title}>
                <span className="font-bold whitespace-nowrap overflow-hidden text-ellipsis">{event.title}</span>
                {event.class?.teacher?.full_name && (
                    <span className="text-[9px] opacity-90 truncate mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
                        Prof: {event.class.teacher.full_name}
                    </span>
                )}
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Calendário de Aulas</h1>
                    <p className="text-slate-500 mt-1">Veja suas próximas aulas, tarefas e eventos.</p>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                <span className="text-xs font-black uppercase text-slate-400 mr-2">Legenda:</span>
                {COLOR_LEGENDS.map(item => (
                    <div key={item.color} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold" style={{ backgroundColor: `${item.color}15`, color: item.color }}>
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                        {item.label}
                    </div>
                ))}
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-premium p-6 min-h-[700px]">
                {loading ? (
                    <div className="h-[650px] flex items-center justify-center text-slate-400">
                        <Loader2 className="w-8 h-8 animate-spin" />
                    </div>
                ) : (
                    <Calendar
                        localizer={localizer}
                        events={events}
                        startAccessor="start"
                        endAccessor="end"
                        style={{ height: 650 }}
                        culture="pt-BR"
                        messages={{
                            next: "Próximo",
                            previous: "Anterior",
                            today: "Hoje",
                            month: "Mês",
                            week: "Semana",
                            day: "Dia",
                            agenda: "Agenda",
                            date: "Data",
                            time: "Hora",
                            event: "Evento",
                            noEventsInRange: "Não há eventos programados neste período.",
                        }}
                        view={view}
                        date={date}
                        onNavigate={(newDate) => setDate(newDate)}
                        onView={(newView) => setView(newView)}
                        onSelectEvent={handleSelectEvent}
                        eventPropGetter={eventStyleGetter}
                        className="font-sans text-slate-700 dark:text-slate-300 custom-calendar"
                        components={{
                            event: CustomEvent
                        }}
                        popup
                    />
                )}
            </div>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-xl rounded-3xl p-0 overflow-hidden border-none shadow-premium">
                    {selectedEvent && (
                        <>
                            <DialogHeader className="p-6 border-bottom" style={{ backgroundColor: `${selectedEvent.color}15` }}>
                                <div className="flex flex-col gap-1">
                                    <DialogTitle className="text-xl font-black" style={{ color: selectedEvent.color }}>
                                        {selectedEvent.title}
                                    </DialogTitle>
                                    <div className="text-xs font-bold opacity-70 flex items-center gap-2" style={{ color: selectedEvent.color }}>
                                        <CalendarIcon className="w-3.5 h-3.5" />
                                        {format(selectedEvent.start, "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                                        {' - '}
                                        {format(selectedEvent.end, "HH:mm", { locale: ptBR })}
                                    </div>
                                </div>
                            </DialogHeader>

                            <div className="p-6 space-y-6">
                                {selectedEvent.description && (
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black uppercase text-slate-400">Conteúdo da Aula</Label>
                                        <div className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl whitespace-pre-wrap">
                                            {selectedEvent.description}
                                        </div>
                                    </div>
                                )}

                                {selectedEvent.homework && (
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black uppercase text-slate-400">Lição de Casa</Label>
                                        <div className="text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/10 p-4 rounded-xl whitespace-pre-wrap border border-amber-100 dark:border-amber-900/30">
                                            {selectedEvent.homework}
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-3">
                                    <Label className="text-xs font-black uppercase text-slate-400">Material de Apoio e Anexos</Label>

                                    {loadingAttachments ? (
                                        <div className="flex items-center justify-center p-6 text-slate-400">
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        </div>
                                    ) : attachments.length > 0 ? (
                                        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                                            {attachments.map((file) => (
                                                <div key={file.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                                    <div className="flex items-center gap-3 w-full overflow-hidden">
                                                        <div className="h-10 w-10 bg-white dark:bg-slate-900 rounded-lg flex items-center justify-center shadow-sm shrink-0">
                                                            {file.file_type === 'link' ? <LinkIcon className="w-4 h-4 text-emerald-500" /> : <FileText className="w-4 h-4 text-blue-500" />}
                                                        </div>
                                                        <div className="flex flex-col flex-1 min-w-0">
                                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{file.file_name}</span>
                                                            <span className="text-[10px] font-medium text-slate-400">
                                                                {file.file_type === 'link' ? 'Link Externo' : `${(file.file_size / 1024).toFixed(1)} KB`}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg shrink-0 hover:bg-white dark:hover:bg-slate-900" asChild>
                                                        <a href={file.file_url} target="_blank" rel="noopener noreferrer" download={file.file_type !== 'link'}>
                                                            {file.file_type === 'link' ? <ExternalLink className="w-4 h-4 text-slate-400" /> : <Download className="w-4 h-4 text-slate-400" />}
                                                        </a>
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl p-6 flex items-center justify-center text-center gap-3">
                                            <Paperclip className="w-5 h-5 text-slate-300" />
                                            <span className="text-sm font-bold text-slate-400">Nenhum material anexado</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
                                <Button onClick={() => setIsModalOpen(false)} className="rounded-xl font-bold bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border-none">
                                    Fechar
                                </Button>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
