import { useState, useEffect } from "react"
import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar"
import type { View } from "react-big-calendar"
import { format, parse, startOfWeek, getDay } from "date-fns"
import { ptBR } from "date-fns/locale"
import "react-big-calendar/lib/css/react-big-calendar.css"
import "@/styles/calendar.css"
import { Plus, MessageSquare, Clipboard, Paperclip, Trash2, Save, FileText, Download, Loader2, X, Link, ExternalLink, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { useRef } from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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

interface CalendarEvent {
    id: string
    title: string
    description: string
    homework: string
    start: Date
    end: Date
    event_type: 'class' | 'exam' | 'meeting' | 'holiday' | 'general'
    color: string
    class_id?: string
    subject_id?: string
    teacher_id?: string
    class?: {
        teacher?: {
            full_name?: string
        }
    }
}

interface EventAttachment {
    id: string
    event_id: string
    file_name: string
    file_url: string
    file_type: string
    file_size: number
    created_at: string
}

const COLOR_LEGENDS = [
    { color: "#10b981", label: "Aulas e Turmas" },
    { color: "#f59e0b", label: "Lições" },
    { color: "#3b82f6", label: "Conteúdo Geral" },
    { color: "#f43f5e", label: "Anexos" },
    { color: "#8b5cf6", label: "Eventos" },
]

export default function CalendarPage() {
    const [events, setEvents] = useState<CalendarEvent[]>([])
    const [classes, setClasses] = useState<any[]>([])
    const [attachments, setAttachments] = useState<EventAttachment[]>([])
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [view, setView] = useState<View>(Views.MONTH)
    const [date, setDate] = useState(new Date())
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Link and pending attachments state
    type PendingAttachment = { id: string; type: 'file' | 'link'; file?: File; url?: string; name: string; size: number }
    const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([])
    const [newLinkUrl, setNewLinkUrl] = useState("")
    const [newLinkTitle, setNewLinkTitle] = useState("")

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        homework: "",
        start: "",
        end: "",
        event_type: "class" as 'class' | 'exam' | 'meeting' | 'holiday' | 'general',
        color: "#3b82f6",
        class_id: "none"
    })

    // Context
    const teacherId = localStorage.getItem('teacher_id')

    useEffect(() => {
        fetchData()
    }, [teacherId])

    const fetchData = async () => {
        try {
            setLoading(true)

            // Setup queries
            let classesQuery = supabase.from('classes').select('id, name')
            let eventsQuery = supabase.from('calendar_events').select('*, class:classes(teacher:teachers(full_name))')

            // Robust UUID validation for teacherId
            const isValidUUID = (id: string | null) =>
                id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

            if (isValidUUID(teacherId)) {
                // Determine which classes the teacher owns
                classesQuery = classesQuery.eq('teacher_id', teacherId)

                const { data: allowedClassesData } = await supabase.from('classes').select('id').eq('teacher_id', teacherId as string)
                const allowedClassIds = allowedClassesData?.map(c => c.id) || []

                if (allowedClassIds.length > 0) {
                    // Fetch events that map to these classes
                    eventsQuery = eventsQuery.in('class_id', allowedClassIds)
                } else {
                    // No classes, no events
                    eventsQuery = eventsQuery.eq('id', '00000000-0000-0000-0000-000000000000')
                }
            }

            const [eventsRes, classesRes] = await Promise.all([
                eventsQuery,
                classesQuery
            ])

            if (eventsRes.error) throw eventsRes.error
            if (classesRes.error) throw classesRes.error

            const formattedEvents = (eventsRes.data || []).map(e => ({
                ...e,
                start: new Date(e.start_time),
                end: new Date(e.end_time)
            }))

            setEvents(formattedEvents)
            setClasses(classesRes.data || [])
        } catch (error) {
            console.error('Error fetching calendar data:', error)
            toast.error("Erro ao carregar dados do calendário")
        } finally {
            setLoading(false)
        }
    }

    const handleSelectSlot = ({ start, end }: { start: Date, end: Date }) => {
        setFormData({
            title: "",
            description: "",
            homework: "",
            start: format(start, "yyyy-MM-dd'T'HH:mm"),
            end: format(end, "yyyy-MM-dd'T'HH:mm"),
            event_type: "class",
            color: "#3b82f6",
            class_id: "none"
        })
        setSelectedEvent(null)
        setAttachments([])
        setPendingAttachments([])
        setNewLinkUrl("")
        setNewLinkTitle("")
        setIsModalOpen(true)
    }

    const handleSelectEvent = (event: CalendarEvent) => {
        setSelectedEvent(event)
        setAttachments([])
        setFormData({
            title: event.title,
            description: event.description || "",
            homework: event.homework || "",
            start: format(event.start, "yyyy-MM-dd'T'HH:mm"),
            end: format(event.end, "yyyy-MM-dd'T'HH:mm"),
            event_type: event.event_type,
            color: event.color,
            class_id: event.class_id || "none"
        })
        setPendingAttachments([])
        setNewLinkUrl("")
        setNewLinkTitle("")
        setIsModalOpen(true)
        fetchAttachments(event.id)
    }

    const fetchAttachments = async (eventId: string) => {
        try {
            const { data, error } = await supabase
                .from('event_attachments')
                .select('*')
                .eq('event_id', eventId)

            if (error) throw error
            setAttachments(data || [])
        } catch (error) {
            console.error('Error fetching attachments:', error)
        }
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (!selectedEvent) {
            // Add to pending if event is not created yet
            setPendingAttachments(prev => [...prev, {
                id: Math.random().toString(36).substring(7),
                type: 'file',
                file: file,
                name: file.name,
                size: file.size
            }])
            if (fileInputRef.current) fileInputRef.current.value = ""
            return
        }

        try {
            setUploading(true)
            const fileExt = file.name.split('.').pop()
            const fileName = `${selectedEvent.id}/${Math.random()}.${fileExt}`
            const filePath = `${fileName}`

            // Upload to storage
            const { error: uploadError } = await supabase.storage
                .from('calendar_attachments')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('calendar_attachments')
                .getPublicUrl(filePath)

            // Save to database
            const { error: dbError } = await supabase
                .from('event_attachments')
                .insert([{
                    event_id: selectedEvent.id,
                    file_name: file.name,
                    file_url: publicUrl,
                    file_type: file.type,
                    file_size: file.size
                }])

            if (dbError) throw dbError

            toast.success("Anexo enviado com sucesso")
            fetchAttachments(selectedEvent.id)
        } catch (error) {
            console.error('Error uploading file:', error)
            toast.error("Erro ao enviar anexo")
        } finally {
            setUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ""
        }
    }

    const handleAddLink = async () => {
        if (!newLinkUrl) {
            toast.error("Insira a URL do link")
            return
        }

        let finalUrl = newLinkUrl
        if (!finalUrl.startsWith('http')) {
            finalUrl = 'https://' + finalUrl
        }

        const title = newLinkTitle || finalUrl

        if (!selectedEvent) {
            setPendingAttachments(prev => [...prev, {
                id: Math.random().toString(36).substring(7),
                type: 'link',
                url: finalUrl,
                name: title,
                size: 0
            }])
            setNewLinkUrl("")
            setNewLinkTitle("")
            return
        }

        try {
            setUploading(true)
            const { error: dbError } = await supabase
                .from('event_attachments')
                .insert([{
                    event_id: selectedEvent.id,
                    file_name: title,
                    file_url: finalUrl,
                    file_type: 'link',
                    file_size: 0
                }])

            if (dbError) throw dbError

            toast.success("Link adicionado com sucesso")
            setNewLinkUrl("")
            setNewLinkTitle("")
            fetchAttachments(selectedEvent.id)
        } catch (error) {
            console.error('Error adding link:', error)
            toast.error("Erro ao adicionar link")
        } finally {
            setUploading(false)
        }
    }

    const handleDeleteAttachment = async (attachment: EventAttachment) => {
        if (!confirm("Deseja realmente excluir este anexo?")) return

        try {
            // Delete from database
            const { error: dbError } = await supabase
                .from('event_attachments')
                .delete()
                .eq('id', attachment.id)

            if (dbError) throw dbError

            // Note: We normally would delete from storage too, but for now we'll focus on database
            toast.success("Anexo excluído")
            fetchAttachments(attachment.event_id)
        } catch (error) {
            console.error('Error deleting attachment:', error)
            toast.error("Erro ao excluir anexo")
        }
    }

    const handleSave = async () => {
        if (!formData.title || !formData.start || !formData.end) {
            toast.error("Preencha os campos obrigatórios")
            return
        }

        try {
            const payload = {
                title: formData.title,
                description: formData.description,
                homework: formData.homework,
                start_time: new Date(formData.start).toISOString(),
                end_time: new Date(formData.end).toISOString(),
                event_type: formData.event_type,
                color: formData.color,
                class_id: formData.class_id === "none" ? null : formData.class_id,
            }

            if (selectedEvent) {
                const { error } = await supabase
                    .from('calendar_events')
                    .update(payload)
                    .eq('id', selectedEvent.id)
                if (error) throw error
                toast.success("Evento atualizado")
            } else {
                const { data: newEvent, error } = await supabase
                    .from('calendar_events')
                    .insert([payload])
                    .select()
                    .single()

                if (error) throw error

                // Process pending attachments for the new event
                if (pendingAttachments.length > 0 && newEvent) {
                    for (const att of pendingAttachments) {
                        if (att.type === 'file' && att.file) {
                            const fileExt = att.file.name.split('.').pop()
                            const filePath = `${newEvent.id}/${Math.random()}.${fileExt}`
                            const { error: upErr } = await supabase.storage.from('calendar_attachments').upload(filePath, att.file)
                            if (!upErr) {
                                const { data: { publicUrl } } = supabase.storage.from('calendar_attachments').getPublicUrl(filePath)
                                const { error: dbErr } = await supabase.from('event_attachments').insert([{
                                    event_id: newEvent.id, file_name: att.name, file_url: publicUrl, file_type: att.file.type, file_size: att.size
                                }])
                                if (dbErr) {
                                    console.error('Error saving file attachment:', dbErr)
                                    toast.error(`Falha ao salvar o anexo: ${att.name}`)
                                }
                            } else {
                                console.error('Upload error:', upErr)
                                toast.error(`Falha ao fazer upload do arquivo: ${att.name}`)
                            }
                        } else if (att.type === 'link' && att.url) {
                            const { error: dbErr } = await supabase.from('event_attachments').insert([{
                                event_id: newEvent.id, file_name: att.name, file_url: att.url, file_type: 'link', file_size: 0
                            }])
                            if (dbErr) {
                                console.error('Error saving link attachment:', dbErr)
                                toast.error(`Falha ao salvar o link: ${att.name}`)
                            }
                        }
                    }
                }

                toast.success("Evento criado com sucesso!")
            }

            setIsModalOpen(false)
            setPendingAttachments([])
            fetchData()
        } catch (error) {
            console.error('Error saving event:', error)
            toast.error("Erro ao salvar evento")
        }
    }

    const handleDelete = async () => {
        if (!selectedEvent) return
        if (!confirm("Deseja realmente excluir este evento?")) return

        try {
            const { error } = await supabase
                .from('calendar_events')
                .delete()
                .eq('id', selectedEvent.id)

            if (error) throw error
            toast.success("Evento excluído")
            setIsModalOpen(false)
            fetchData()
        } catch (error) {
            console.error('Error deleting event:', error)
            toast.error("Erro ao excluir evento")
        }
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
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Calendário e Planejamento</h1>
                    <p className="text-slate-500 mt-1">Gerencie aulas, eventos e tarefas da escola.</p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <Button onClick={() => handleSelectSlot({ start: new Date(), end: new Date(new Date().setHours(new Date().getHours() + 1)) })} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-premium">
                        <Plus className="w-4 h-4 mr-2" /> Novo Evento
                    </Button>
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
                        Carregando calendário...
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
                            noEventsInRange: "Não há eventos neste período.",
                        }}
                        view={view}
                        date={date}
                        onNavigate={(newDate) => setDate(newDate)}
                        onView={(newView) => setView(newView)}
                        onSelectSlot={handleSelectSlot}
                        onSelectEvent={handleSelectEvent}
                        eventPropGetter={eventStyleGetter}
                        className="font-sans text-slate-700 dark:text-slate-300 custom-calendar"
                        components={{
                            event: CustomEvent
                        }}
                        popup
                        selectable
                    />
                )}
            </div>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-2xl rounded-3xl p-0 overflow-hidden border-none shadow-premium">
                    <DialogHeader className="p-6 bg-slate-50 dark:bg-slate-800/50 border-bottom">
                        <div className="flex items-center justify-between">
                            <DialogTitle className="text-xl font-black text-slate-800 dark:text-white">
                                {selectedEvent ? "Editar Evento" : "Novo Evento"}
                            </DialogTitle>
                        </div>
                    </DialogHeader>

                    <div className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-3 col-span-2">
                                <Label className="text-xs font-black uppercase text-slate-400">Classificação (Cor do Evento)</Label>
                                <div className="flex flex-wrap gap-2">
                                    {COLOR_LEGENDS.map(item => (
                                        <button
                                            key={item.color}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, color: item.color })}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all cursor-pointer ${formData.color === item.color ? 'scale-105 shadow-md' : 'border-transparent opacity-70 hover:opacity-100'}`}
                                            style={{
                                                backgroundColor: formData.color === item.color ? `${item.color}20` : `${item.color}10`,
                                                color: item.color,
                                                borderColor: formData.color === item.color ? item.color : 'transparent'
                                            }}
                                        >
                                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                                            {item.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2 col-span-2">
                                <Label className="text-xs font-black uppercase text-slate-400">Título do Evento</Label>
                                <Input
                                    className="h-12 rounded-xl bg-slate-50 border-none px-4 font-bold dark:bg-slate-800"
                                    placeholder="Ex: Aula de Inglês Avançado"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-black uppercase text-slate-400">Início</Label>
                                <Input
                                    type="datetime-local"
                                    className="h-12 rounded-xl bg-slate-50 border-none px-4 dark:bg-slate-800"
                                    value={formData.start}
                                    onChange={e => setFormData({ ...formData, start: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-black uppercase text-slate-400">Término</Label>
                                <Input
                                    type="datetime-local"
                                    className="h-12 rounded-xl bg-slate-50 border-none px-4 dark:bg-slate-800"
                                    value={formData.end}
                                    onChange={e => setFormData({ ...formData, end: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-black uppercase text-slate-400">Tipo de Evento</Label>
                                <Select value={formData.event_type} onValueChange={(v: any) => setFormData({ ...formData, event_type: v })}>
                                    <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none dark:bg-slate-800">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-none shadow-premium">
                                        <SelectItem value="class">📅 Aula</SelectItem>
                                        <SelectItem value="exam">📝 Avaliação</SelectItem>
                                        <SelectItem value="meeting">🤝 Reunião</SelectItem>
                                        <SelectItem value="holiday">⛱️ Feriado</SelectItem>
                                        <SelectItem value="general">✨ Geral</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-black uppercase text-slate-400">Vincular Turma (Opcional)</Label>
                                <Select value={formData.class_id} onValueChange={v => setFormData({ ...formData, class_id: v })}>
                                    <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none dark:bg-slate-800">
                                        <SelectValue placeholder="Nenhuma" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-none shadow-premium">
                                        <SelectItem value="none">Nenhuma</SelectItem>
                                        {classes.map(c => (
                                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <Tabs defaultValue="content" className="w-full">
                            <TabsList className="grid w-full grid-cols-3 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
                                <TabsTrigger value="content" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 font-bold flex items-center gap-2">
                                    <Clipboard className="w-4 h-4" /> Conteúdo
                                </TabsTrigger>
                                <TabsTrigger value="homework" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 font-bold flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4" /> Lição
                                </TabsTrigger>
                                <TabsTrigger value="attachments" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 font-bold flex items-center gap-2">
                                    <Paperclip className="w-4 h-4" /> Anexos
                                </TabsTrigger>
                            </TabsList>
                            <TabsContent value="content" className="pt-4">
                                <Textarea
                                    className="min-h-[150px] rounded-xl bg-slate-50 border-none px-4 py-3 dark:bg-slate-800"
                                    placeholder="Descreva o que será abordado..."
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </TabsContent>
                            <TabsContent value="homework" className="pt-4">
                                <Textarea
                                    className="min-h-[150px] rounded-xl bg-slate-50 border-none px-4 py-3 dark:bg-slate-800"
                                    placeholder="Dever de casa para o aluno..."
                                    value={formData.homework}
                                    onChange={e => setFormData({ ...formData, homework: e.target.value })}
                                />
                            </TabsContent>
                            <TabsContent value="attachments" className="pt-4">
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                                        <div className="md:col-span-2 space-y-1">
                                            <Label className="text-[10px] font-black uppercase text-slate-400">Adicionar Link Externo</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    placeholder="URL (ex: https://drive.google.com/...)"
                                                    value={newLinkUrl}
                                                    onChange={e => setNewLinkUrl(e.target.value)}
                                                    className="h-10 text-xs bg-white dark:bg-slate-900 border-none rounded-lg flex-1"
                                                />
                                                <Input
                                                    placeholder="Título (Opcional)"
                                                    value={newLinkTitle}
                                                    onChange={e => setNewLinkTitle(e.target.value)}
                                                    className="h-10 text-xs bg-white dark:bg-slate-900 border-none rounded-lg flex-1 w-1/3"
                                                />
                                                <Button onClick={handleAddLink} disabled={uploading || !newLinkUrl} className="h-10 rounded-lg px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shrink-0">
                                                    Adicionar
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">Arquivos e Links Anexados</Label>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="rounded-lg h-8 px-3 text-[10px] font-bold uppercase tracking-widest border-slate-200 dark:border-slate-800"
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={uploading}
                                            >
                                                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <Plus className="w-3.5 h-3.5 mr-2" />}
                                                Subir Arquivo
                                            </Button>
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                className="hidden"
                                                onChange={handleFileUpload}
                                            />
                                        </div>

                                        <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2">
                                            {/* Existing Attachments */}
                                            {attachments.map((file) => (
                                                <div key={file.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl group hover:shadow-sm transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-700">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 bg-white dark:bg-slate-900 rounded-lg flex items-center justify-center shadow-sm shrink-0">
                                                            {file.file_type === 'link' ? <Link className="w-4 h-4 text-emerald-500" /> : <FileText className="w-4 h-4 text-blue-500" />}
                                                        </div>
                                                        <div className="flex flex-col overflow-hidden">
                                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{file.file_name}</span>
                                                            <span className="text-[10px] font-medium text-slate-400">
                                                                {file.file_type === 'link' ? 'Link Externo' : `${(file.file_size / 1024).toFixed(1)} KB`}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" asChild>
                                                            <a href={file.file_url} target="_blank" rel="noopener noreferrer" download={file.file_type !== 'link'}>
                                                                {file.file_type === 'link' ? <ExternalLink className="w-4 h-4 text-slate-400" /> : <Download className="w-4 h-4 text-slate-400" />}
                                                            </a>
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10" onClick={() => handleDeleteAttachment(file)}>
                                                            <X className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}

                                            {/* Pending Attachments */}
                                            {pendingAttachments.map((att) => (
                                                <div key={att.id} className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-500/10 rounded-xl group border border-amber-100 dark:border-amber-500/20">
                                                    <div className="flex items-center gap-3 w-full overflow-hidden">
                                                        <div className="h-10 w-10 bg-white dark:bg-slate-900 rounded-lg flex items-center justify-center shadow-sm shrink-0">
                                                            {att.type === 'link' ? <Link className="w-4 h-4 text-emerald-500" /> : <FileText className="w-4 h-4 text-blue-500" />}
                                                        </div>
                                                        <div className="flex flex-col min-w-0 flex-1">
                                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{att.name}</span>
                                                            <span className="text-[10px] font-medium text-amber-500 flex items-center gap-1">
                                                                <Clock className="w-3 h-3" /> Aguardando salvamento do evento
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10" onClick={() => setPendingAttachments(prev => prev.filter(p => p.id !== att.id))}>
                                                            <X className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}

                                            {attachments.length === 0 && pendingAttachments.length === 0 && !uploading && (
                                                <div className="border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-2">
                                                    <Paperclip className="w-8 h-8 text-slate-200" />
                                                    <div className="text-sm font-bold text-slate-400">Nenhum anexo disponível</div>
                                                    <p className="text-[10px] text-slate-400 max-w-[200px]">Adicione um link do drive, youtube ou faça o upload de um arquivo.</p>
                                                </div>
                                            )}

                                            {uploading && (
                                                <div className="flex items-center justify-center p-8 text-slate-400 text-xs font-bold animate-pulse">
                                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                    Processando anexo...
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>

                    <DialogFooter className="p-6 bg-slate-50 dark:bg-slate-800/50 flex gap-2 sm:justify-between items-center">
                        <div className="flex shrink-0">
                            {selectedEvent && (
                                <Button variant="ghost" onClick={handleDelete} className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl font-bold">
                                    <Trash2 className="w-4 h-4 mr-2" /> Excluir
                                </Button>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setIsModalOpen(false)} className="rounded-xl border-none bg-white dark:bg-slate-900 font-bold">
                                Cancelar
                            </Button>
                            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-premium">
                                <Save className="w-4 h-4 mr-2" /> {selectedEvent ? "Salvar Alterações" : "Criar Evento"}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
