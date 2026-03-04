import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import type { Class, ClassLesson, Student } from "@/types"
import {
    Users,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Save,
    ClipboardList,
    BarChart3,
    Search,
    User,
    Loader2,
    CalendarDays
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

type AttendanceStatus = "present" | "absent" | "justified"

interface StudentWithAttendance extends Student {
    attendance_status?: AttendanceStatus
    attendance_notes?: string
}

export default function AttendancePage() {
    const [classes, setClasses] = useState<Class[]>([])
    const [selectedClassId, setSelectedClassId] = useState<string>("")
    const [lessons, setLessons] = useState<ClassLesson[]>([])
    const [selectedLessonId, setSelectedLessonId] = useState<string>("")
    const [students, setStudents] = useState<StudentWithAttendance[]>([])
    const [loading, setLoading] = useState(false)
    const [loadingStudents, setLoadingStudents] = useState(false)
    const [saving, setSaving] = useState(false)

    // Context
    const teacherId = localStorage.getItem('teacher_id')

    // Load classes on mount
    useEffect(() => {
        const fetchClasses = async () => {
            let query = supabase.from('classes').select('*').order('name')

            if (teacherId) {
                query = query.eq('teacher_id', teacherId)
            }

            const { data, error } = await query

            if (error) {
                toast.error("Erro ao carregar turmas")
                return
            }
            if (data) setClasses(data)
        }
        fetchClasses()
    }, [teacherId])

    // Load lessons when class changes
    useEffect(() => {
        if (!selectedClassId) return

        const fetchLessons = async () => {
            setLoading(true)
            const { data, error } = await supabase
                .from('class_lessons')
                .select('*')
                .eq('class_id', selectedClassId)
                .order('date', { ascending: false })

            if (error) {
                toast.error("Erro ao carregar aulas")
            } else if (data) {
                setLessons(data)
                // Select most recent lesson automatically if none selected or if class changed
                if (data.length > 0) {
                    setSelectedLessonId(data[0].id)
                } else {
                    setSelectedLessonId("")
                }
            }
            setLoading(false)
        }
        fetchLessons()
    }, [selectedClassId])

    // Load students and their attendance status when lesson changes
    useEffect(() => {
        if (!selectedClassId || !selectedLessonId) {
            setStudents([])
            return
        }

        const fetchStudentsAndAttendance = async () => {
            setLoadingStudents(true)
            try {
                // 1. Get all students enrolled in this class
                const { data: enrolledStudentsData, error: studentError } = await supabase
                    .from('students')
                    .select('*')
                    .eq('class_id', selectedClassId)

                if (studentError) throw studentError

                // Extract student objects from the enrollments join
                const enrolledStudents = enrolledStudentsData || []

                // 2. Get attendance records for this lesson
                const { data: attendanceData, error: attendanceError } = await supabase
                    .from('attendance')
                    .select('*')
                    .eq('lesson_id', selectedLessonId)

                if (attendanceError) throw attendanceError

                // 3. Map attendance to students
                const studentsWithStatus = enrolledStudents.map(student => {
                    const record = attendanceData?.find(a => a.student_id === student.id)
                    return {
                        ...student,
                        attendance_status: record?.status as AttendanceStatus || undefined,
                        attendance_notes: record?.notes || ""
                    }
                })

                setStudents(studentsWithStatus)
            } catch (error) {
                console.error(error)
                toast.error("Erro ao carregar chamada")
            } finally {
                setLoadingStudents(false)
            }
        }
        fetchStudentsAndAttendance()
    }, [selectedClassId, selectedLessonId])

    const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
        setStudents(prev => prev.map(s =>
            s.id === studentId ? { ...s, attendance_status: status } : s
        ))
    }

    const handleNotesChange = (studentId: string, notes: string) => {
        setStudents(prev => prev.map(s =>
            s.id === studentId ? { ...s, attendance_notes: notes } : s
        ))
    }

    const saveAttendance = async () => {
        if (!selectedLessonId || !selectedClassId) return

        setSaving(true)
        try {
            const lesson = lessons.find(l => l.id === selectedLessonId)
            const attendanceRecords = students
                .filter(s => s.attendance_status) // Only save those with a status
                .map(s => ({
                    class_id: selectedClassId,
                    lesson_id: selectedLessonId,
                    student_id: s.id,
                    date: lesson?.date,
                    status: s.attendance_status,
                    notes: s.attendance_notes
                }))

            // Delete old records for this lesson first to avoid duplicates
            await supabase
                .from('attendance')
                .delete()
                .eq('lesson_id', selectedLessonId)

            // Insert new records
            const { error } = await supabase
                .from('attendance')
                .insert(attendanceRecords)

            if (error) throw error

            toast.success("Chamada salva com sucesso!")
        } catch (error) {
            console.error(error)
            toast.error("Erro ao salvar chamada")
        } finally {
            setSaving(false)
        }
    }

    const getStatusBadge = (status?: AttendanceStatus) => {
        switch (status) {
            case "present": return <Badge className="bg-emerald-500 hover:bg-emerald-600 border-none font-bold uppercase tracking-widest text-[10px]">Presente</Badge>
            case "absent": return <Badge className="bg-rose-500 hover:bg-rose-600 border-none font-bold uppercase tracking-widest text-[10px]">Falta</Badge>
            case "justified": return <Badge className="bg-amber-500 hover:bg-amber-600 border-none font-bold uppercase tracking-widest text-[10px]">Justificada</Badge>
            default: return <Badge variant="outline" className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Não Feita</Badge>
        }
    }

    return (
        <div className="space-y-8 p-8 max-w-7xl mx-auto">
            {/* Header section with Premium Aesthetic */}
            <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary to-emerald-600 rounded-[2rem] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative p-8 rounded-[1.8rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                                <ClipboardList className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-black tracking-tight text-slate-800 dark:text-white">Presença</h1>
                                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Controle de frequência e relatórios diários</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Tabs defaultValue="chamada" className="space-y-6">
                <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border-none h-14 w-full md:w-fit">
                    <TabsTrigger value="chamada" className="rounded-xl px-8 font-bold data-[state=active]:bg-white data-[state=active]:shadow-lg dark:data-[state=active]:bg-slate-900 flex items-center gap-2">
                        <ClipboardList className="h-4 w-4" /> Chamada
                    </TabsTrigger>
                    <TabsTrigger value="relatorios" className="rounded-xl px-8 font-bold data-[state=active]:bg-white data-[state=active]:shadow-lg dark:data-[state=active]:bg-slate-900 flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" /> Relatórios
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="chamada" className="space-y-6">
                    <Card className="rounded-[2rem] border-none shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden bg-slate-50/50 dark:bg-slate-800/30">
                        <CardHeader className="bg-white dark:bg-slate-900 p-8 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex flex-col md:flex-row md:items-end gap-6">
                                <div className="space-y-2 flex-1">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Selecione a Turma</Label>
                                    <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                                        <SelectTrigger className="h-12 rounded-xl bg-slate-50/50 border-none shadow-inner font-bold">
                                            <SelectValue placeholder="Escolha uma turma" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {classes.map(c => (
                                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2 flex-1">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Aula / Data</Label>
                                    <Select
                                        value={selectedLessonId}
                                        onValueChange={setSelectedLessonId}
                                        disabled={!selectedClassId || loading}
                                    >
                                        <SelectTrigger className="h-12 rounded-xl bg-slate-50/50 border-none shadow-inner font-bold">
                                            <SelectValue placeholder={loading ? "Carregando..." : "Selecione a aula"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {lessons.map(l => (
                                                <SelectItem key={l.id} value={l.id}>
                                                    {new Date(l.date + "T00:00:00").toLocaleDateString('pt-BR')} — {l.status === 'completed' ? 'Realizada' : 'Agendada'}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button
                                    onClick={saveAttendance}
                                    disabled={saving || !selectedLessonId || students.length === 0}
                                    className="h-12 px-8 rounded-xl font-bold bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 transition-all flex items-center gap-2"
                                >
                                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                    Salvar Chamada
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {loadingStudents ? (
                                <div className="p-20 flex flex-col items-center justify-center gap-4 text-slate-400">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    <p className="font-bold text-sm tracking-widest uppercase">Carregando chamada...</p>
                                </div>
                            ) : selectedLessonId ? (
                                students.length > 0 ? (
                                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {students.map(student => (
                                            <div key={student.id} className="p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-6 hover:bg-white dark:hover:bg-slate-900/50 transition-colors">
                                                <div className="flex items-center gap-4 flex-1">
                                                    <div className="h-14 w-14 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-center">
                                                        {student.avatar_url ? (
                                                            <img src={student.avatar_url} alt={student.full_name} className="h-full w-full rounded-2xl object-cover" />
                                                        ) : (
                                                            <User className="h-6 w-6 text-slate-300" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-800 dark:text-white">{student.full_name}</h4>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            {getStatusBadge(student.attendance_status)}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col gap-3 md:w-1/3">
                                                    <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
                                                        <Button
                                                            variant={student.attendance_status === 'present' ? 'default' : 'ghost'}
                                                            size="sm"
                                                            onClick={() => handleStatusChange(student.id, 'present')}
                                                            className={`h-9 px-4 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all ${student.attendance_status === 'present' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-md shadow-emerald-200 dark:shadow-none' : 'text-slate-500'}`}
                                                        >
                                                            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Presente
                                                        </Button>
                                                        <Button
                                                            variant={student.attendance_status === 'absent' ? 'default' : 'ghost'}
                                                            size="sm"
                                                            onClick={() => handleStatusChange(student.id, 'absent')}
                                                            className={`h-9 px-4 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all ${student.attendance_status === 'absent' ? 'bg-rose-500 hover:bg-rose-600 shadow-md shadow-rose-200 dark:shadow-none' : 'text-slate-500'}`}
                                                        >
                                                            <XCircle className="h-3.5 w-3.5 mr-1.5" /> Falta
                                                        </Button>
                                                        <Button
                                                            variant={student.attendance_status === 'justified' ? 'default' : 'ghost'}
                                                            size="sm"
                                                            onClick={() => handleStatusChange(student.id, 'justified')}
                                                            className={`h-9 px-4 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all ${student.attendance_status === 'justified' ? 'bg-amber-500 hover:bg-amber-600 shadow-md shadow-amber-200 dark:shadow-none' : 'text-slate-500'}`}
                                                        >
                                                            <AlertCircle className="h-3.5 w-3.5 mr-1.5" /> Justificada
                                                        </Button>
                                                    </div>
                                                </div>

                                                <div className="flex-1">
                                                    <Textarea
                                                        placeholder="Observações... (ex: aluno passou mal)"
                                                        value={student.attendance_notes || ""}
                                                        onChange={(e) => handleNotesChange(student.id, e.target.value)}
                                                        className="h-16 rounded-xl bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-xs shadow-sm focus:ring-primary/20"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-20 flex flex-col items-center justify-center gap-4 text-slate-400">
                                        <Users className="h-12 w-12 opacity-20" />
                                        <div className="text-center">
                                            <p className="font-bold text-slate-600 dark:text-slate-300">Nenhum aluno matriculado</p>
                                            <p className="text-xs">Não há alunos registrados nesta turma.</p>
                                        </div>
                                    </div>
                                )
                            ) : (
                                <div className="p-20 flex flex-col items-center justify-center gap-4 text-slate-400">
                                    <CalendarDays className="h-12 w-12 opacity-20" />
                                    <div className="text-center">
                                        <p className="font-bold text-slate-600 dark:text-slate-300">Selecione uma aula</p>
                                        <p className="text-xs">Escolha a turma e a data para iniciar a chamada.</p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="relatorios" className="space-y-6">
                    <AttendanceReport selectedClassId={selectedClassId} classes={classes} />
                </TabsContent>
            </Tabs>
        </div>
    )
}

function AttendanceReport({ selectedClassId, classes }: { selectedClassId: string, classes: Class[] }) {
    const [stats, setStats] = useState<any[]>([])
    const [availableDates, setAvailableDates] = useState<string[]>([])
    const [selectedDate, setSelectedDate] = useState<string>("all")
    const [loading, setLoading] = useState(false)
    const [localClassId, setLocalClassId] = useState(selectedClassId)

    useEffect(() => {
        setLocalClassId(selectedClassId)
        setSelectedDate("all") // Reset date filter when class changes
    }, [selectedClassId])

    // Fetch available dates for the selected class
    useEffect(() => {
        if (!localClassId) return

        const fetchAvailableDates = async () => {
            const { data, error } = await supabase
                .from('attendance')
                .select('date')
                .eq('class_id', localClassId)

            if (error) {
                console.error(error)
                return
            }

            if (data) {
                // Get unique dates and sort them descending (most recent first)
                const uniqueDates = Array.from(new Set(data.map(d => d.date)))
                    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
                setAvailableDates(uniqueDates)
            }
        }
        fetchAvailableDates()
    }, [localClassId])

    useEffect(() => {
        if (!localClassId) return

        const fetchReport = async () => {
            setLoading(true)
            try {
                // 1. Get attendance records for the class
                let query = supabase
                    .from('attendance')
                    .select('*, students(full_name)')
                    .eq('class_id', localClassId)

                if (selectedDate !== "all") {
                    query = query.eq('date', selectedDate)
                }

                const { data: records, error: recordsError } = await query

                if (recordsError) throw recordsError

                // 2. Process records per student
                const studentStatsMap: Record<string, any> = {}
                records?.forEach(record => {
                    const sId = record.student_id
                    if (!studentStatsMap[sId]) {
                        studentStatsMap[sId] = {
                            id: sId,
                            name: record.students?.full_name,
                            present: 0,
                            absent: 0,
                            justified: 0,
                            total: 0,
                            dates: []
                        }
                    }
                    studentStatsMap[sId][record.status]++
                    studentStatsMap[sId].total++
                    if (!studentStatsMap[sId].dates.includes(record.date)) {
                        studentStatsMap[sId].dates.push(record.date)
                    }
                })

                const processedStats = Object.values(studentStatsMap).map(s => ({
                    ...s,
                    presencePercentage: s.total > 0 ? (s.present / s.total) * 100 : 0
                })).sort((a, b) => b.absent - a.absent) // Default sort by absences ranking

                setStats(processedStats)
            } catch (error) {
                console.error(error)
                toast.error("Erro ao gerar relatório")
            } finally {
                setLoading(false)
            }
        }
        fetchReport()
    }, [localClassId, selectedDate])

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end gap-4 bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800">
                <div className="space-y-2 flex-1 max-w-xs">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Filtrar por Turma</Label>
                    <Select value={localClassId} onValueChange={setLocalClassId}>
                        <SelectTrigger className="h-12 rounded-xl bg-slate-50/50 border-none shadow-inner font-bold">
                            <SelectValue placeholder="Escolha uma turma" />
                        </SelectTrigger>
                        <SelectContent>
                            {classes.map(c => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2 flex-1 max-w-xs">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Filtrar por Data</Label>
                    <Select value={selectedDate} onValueChange={setSelectedDate}>
                        <SelectTrigger className="h-12 rounded-xl bg-slate-50/50 border-none shadow-inner font-bold">
                            <SelectValue placeholder="Todas as Datas" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas as Datas</SelectItem>
                            {availableDates.map(date => (
                                <SelectItem key={date} value={date}>
                                    {new Date(date + "T00:00:00").toLocaleDateString('pt-BR')}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="rounded-[2rem] border-none shadow-xl shadow-slate-200/50 dark:shadow-none bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                    <CardContent className="p-8">
                        <Users className="h-8 w-8 text-white/20 mb-4" />
                        <h3 className="text-3xl font-black">{stats.length}</h3>
                        <p className="text-indigo-100 text-sm font-bold uppercase tracking-widest mt-1">Alunos Monitorados</p>
                    </CardContent>
                </Card>
                <Card className="rounded-[2rem] border-none shadow-xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-900">
                    <CardContent className="p-8">
                        <ArrowTrendingUp className="h-8 w-8 text-emerald-500 mb-4" />
                        <h3 className="text-3xl font-black text-slate-800 dark:text-white">
                            {stats.length > 0 ? (stats.reduce((acc, s) => acc + s.presencePercentage, 0) / stats.length).toFixed(1) : 0}%
                        </h3>
                        <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-1">Média de Presença</p>
                    </CardContent>
                </Card>
                <Card className="rounded-[2rem] border-none shadow-xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-900">
                    <CardContent className="p-8">
                        <AlertCircle className="h-8 w-8 text-rose-500 mb-4" />
                        <h3 className="text-3xl font-black text-slate-800 dark:text-white">
                            {stats.reduce((acc, s) => acc + s.absent, 0)}
                        </h3>
                        <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-1">Faltas Totais</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="rounded-[2rem] border-none shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden bg-white dark:bg-slate-900">
                <CardHeader className="p-8 border-b border-slate-50 dark:border-slate-800">
                    <CardTitle className="text-xl font-black tracking-tight flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-primary" />
                        {selectedDate === "all" ? "Ranking de Frequência Geral" : `Frequência do dia ${new Date(selectedDate + "T00:00:00").toLocaleDateString('pt-BR')}`}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-20 flex flex-col items-center justify-center gap-4 text-slate-400">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="font-bold text-sm tracking-widest uppercase">Gerando dados...</p>
                        </div>
                    ) : stats.length > 0 ? (
                        <div className="divide-y divide-slate-50 dark:divide-slate-800">
                            {stats.map((s, index) => (
                                <div key={s.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center gap-6">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-400">
                                        #{index + 1}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-slate-800 dark:text-white">{s.name}</h4>
                                        <div className="flex flex-col gap-2 mt-1">
                                            <div className="flex gap-4">
                                                <span className="text-[10px] font-bold text-emerald-500 uppercase">{s.present} Presenças</span>
                                                <span className="text-[10px] font-bold text-rose-500 uppercase">{s.absent} Faltas</span>
                                                <span className="text-[10px] font-bold text-amber-500 uppercase">{s.justified} Justificadas</span>
                                            </div>
                                            {selectedDate === "all" && s.dates.length > 0 && (
                                                <div className="flex items-center gap-1">
                                                    <CalendarDays className="h-3 w-3 text-slate-400" />
                                                    <span className="text-[9px] text-slate-400 font-medium">
                                                        Dias: {s.dates.map((d: string) => new Date(d + "T00:00:00").toLocaleDateString('pt-BR')).join(', ')}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right flex flex-col items-end gap-2">
                                        <div className="text-2xl font-black text-slate-800 dark:text-white">{s.presencePercentage.toFixed(0)}%</div>
                                        <div className="w-32 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${s.presencePercentage > 75 ? 'bg-emerald-500' : s.presencePercentage > 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                                style={{ width: `${s.presencePercentage}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-20 flex flex-col items-center justify-center gap-4 text-slate-400">
                            <Search className="h-12 w-12 opacity-20" />
                            <p className="text-sm font-bold uppercase tracking-widest">Nenhum dado encontrado para esta turma</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

function ArrowTrendingUp(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
            <polyline points="16 7 22 7 22 13" />
        </svg>
    )
}
