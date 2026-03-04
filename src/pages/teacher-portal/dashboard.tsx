import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    Users2,
    CalendarDays,
    MessageSquare,
    FileText,
    Clock,
    UserCircle,
    Loader2
} from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

export default function TeacherDashboardPage() {
    const teacherId = localStorage.getItem('teacher_id')
    const [loading, setLoading] = useState(true)

    // Data states
    const [teacherData, setTeacherData] = useState<any>(null)
    const [classes, setClasses] = useState<any[]>([])
    const [events, setEvents] = useState<any[]>([])
    const [evaluations, setEvaluations] = useState<any[]>([])
    const [announcements, setAnnouncements] = useState<any[]>([])

    useEffect(() => {
        if (!teacherId) return
        fetchAllData()
    }, [teacherId])

    async function fetchAllData() {
        try {
            setLoading(true)

            // 1. Fetch Teacher Info
            const { data: teacher, error: teacherError } = await supabase
                .from('teachers')
                .select('*')
                .eq('id', teacherId)
                .single()

            if (teacherError) throw teacherError
            setTeacherData(teacher)

            // 2. Fetch Classes assigned to this teacher with students
            const { data: classesData } = await supabase
                .from('classes')
                .select('*')
                .eq('teacher_id', teacherId)
                .eq('status', 'active')

            const classIds = (classesData || []).map((c: any) => c.id)
            let teacherClasses = classesData || []

            if (classIds.length > 0) {
                const { data: studentsData } = await supabase
                    .from('students')
                    .select('id, full_name, phone, class_id')
                    .in('class_id', classIds)

                teacherClasses = teacherClasses.map((c: any) => ({
                    ...c,
                    students: (studentsData || []).filter((s: any) => s.class_id === c.id)
                }))
            } else {
                teacherClasses = teacherClasses.map((c: any) => ({ ...c, students: [] }))
            }

            setClasses(teacherClasses)

            if (classIds.length > 0) {
                // 3. Fetch Events (Upcoming Classes)
                const { data: eventsData } = await supabase
                    .from('calendar_events')
                    .select('*')
                    .in('class_id', classIds)
                    .gte('start_time', new Date().toISOString())
                    .order('start_time', { ascending: true })
                    .limit(5)

                setEvents(eventsData || [])

                // 4. Fetch recent evaluations for these classes
                const { data: evalData } = await supabase
                    .from('assessments')
                    .select('*')
                    .in('class_id', classIds)
                    .order('created_at', { ascending: false })
                    .limit(5)

                setEvaluations(evalData || [])
            }

            // 5. Fetch recent announcements created by this teacher
            // Note: If you want announcements sent TO this teacher, the logic differs.
            // As per requirements: "onde cada professor idependente poderá criar comunicados..."
            // We'll show announcements authored by this teacher.
            // Assuming we added `author_id` to announcements, but if we haven't, 
            // we will need to filter locally or just show generic ones. 
            // For now, let's fetch any announcements just to show structure if author_id is missing,
            // or we fetch the generic list if no specific relation exists yet.
            const { data: annData } = await supabase
                .from('announcements')
                .select('*')
                .or(`author_id.eq.${teacherId},type.eq.all`)
                .order('created_at', { ascending: false })
                .limit(5)

            setAnnouncements(annData || [])

        } catch (error) {
            console.error("Erro ao carregar dashboard:", error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
        )
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-12">

            {/* Header Welcome Card */}
            <Card className="rounded-3xl border-none shadow-premium bg-gradient-to-br from-amber-500 to-orange-600 text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                <CardContent className="p-8 sm:p-10 relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                    <div>
                        <Badge className="bg-white/20 text-white hover:bg-white/30 border-none mb-3 font-black tracking-widest uppercase text-[10px]">
                            Área do Professor
                        </Badge>
                        <h1 className="text-3xl sm:text-4xl font-black mb-2 leading-tight">
                            Olá, Prof. {teacherData?.full_name?.split(' ')[0]} 👋
                        </h1>
                        <p className="text-amber-100 font-medium">
                            Bem-vindo(a) ao seu painel. Você tem {classes.length} turma(s) ativas no momento.
                        </p>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* Turmas do Professor */}
                <Card className="rounded-3xl border-none shadow-premium lg:col-span-2">
                    <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-slate-800 dark:text-white">
                            <Users2 className="w-4 h-4 text-amber-500" />
                            Minhas Turmas
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="h-[400px]">
                            {classes.length > 0 ? (
                                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {classes.map((cls) => (
                                        <div key={cls.id} className="p-6">
                                            <div className="flex items-center justify-between mx-bottom-4 mb-4">
                                                <div>
                                                    <h3 className="text-lg font-black text-slate-800 dark:text-white">{cls.name}</h3>
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{cls.level}</p>
                                                </div>
                                                <Badge variant="outline" className="bg-slate-50 dark:bg-slate-900 border-none">
                                                    {cls.students?.length || 0} alunos
                                                </Badge>
                                            </div>

                                            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 mt-2">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Lista de Alunos</p>
                                                {cls.students && cls.students.length > 0 ? (
                                                    <div className="space-y-3">
                                                        {cls.students.map((student: any) => (
                                                            <div key={student.id} className="flex justify-between items-center bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                                                                        <UserCircle className="w-4 h-4 text-slate-400" />
                                                                    </div>
                                                                    <span className="font-bold text-sm text-slate-700 dark:text-slate-200">{student.full_name}</span>
                                                                </div>
                                                                {student.phone ? (
                                                                    <span className="text-xs text-slate-500">{student.phone}</span>
                                                                ) : (
                                                                    <span className="text-xs text-slate-400 italic">Sem contato</span>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-slate-500 italic">Nenhum aluno matriculado nesta turma.</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full space-y-3 opacity-40 grayscale">
                                    <Users2 className="w-12 h-12 text-slate-400" />
                                    <p className="text-xs font-black uppercase tracking-widest">Nenhuma turma atribuída</p>
                                </div>
                            )}
                        </ScrollArea>
                    </CardContent>
                </Card>

                {/* Calendário Resumo */}
                <Card className="rounded-3xl border-none shadow-premium">
                    <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
                        <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-slate-800 dark:text-white">
                            <CalendarDays className="w-4 h-4 text-emerald-500" />
                            Próximas Aulas
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="h-[400px]">
                            {events.length > 0 ? (
                                <div className="p-6 space-y-4">
                                    {events.map((event) => (
                                        <div key={event.id} className="flex gap-4">
                                            <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0 text-center">
                                                <span className="text-[10px] uppercase font-black tracking-tighter text-slate-400 leading-none mb-1">
                                                    {format(new Date(event.start_time), "MMM", { locale: ptBR })}
                                                </span>
                                                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 leading-none">
                                                    {format(new Date(event.start_time), "dd")}
                                                </span>
                                            </div>
                                            <div className="flex-1 space-y-1 py-1 border-b border-slate-100 dark:border-slate-800 pb-3">
                                                <p className="font-bold text-slate-800 dark:text-white leading-tight">{event.title}</p>
                                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                                    <Clock className="w-3 h-3" />
                                                    {format(new Date(event.start_time), "HH:mm")} - {format(new Date(event.end_time), "HH:mm")}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full space-y-3 opacity-40 grayscale">
                                    <CalendarDays className="w-12 h-12 text-slate-400" />
                                    <p className="text-xs font-black uppercase tracking-widest">Sua agenda está livre</p>
                                </div>
                            )}
                        </ScrollArea>
                    </CardContent>
                </Card>

                {/* Avaliações Recentes */}
                <Card className="rounded-3xl border-none shadow-premium lg:col-span-1">
                    <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-slate-800 dark:text-white">
                            <FileText className="w-4 h-4 text-blue-500" />
                            Minhas Avaliações
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="h-[250px]">
                            {evaluations.length > 0 ? (
                                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {evaluations.map((ev) => (
                                        <div key={ev.id} className="p-6">
                                            <div className="flex items-center justify-between mb-2">
                                                <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest bg-slate-50 dark:bg-slate-900 border-none">
                                                    {ev.type === 'exam' ? 'Prova' : ev.type === 'quiz' ? 'Quiz' : 'Trabalho'}
                                                </Badge>
                                                <span className="text-[10px] font-bold text-slate-400">
                                                    Máx: {ev.max_score} pts
                                                </span>
                                            </div>
                                            <p className="font-bold text-slate-800 dark:text-white">{ev.title}</p>
                                            <p className="text-xs text-slate-400 mt-1">
                                                Data: {format(new Date(ev.assessment_date), "dd/MM/yyyy")}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full space-y-3 opacity-40 grayscale">
                                    <FileText className="w-12 h-12 text-slate-400" />
                                    <p className="text-xs font-black uppercase tracking-widest">Nenhuma avaliação criada</p>
                                </div>
                            )}
                        </ScrollArea>
                    </CardContent>
                </Card>

                {/* Comunicados Recentes */}
                <Card className="rounded-3xl border-none shadow-premium lg:col-span-2">
                    <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
                        <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-slate-800 dark:text-white">
                            <MessageSquare className="w-4 h-4 text-purple-500" />
                            Mural de Avisos
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="h-[250px]">
                            {announcements.length > 0 ? (
                                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {announcements.map((ann) => (
                                        <div key={ann.id} className="p-6">
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="font-bold text-slate-800 dark:text-white">{ann.title}</h3>
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                    {format(new Date(ann.created_at), "dd MMM", { locale: ptBR })}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-600 dark:text-slate-300">
                                                {ann.content}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full space-y-3 opacity-40 grayscale">
                                    <MessageSquare className="w-12 h-12 text-slate-400" />
                                    <p className="text-xs font-black uppercase tracking-widest">Nenhum aviso geral</p>
                                </div>
                            )}
                        </ScrollArea>
                    </CardContent>
                </Card>

            </div>
        </div>
    )
}
