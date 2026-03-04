import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog"
import {
    BookOpen,
    GraduationCap,
    CalendarDays,
    MessageSquare,
    TrendingUp,
    Clock,
    CheckCircle2,
    Loader2
} from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

export default function StudentDashboardPage() {
    const studentId = localStorage.getItem('student_id')
    const [loading, setLoading] = useState(true)

    // Data states
    const [studentData, setStudentData] = useState<any>(null)
    const [classData, setClassData] = useState<any>(null)
    const [teacherData, setTeacherData] = useState<any>(null)
    const [grades, setGrades] = useState<any[]>([])
    const [announcements, setAnnouncements] = useState<any[]>([])
    const [events, setEvents] = useState<any[]>([])

    // Modal state
    const [selectedAnnouncement, setSelectedAnnouncement] = useState<any | null>(null)

    useEffect(() => {
        if (!studentId) return
        fetchAllData()
    }, [studentId])

    async function fetchAllData() {
        try {
            setLoading(true)

            // 1. Fetch Student and Enrollment Info
            const { data: student, error: studentError } = await supabase
                .from('students')
                .select('*, enrollments(*)')
                .eq('id', studentId)
                .single()

            if (studentError) throw studentError
            setStudentData(student)

            const activeClassId = student.class_id || student.enrollments?.[0]?.class_id

            if (activeClassId) {
                try {
                    const { data: classInfo } = await supabase
                        .from('classes')
                        .select('*, teachers(full_name)')
                        .eq('id', activeClassId)
                        .single()

                    setClassData(classInfo)
                    setTeacherData(classInfo?.teachers)
                } catch (err) {
                    console.error("No class found:", err)
                }
            }

            // 2. Fetch Grades
            const { data: gradesData } = await supabase
                .from('assessment_grades')
                .select(`
                    id, 
                    score, 
                    feedback,
                    assessments (id, title, date, max_score, type)
                `)
                .eq('student_id', studentId)
                .order('created_at', { ascending: false })

            setGrades(gradesData || [])

            const now = new Date().toISOString()
            const { data: annData } = await supabase
                .from('announcements')
                .select(`
                    *,
                    announcement_status(student_id, is_read)
                `)
                .lte('start_date', now)
                .gte('end_date', now)
                .order('created_at', { ascending: false })

            // Filter out 'individual' announcements if they don't explicitly apply to the student
            const relevantAnnouncements = annData?.filter((a: any) => {
                if (a.type === 'all') return true;
                return a.announcement_status.some((s: any) => s.student_id === studentId);
            }).slice(0, 5) || []

            setAnnouncements(relevantAnnouncements)

            // 4. Fetch Events (Class calendar)
            if (activeClassId) {
                const { data: eventsData } = await supabase
                    .from('calendar_events')
                    .select('*')
                    .eq('class_id', activeClassId)
                    .gte('start_time', new Date().toISOString())
                    .order('start_time', { ascending: true })
                    .limit(5)

                setEvents(eventsData || [])
            }

        } catch (error) {
            console.error("Erro ao carregar dashboard:", error)
        } finally {
            setLoading(false)
        }
    }

    // Calculate overall average
    const calculateAverage = () => {
        if (!grades.length) return 0
        const totalScore = grades.reduce((acc, curr) => acc + (curr.score || 0), 0)
        const totalMax = grades.reduce((acc, curr) => acc + (curr.assessments?.max_score || 0), 0)
        if (totalMax === 0) return 0
        return (totalScore / totalMax) * 10
    }

    const average = calculateAverage()

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        )
    }

    const handleMarkAsRead = async (annId: string, currentStatusExists: boolean) => {
        try {
            if (currentStatusExists) {
                await supabase
                    .from('announcement_status')
                    .update({ is_read: true, read_at: new Date().toISOString() })
                    .eq('announcement_id', annId)
                    .eq('student_id', studentId)
            } else {
                await supabase
                    .from('announcement_status')
                    .insert([{
                        announcement_id: annId,
                        student_id: studentId,
                        is_read: true,
                        read_at: new Date().toISOString()
                    }])
            }
            fetchAllData()
            setSelectedAnnouncement(null)
        } catch (error) {
            console.error(error)
        }
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-12">

            {/* Header Welcome Card */}
            <Card className="rounded-3xl border-none shadow-premium bg-gradient-to-br from-blue-600 to-indigo-700 text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                <CardContent className="p-8 sm:p-10 relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                    <div>
                        <Badge className="bg-white/20 text-white hover:bg-white/30 border-none mb-3 font-black tracking-widest uppercase text-[10px]">
                            Área do Aluno
                        </Badge>
                        <h1 className="text-3xl sm:text-4xl font-black mb-2 leading-tight">
                            Olá, {studentData?.full_name?.split(' ')[0]} 👋
                        </h1>
                        <p className="text-blue-100 font-medium">
                            Bem-vindo(a) ao seu portal de estudos. Acompanhe seu progresso abaixo.
                        </p>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* Turma & Desempenho */}
                <Card className="rounded-3xl border-none shadow-premium">
                    <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
                        <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-slate-800 dark:text-white">
                            <GraduationCap className="w-4 h-4 text-blue-500" />
                            Minha Turma
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        {classData ? (
                            <div className="space-y-4">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Turma Atual</p>
                                    <p className="text-lg font-bold text-slate-800 dark:text-slate-200">{classData.name}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Nível</p>
                                        <p className="font-bold text-slate-700 dark:text-slate-300">{classData.level}</p>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Professor</p>
                                        <p className="font-bold text-slate-700 dark:text-slate-300 truncate" title={teacherData?.full_name}>
                                            {teacherData?.full_name?.split(' ')[0] || 'Não definido'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-6 text-slate-400 font-medium">Você ainda não está matriculado em uma turma.</div>
                        )}

                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Resumo do Desempenho</p>
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 text-white font-black text-2xl">
                                    {average.toFixed(1)}
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800 dark:text-white">Média Geral</p>
                                    <p className="text-sm text-slate-500">Baseado em {grades.length} avaliações</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Histórico de Notas */}
                <Card className="rounded-3xl border-none shadow-premium lg:col-span-2">
                    <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-slate-800 dark:text-white">
                            <TrendingUp className="w-4 h-4 text-purple-500" />
                            Minhas Notas
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="h-[320px]">
                            {grades.length > 0 ? (
                                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {grades.map((grade) => (
                                        <div key={grade.id} className="p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <div className="space-y-1">
                                                <Badge variant="outline" className="mb-2 text-[9px] font-black uppercase tracking-widest bg-slate-50 dark:bg-slate-900 border-none">
                                                    {grade.assessments?.type === 'exam' ? 'Prova' :
                                                        grade.assessments?.type === 'quiz' ? 'Quiz' : 'Trabalho'}
                                                </Badge>
                                                <p className="font-bold text-slate-800 dark:text-white">{grade.assessments?.title}</p>
                                                <p className="text-xs text-slate-400">
                                                    {format(new Date(grade.assessments?.assessment_date || new Date()), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                                                </p>
                                            </div>
                                            <div className="text-right flex flex-col items-end">
                                                <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-xl flex items-baseline gap-1">
                                                    <span className="text-xl font-black text-slate-800 dark:text-white">{grade.score}</span>
                                                    <span className="text-xs font-bold text-slate-400">/ {grade.assessments?.max_score}</span>
                                                </div>
                                                {grade.feedback && (
                                                    <p className="text-[10px] text-slate-500 mt-2 max-w-[200px] truncate" title={grade.feedback}>
                                                        "{grade.feedback}"
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full space-y-3 opacity-40 grayscale">
                                    <BookOpen className="w-12 h-12 text-slate-400" />
                                    <p className="text-xs font-black uppercase tracking-widest">Nenhuma nota lançada</p>
                                </div>
                            )}
                        </ScrollArea>
                    </CardContent>
                </Card>

                {/* Comunicados */}
                <Card className="rounded-3xl border-none shadow-premium lg:col-span-2">
                    <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
                        <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-slate-800 dark:text-white">
                            <MessageSquare className="w-4 h-4 text-amber-500" />
                            Mural de Recados
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="h-[300px]">
                            {announcements.length > 0 ? (
                                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {announcements.map((ann) => {
                                        const isRead = ann.announcement_status.find((s: any) => s.student_id === studentId)?.is_read

                                        return (
                                            <div key={ann.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer" onClick={() => setSelectedAnnouncement(ann)}>
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex items-center gap-2">
                                                        {!isRead && <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />}
                                                        <h3 className="font-bold text-slate-800 dark:text-white">{ann.title}</h3>
                                                    </div>
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                                                        Início: {format(new Date(ann.start_date || ann.created_at), "dd/MM/yyyy HH:mm")}<br />
                                                        Fim: {format(new Date(ann.end_date || ann.created_at), "dd/MM/yyyy HH:mm")}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl mb-2 line-clamp-2">
                                                    {ann.content}
                                                </p>
                                                <div className="flex justify-end mt-3">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className={`text-xs h-8 rounded-lg ${isRead ? 'text-slate-400' : 'text-blue-600 font-bold bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20'}`}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleMarkAsRead(ann.id, !!ann.announcement_status.find((s: any) => s.student_id === studentId));
                                                        }}
                                                    >
                                                        {isRead ? <><CheckCircle2 className="w-3 h-3 mr-1" /> Marcado como lido</> : "Marcar como lido"}
                                                    </Button>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full space-y-3 opacity-40 grayscale">
                                    <MessageSquare className="w-12 h-12 text-slate-400" />
                                    <p className="text-xs font-black uppercase tracking-widest">Nenhum recado</p>
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
                        <ScrollArea className="h-[300px]">
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
                                    <p className="text-xs font-black uppercase tracking-widest">Agenda livre</p>
                                </div>
                            )}
                        </ScrollArea>
                    </CardContent>
                </Card>

            </div>
            <Dialog open={!!selectedAnnouncement} onOpenChange={(open) => !open && setSelectedAnnouncement(null)}>
                <DialogContent className="sm:max-w-[500px] rounded-[32px] p-0 overflow-hidden border-none shadow-premium">
                    {selectedAnnouncement && (() => {
                        const statusExists = selectedAnnouncement.announcement_status.find((s: any) => s.student_id === studentId);
                        const isRead = statusExists?.is_read;

                        return (
                            <>
                                <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 p-8 pb-6">
                                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-none mb-4 font-black tracking-widest uppercase text-[10px]">
                                        Comunicado Escolar
                                    </Badge>
                                    <DialogTitle className="text-2xl font-black text-slate-800 dark:text-white leading-tight mb-2">
                                        {selectedAnnouncement.title}
                                    </DialogTitle>
                                    <DialogDescription className="text-xs font-bold uppercase tracking-widest text-slate-400">
                                        Enviado em: {format(new Date(selectedAnnouncement.start_date || selectedAnnouncement.created_at), "dd/MM/yyyy 'às' HH:mm")}
                                    </DialogDescription>
                                </div>
                                <div className="p-8 space-y-6">
                                    <div className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                                        {selectedAnnouncement.content}
                                    </div>
                                </div>
                                <DialogFooter className="p-8 pt-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex justify-between gap-4">
                                    <Button
                                        variant="outline"
                                        onClick={() => setSelectedAnnouncement(null)}
                                        className="rounded-xl h-12 flex-1 font-bold text-slate-500 border-slate-200"
                                    >
                                        Fechar
                                    </Button>
                                    {!isRead && (
                                        <Button
                                            className="rounded-xl h-12 flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-500/30"
                                            onClick={() => handleMarkAsRead(selectedAnnouncement.id, !!statusExists)}
                                        >
                                            <CheckCircle2 className="w-5 h-5 mr-2" />
                                            OK, Lida
                                        </Button>
                                    )}
                                </DialogFooter>
                            </>
                        )
                    })()}
                </DialogContent>
            </Dialog>
        </div>
    )
}
