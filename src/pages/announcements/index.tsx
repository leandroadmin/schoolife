import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Plus,
    Send,
    Users,
    User,
    Clock,
    MessageSquare,
    Loader2,
    Calendar,
    ChevronRight,
    X,
    Trash2
} from "lucide-react"
import { toast } from "sonner"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Announcement, Student } from "@/types"

const QUICK_MESSAGES = [
    { title: "Aula cancelada", content: "Prezados alunos, a aula de hoje foi cancelada por motivos de força maior. Reposição a definir." },
    { title: "Prova semana que vem", content: "Lembrete: Teremos avaliação na próxima semana. Estudem os capítulos abordados em aula." },
    { title: "Trabalho em grupo", content: "Olá! Gostaria de lembrar sobre o prazo para entrega do trabalho em grupo no final desta semana." },
]

export default function AnnouncementsPage() {
    const [view, setView] = useState<'history' | 'create'>('history')
    const [announcements, setAnnouncements] = useState<Announcement[]>([])
    const [students, setStudents] = useState<Student[]>([])
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)
    const [teachersMap, setTeachersMap] = useState<Record<string, string>>({})

    // Context
    const teacherId = localStorage.getItem('teacher_id')

    // Form state
    const [title, setTitle] = useState("")
    const [content, setContent] = useState("")
    const [targetType, setTargetType] = useState<'all' | 'individual'>('all')
    const [selectedStudentId, setSelectedStudentId] = useState<string>("")
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")

    useEffect(() => {
        fetchAnnouncements()
        fetchStudents()
    }, [])

    async function fetchAnnouncements() {
        try {
            setLoading(true)
            let query = supabase
                .from('announcements')
                .select(`
                    *,
                    announcement_status(count),
                    read_status:announcement_status(is_read)
                `)
                .order('created_at', { ascending: false })

            if (teacherId) {
                query = query.or(`author_id.eq.${teacherId},type.eq.all`)
            }

            const { data, error } = await query

            if (error) throw error

            const formatted = data.map((a: any) => ({
                ...a,
                total_count: a.announcement_status?.[0]?.count || (a.type === 'all' ? 'Todos' : 1),
                read_count: a.read_status?.filter((s: any) => s.is_read).length || 0
            }))

            const { data: teachersData } = await supabase.from('teachers').select('id, full_name')
            if (teachersData) {
                const tMap: Record<string, string> = {}
                teachersData.forEach((t: any) => tMap[t.id] = t.full_name)
                setTeachersMap(tMap)
            }

            setAnnouncements(formatted)
        } catch (error) {
            console.error('Error fetching announcements:', error)
            toast.error("Erro ao carregar histórico")
        } finally {
            setLoading(false)
        }
    }

    async function fetchStudents() {
        try {
            if (teacherId) {
                // If it's a teacher, get students only from their classes
                const { data: classData } = await supabase
                    .from('classes')
                    .select('id, enrollments(student:students(id, full_name))')
                    .eq('teacher_id', teacherId)
                    .eq('status', 'active')

                if (classData) {
                    const studentsMap = new Map()
                    classData.forEach((c: any) => {
                        c.enrollments?.forEach((e: any) => {
                            if (e.student && !studentsMap.has(e.student.id)) {
                                studentsMap.set(e.student.id, e.student)
                            }
                        })
                    })
                    const uniqueStudents = Array.from(studentsMap.values()).sort((a, b) => a.full_name.localeCompare(b.full_name))
                    setStudents(uniqueStudents)
                }
            } else {
                // Admin context
                const { data, error } = await supabase
                    .from('students')
                    .select('id, full_name')
                    .eq('status', 'active')
                    .order('full_name')
                if (error) throw error
                setStudents((data || []) as any)
            }
        } catch (error) {
            console.error(error)
        }
    }

    async function handleSend() {
        if (!title.trim() || !content.trim() || !startDate || !endDate) {
            toast.error("Preencha título, conteúdo e o período (início e fim).")
            return
        }

        if (new Date(startDate) >= new Date(endDate)) {
            toast.error("A data de término deve ser posterior à data de início.")
            return
        }

        if (targetType === 'individual' && !selectedStudentId) {
            toast.error("Selecione um aluno")
            return
        }

        // Remove the block, teachers CAN send to their own classes.
        // But we will map their "all" to "individual" in DB to prevent school-wide broadcast.

        try {
            setSending(true)

            // 1. Create announcement
            const { data: ann, error: annError } = await supabase
                .from('announcements')
                .insert([{
                    title: title.trim(),
                    content: content.trim(),
                    type: (teacherId && targetType === 'all') ? 'individual' : targetType,
                    author_id: teacherId || null,
                    start_date: new Date(startDate).toISOString(),
                    end_date: new Date(endDate).toISOString()
                }])
                .select()
                .single()

            if (annError) throw annError

            // 2. Create status entries
            if (targetType === 'all') {
                const statusEntries = students.map(s => ({
                    announcement_id: ann.id,
                    student_id: s.id
                }))
                if (statusEntries.length > 0) {
                    const { error: statusError } = await supabase
                        .from('announcement_status')
                        .insert(statusEntries)
                    if (statusError) throw statusError
                }
            } else {
                const { error: statusError } = await supabase
                    .from('announcement_status')
                    .insert([{
                        announcement_id: ann.id,
                        student_id: selectedStudentId
                    }])
                if (statusError) throw statusError
            }

            toast.success("Comunicado enviado com sucesso!")
            setTitle("")
            setContent("")
            setStartDate("")
            setEndDate("")
            setView('history')
            fetchAnnouncements()
        } catch (error: any) {
            console.error(error)
            toast.error("Erro ao enviar comunicado")
        } finally {
            setSending(false)
        }
    }

    const applyQuickMessage = (msg: typeof QUICK_MESSAGES[0]) => {
        setTitle(msg.title)
        setContent(msg.content)
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir este comunicado? Ele sumirá para todos os alunos.")) return
        try {
            const { error } = await supabase.from('announcements').delete().eq('id', id)
            if (error) throw error
            toast.success("Comunicado excluído com sucesso!")
            fetchAnnouncements()
        } catch (error) {
            console.error("Erro ao excluir:", error)
            toast.error("Erro ao excluir o comunicado")
        }
    }

    if (view === 'create') {
        return (
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 dark:text-white">Novo Comunicado</h1>
                        <p className="text-slate-500 text-sm">Envie avisos para seus alunos</p>
                    </div>
                    <Button variant="ghost" onClick={() => setView('history')} className="rounded-xl">
                        <X className="mr-2 h-4 w-4" /> Cancelar
                    </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-2 rounded-3xl border-none shadow-premium">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Send className="w-5 h-5 text-blue-500" />
                                Compor Mensagem
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-slate-400">Destinatário</Label>
                                    <div className="flex gap-2">
                                        <Button
                                            variant={targetType === 'all' ? 'default' : 'outline'}
                                            onClick={() => setTargetType('all')}
                                            className="flex-1 rounded-xl h-11"
                                        >
                                            <Users className="mr-2 h-4 w-4" /> {teacherId ? 'Minhas Turmas' : 'Todos'}
                                        </Button>
                                        <Button
                                            variant={targetType === 'individual' ? 'default' : 'outline'}
                                            onClick={() => setTargetType('individual')}
                                            className="flex-1 rounded-xl h-11"
                                        >
                                            <User className="mr-2 h-4 w-4" /> Individual
                                        </Button>
                                    </div>
                                </div>

                                {targetType === 'individual' && (
                                    <div className="space-y-2 animate-in slide-in-from-top-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-400">Selecionar Aluno</Label>
                                        <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                                            <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-none px-4">
                                                <SelectValue placeholder="Escolher aluno..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {students.map(s => (
                                                    <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-slate-400">Título do Aviso</Label>
                                    <Input
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        placeholder="Digite o título do comunicado..."
                                        className="h-11 rounded-xl bg-slate-50 border-none px-4"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-400">Início da Exibição *</Label>
                                        <Input
                                            type="datetime-local"
                                            value={startDate}
                                            onChange={e => setStartDate(e.target.value)}
                                            className="h-11 rounded-xl bg-slate-50 border-none px-4"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-400">Fim da Exibição *</Label>
                                        <Input
                                            type="datetime-local"
                                            value={endDate}
                                            onChange={e => setEndDate(e.target.value)}
                                            className="h-11 rounded-xl bg-slate-50 border-none px-4"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-slate-400">Mensagem</Label>
                                    <Textarea
                                        value={content}
                                        onChange={e => setContent(e.target.value)}
                                        placeholder="Escreva aqui o conteúdo do aviso..."
                                        className="min-h-[150px] rounded-xl bg-slate-50 border-none p-4"
                                    />
                                </div>

                                <Button
                                    onClick={handleSend}
                                    disabled={sending}
                                    className="w-full h-12 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold shadow-lg shadow-blue-200"
                                >
                                    {sending ? <Loader2 className="animate-spin mr-2" /> : <Send className="mr-2 h-4 w-4" />}
                                    Enviar Comunicado
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="space-y-6">
                        <Card className="rounded-3xl border-none shadow-premium bg-slate-900 text-white overflow-hidden">
                            <CardHeader>
                                <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4 text-blue-400" />
                                    Mensagens Rápidas
                                </CardTitle>
                                <CardDescription className="text-slate-400 text-xs">Atalhos para avisos comuns</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {QUICK_MESSAGES.map((msg, i) => (
                                    <Button
                                        key={i}
                                        variant="ghost"
                                        onClick={() => applyQuickMessage(msg)}
                                        className="w-full justify-start h-auto py-3 px-4 rounded-2xl hover:bg-slate-800 text-left items-start flex-col"
                                    >
                                        <span className="font-bold text-xs">{msg.title}</span>
                                        <span className="text-[10px] text-slate-500 line-clamp-1">{msg.content}</span>
                                    </Button>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Comunicados</h1>
                    <p className="text-slate-500 mt-1">Histórico de avisos enviados para a comunidade escolar.</p>
                </div>
                <Button onClick={() => setView('create')} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-premium h-11 px-6">
                    <Plus className="w-4 h-4 mr-2" /> Novo Comunicado
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {loading ? (
                    <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>
                ) : announcements.length > 0 ? (
                    announcements.map(ann => (
                        <Card key={ann.id} className="rounded-[32px] border-none shadow-premium group hover:shadow-xl transition-all">
                            <CardContent className="p-6">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="flex gap-4 flex-1">
                                        <div className={cn(
                                            "h-14 w-14 rounded-2xl flex items-center justify-center shrink-0",
                                            ann.type === 'all' ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"
                                        )}>
                                            {ann.type === 'all' ? <Users className="w-7 h-7" /> : <User className="w-7 h-7" />}
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-black text-slate-800 dark:text-white text-lg">{ann.title}</h3>
                                                <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider py-0 h-5">
                                                    {ann.type === 'all' ? 'Toda Escola' : (ann.author_id && (ann.total_count || 0) > 1 ? 'Suas Turmas' : 'Individual')}
                                                </Badge>
                                                {ann.end_date && new Date(ann.end_date) < new Date() && (
                                                    <Badge variant="destructive" className="text-[10px] font-bold uppercase tracking-wider py-0 h-5 bg-red-100 text-red-600 hover:bg-red-200 border-none">
                                                        Expirado
                                                    </Badge>
                                                )}
                                                {ann.start_date && new Date(ann.start_date) > new Date() && (
                                                    <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider py-0 h-5 bg-amber-50 text-amber-600 border-none">
                                                        Agendado
                                                    </Badge>
                                                )}
                                                {ann.start_date && ann.end_date && new Date(ann.start_date) <= new Date() && new Date(ann.end_date) >= new Date() && (
                                                    <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider py-0 h-5 bg-emerald-50 text-emerald-600 border-none">
                                                        Ativo
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-widest">
                                                {ann.author_id === 'admin' ? 'Enviado por: Direção' :
                                                    ann.author_id && teachersMap[ann.author_id] ? `Enviado por: Prof. ${teachersMap[ann.author_id]}` :
                                                        'Enviado por: Direção'}
                                            </p>
                                            <p className="text-slate-500 text-sm line-clamp-2">{ann.content}</p>
                                            <div className="flex items-center gap-4 pt-2">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {new Date(ann.created_at).toLocaleDateString('pt-BR')}
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(ann.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-8 md:border-l md:pl-8 border-slate-100 dark:border-slate-800">
                                        <div className="text-center">
                                            <div className="text-2xl font-black text-slate-800 dark:text-white">
                                                {ann.read_count}
                                            </div>
                                            <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Lidos</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-black text-blue-600">
                                                {ann.type === 'all' ? students.length : ann.total_count}
                                            </div>
                                            <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Destinatários</div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button variant="ghost" size="icon" className="rounded-xl group-hover:bg-slate-100 transition-colors">
                                                <ChevronRight className="w-5 h-5 text-slate-400" />
                                            </Button>
                                            {(!teacherId || ann.author_id === teacherId) && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDelete(ann.id)}
                                                    className="rounded-xl text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <div className="text-center py-20 grayscale opacity-40">
                        <MessageSquare className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                        <h3 className="text-xl font-bold text-slate-800">Sem comunicados</h3>
                        <p className="text-slate-500 max-w-xs mx-auto">Envie seu primeiro comunicado para alunos e responsáveis.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
