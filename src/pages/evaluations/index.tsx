import { useState, useEffect } from "react"
import { Plus, Search, FileText, TrendingUp, Award, Clock, Users, ChevronRight, MoreVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { X } from "lucide-react"
import { GradingSheet } from "./grading-sheet"

interface Assessment {
    id: string
    title: string
    period_type: string
    assessment_date: string
    class_id: string
    teacher_id: string
    created_at: string
    classes?: { name: string }
    average_grade?: number
    grades_count?: number
}

export default function EvaluationsPage() {
    const [assessments, setAssessments] = useState<Assessment[]>([])
    const [classes, setClasses] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [stats, setStats] = useState({
        overallAvg: 0,
        totalAssessments: 0,
        topClass: "---",
        topClassAvg: 0
    })
    const [rankings, setRankings] = useState<{ name: string, avg: number, avatar: string }[]>([])
    const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null)
    const [saving, setSaving] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")

    // Form State
    const [formData, setFormData] = useState({
        title: "",
        period_type: "monthly",
        assessment_date: new Date().toISOString().split('T')[0],
        class_id: "",
        criteria: ["Fala", "Compreensão Auditiva", "Escrita", "Gramática", "Participação"]
    })

    // Context
    const teacherId = localStorage.getItem('teacher_id')

    useEffect(() => {
        fetchData()
    }, [teacherId])

    const fetchData = async () => {
        try {
            setLoading(true)

            // Building queries based on context
            let assessmentsQuery = supabase.from('assessments').select('*, classes(name)').order('created_at', { ascending: false })
            let classesQuery = supabase.from('classes').select('id, name')

            if (teacherId) {
                // If teacher, only fetch their classes
                classesQuery = classesQuery.eq('teacher_id', teacherId)

                // Fetch the list of allowed class IDs to filter assessments
                const { data: allowedClassesData } = await supabase.from('classes').select('id').eq('teacher_id', teacherId)
                const allowedClassIds = allowedClassesData?.map(c => c.id) || []

                if (allowedClassIds.length > 0) {
                    assessmentsQuery = assessmentsQuery.in('class_id', allowedClassIds)
                } else {
                    // No classes -> no assessments
                    assessmentsQuery = assessmentsQuery.eq('class_id', '00000000-0000-0000-0000-000000000000')
                }
            }

            const [assessmentsRes, classesRes, gradesRes] = await Promise.all([
                assessmentsQuery,
                classesQuery,
                supabase.from('assessment_grades').select('assessment_id, grade')
            ])

            if (assessmentsRes.error) throw assessmentsRes.error
            if (classesRes.error) throw classesRes.error
            if (gradesRes.error) throw gradesRes.error

            // Calculate averages per assessment
            const assessmentGradesMap: Record<string, number[]> = {}
            gradesRes.data?.forEach(g => {
                if (!assessmentGradesMap[g.assessment_id]) assessmentGradesMap[g.assessment_id] = []
                assessmentGradesMap[g.assessment_id].push(g.grade)
            })

            const enrichedAssessments = assessmentsRes.data.map((a: any) => {
                const grades = assessmentGradesMap[a.id] || []
                const avg = grades.length > 0 ? grades.reduce((sum, g) => sum + g, 0) / grades.length : 0
                return {
                    ...a,
                    average_grade: Number(avg.toFixed(1)),
                    grades_count: grades.length
                }
            })

            setAssessments(enrichedAssessments)
            setClasses(classesRes.data || [])

            // Overall Stats
            const allGrades = gradesRes.data?.map(g => g.grade) || []
            const overallAvg = allGrades.length > 0 ? allGrades.reduce((sum, g) => sum + g, 0) / allGrades.length : 0

            // Student Rankings
            const studentGradesMap: Record<string, { sum: number, count: number, name: string }> = {}
            const { data: activeStudents } = await supabase.from('students').select('id, full_name')
            const studentIdToName: Record<string, string> = {}
            activeStudents?.forEach(s => { studentIdToName[s.id] = s.full_name })

            gradesRes.data?.forEach((g: any) => {
                if (!studentGradesMap[g.student_id]) {
                    studentGradesMap[g.student_id] = { sum: 0, count: 0, name: studentIdToName[g.student_id] || "Aluno" }
                }
                studentGradesMap[g.student_id].sum += g.grade
                studentGradesMap[g.student_id].count += 1
            })

            const studentRankings = Object.values(studentGradesMap)
                .map(s => ({ name: s.name, avg: Number((s.sum / s.count).toFixed(1)), avatar: "" }))
                .sort((a, b) => b.avg - a.avg)
                .slice(0, 5)

            setRankings(studentRankings)

            // Top Class Calculation
            const classGradesMap: Record<string, { sum: number, count: number, name: string }> = {}
            enrichedAssessments.forEach(a => {
                if (a.class_id && a.average_grade > 0) {
                    if (!classGradesMap[a.class_id]) {
                        classGradesMap[a.class_id] = { sum: 0, count: 0, name: a.classes?.name || "Turma" }
                    }
                    classGradesMap[a.class_id].sum += a.average_grade
                    classGradesMap[a.class_id].count += 1
                }
            })

            const sortedClasses = Object.values(classGradesMap)
                .map(c => ({ name: c.name, avg: Number((c.sum / c.count).toFixed(1)) }))
                .sort((a, b) => b.avg - a.avg)

            setStats({
                overallAvg: Number(overallAvg.toFixed(1)),
                totalAssessments: assessmentsRes.data.length,
                topClass: sortedClasses[0]?.name || "---",
                topClassAvg: sortedClasses[0]?.avg || 0
            })
        } catch (error) {
            console.error('Error fetching data:', error)
            toast.error("Erro ao carregar dados")
        } finally {
            setLoading(false)
        }
    }

    const filteredAssessments = assessments.filter(a =>
        a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.classes?.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const handleAddCriteria = () => {
        setFormData({ ...formData, criteria: [...formData.criteria, ""] })
    }

    const handleRemoveCriteria = (index: number) => {
        const newCriteria = [...formData.criteria]
        newCriteria.splice(index, 1)
        setFormData({ ...formData, criteria: newCriteria })
    }

    const handleCriteriaChange = (index: number, value: string) => {
        const newCriteria = [...formData.criteria]
        newCriteria[index] = value
        setFormData({ ...formData, criteria: newCriteria })
    }

    const handleSave = async () => {
        if (!formData.title || !formData.class_id || !formData.assessment_date) {
            toast.error("Preencha os campos obrigatórios")
            return
        }

        const validCriteria = formData.criteria.filter(c => c.trim() !== "")
        if (validCriteria.length === 0) {
            toast.error("Adicione pelo menos um critério de avaliação")
            return
        }

        try {
            setSaving(true)
            // 1. Create Assessment
            const { data: assessment, error: assessmentError } = await supabase
                .from('assessments')
                .insert([{
                    title: formData.title,
                    period_type: formData.period_type,
                    assessment_date: formData.assessment_date,
                    class_id: formData.class_id,
                }])
                .select()
                .single()

            if (assessmentError) throw assessmentError

            // 2. Create Criteria
            const criteriaToInsert = validCriteria.map(name => ({
                assessment_id: assessment.id,
                name
            }))

            const { error: criteriaError } = await supabase
                .from('assessment_criteria')
                .insert(criteriaToInsert)

            if (criteriaError) throw criteriaError

            toast.success("Avaliação configurada com sucesso")
            setIsModalOpen(false)
            fetchData()

            // Reset form
            setFormData({
                title: "",
                period_type: "monthly",
                assessment_date: new Date().toISOString().split('T')[0],
                class_id: "",
                criteria: ["Fala", "Compreensão Auditiva", "Escrita", "Gramática", "Participação"]
            })
        } catch (error) {
            console.error('Error saving assessment:', error)
            toast.error("Erro ao salvar avaliação")
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-6">
            {selectedAssessment ? (
                <GradingSheet
                    assessment={selectedAssessment}
                    onBack={() => {
                        setSelectedAssessment(null)
                        fetchData()
                    }}
                />
            ) : (
                <>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Avaliações e Desempenho</h1>
                            <p className="text-slate-500 mt-1">Gerencie os critérios de avaliação e acompanhe a evolução dos alunos.</p>
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <Button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-premium">
                                <Plus className="w-4 h-4 mr-2" /> Nova Avaliação
                            </Button>
                        </div>
                    </div>

                    {/* Stats Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="rounded-3xl border-none shadow-premium bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                            <CardHeader className="pb-2">
                                <CardDescription className="text-blue-100 font-bold uppercase text-[10px] tracking-widest">Média Geral da Escola</CardDescription>
                                <CardTitle className="text-4xl font-black">{stats.overallAvg || "---"}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-2 text-blue-100 text-xs">
                                    <TrendingUp className="w-3 h-3" />
                                    <span>Baseada em {assessments.length} avaliações</span>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="rounded-3xl border-none shadow-premium">
                            <CardHeader className="pb-2">
                                <CardDescription className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Avaliações Realizadas</CardDescription>
                                <CardTitle className="text-4xl font-black text-slate-800 dark:text-white">{stats.totalAssessments}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-2 text-slate-400 text-xs">
                                    <Clock className="w-3 h-3" />
                                    <span>Atualizado agora</span>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="rounded-3xl border-none shadow-premium">
                            <CardHeader className="pb-2">
                                <CardDescription className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Melhor Turma</CardDescription>
                                <CardTitle className="text-4xl font-black text-slate-800 dark:text-white">{stats.topClass}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-2 text-green-500 text-xs font-bold">
                                    <Award className="w-3 h-3" />
                                    <span>Média: {stats.topClassAvg || "---"}</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-premium p-6">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                                    <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                                        <FileText className="w-5 h-5 text-blue-500" />
                                        Histórico de Avaliações
                                    </h2>
                                    <div className="relative w-full sm:w-72">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <Input
                                            placeholder="Buscar por título ou turma..."
                                            className="pl-10 h-10 rounded-xl bg-slate-50 border-none dark:bg-slate-800"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {loading ? (
                                        Array.from({ length: 3 }).map((_, i) => (
                                            <div key={i} className="h-48 rounded-2xl bg-slate-50 dark:bg-slate-800 animate-pulse" />
                                        ))
                                    ) : filteredAssessments.length > 0 ? (
                                        filteredAssessments.map(item => (
                                            <Card key={item.id} className="rounded-2xl border-slate-100 dark:border-slate-800 hover:shadow-premium hover:-translate-y-1 transition-all cursor-pointer group">
                                                <CardHeader className="p-4 flex flex-row items-start justify-between space-y-0">
                                                    <div className="space-y-1">
                                                        <Badge variant="outline" className="text-[10px] uppercase font-bold text-blue-500 border-blue-100 bg-blue-50 dark:bg-blue-900/20">
                                                            {item.period_type}
                                                        </Badge>
                                                        <CardTitle className="text-lg font-black text-slate-800 dark:text-white group-hover:text-blue-600 transition-colors">
                                                            {item.title}
                                                        </CardTitle>
                                                    </div>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                                                        <MoreVertical className="w-4 h-4 text-slate-400" />
                                                    </Button>
                                                </CardHeader>
                                                <CardContent className="p-4 pt-0">
                                                    <div className="space-y-3">
                                                        <div className="flex items-center gap-2 text-sm text-slate-500">
                                                            <Users className="w-4 h-4" />
                                                            <span>Turma: <span className="font-bold text-slate-700 dark:text-slate-300">{item.classes?.name}</span></span>
                                                        </div>
                                                        <div className="flex items-center justify-between mt-4 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                                                            <div className="text-xs text-slate-400 font-bold uppercase tracking-widest pl-2">Média</div>
                                                            <div className={`text-lg font-black pr-2 ${item.average_grade && item.average_grade >= 6 ? 'text-emerald-600' : 'text-blue-600'}`}>
                                                                {item.average_grade || "---"}
                                                            </div>
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            className="w-full justify-between text-xs font-bold text-slate-400 group-hover:text-blue-500"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                setSelectedAssessment(item)
                                                            }}
                                                        >
                                                            Ver Detalhes / Lançar Notas
                                                            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                                                        </Button>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))
                                    ) : (
                                        <div className="col-span-full flex flex-col items-center justify-center py-12 text-center space-y-4">
                                            <div className="h-20 w-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-300">
                                                <FileText className="w-10 h-10" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Nenhuma avaliação encontrada</h3>
                                                <p className="text-sm text-slate-400">Crie sua primeira avaliação para começar a acompanhar o desempenho.</p>
                                            </div>
                                            <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
                                                Criar Avaliação
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Top Students Ranking Card */}
                        <div className="space-y-6">
                            <Card className="rounded-3xl border-none shadow-premium bg-white dark:bg-slate-900 overflow-hidden">
                                <CardHeader className="bg-slate-50 dark:bg-slate-800/50 p-6 border-b border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                                            <Award className="w-5 h-5 text-amber-500" />
                                            Ranking de Alunos
                                        </CardTitle>
                                        <Badge className="bg-blue-500 text-white border-none font-bold text-[10px]">TOP 5</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    {rankings.length > 0 ? (
                                        <div className="divide-y divide-slate-50 dark:divide-slate-800">
                                            {rankings.map((student, index) => (
                                                <div key={index} className="flex items-center justify-between p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`h-8 w-8 rounded-xl flex items-center justify-center font-black text-xs ${index === 0 ? 'bg-amber-100 text-amber-600' :
                                                            index === 1 ? 'bg-slate-200 text-slate-600' :
                                                                index === 2 ? 'bg-orange-100 text-orange-600' :
                                                                    'bg-slate-100 text-slate-400'
                                                            }`}>
                                                            {index + 1}º
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{student.name}</span>
                                                            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Global Avg</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-base font-black text-blue-600">{student.avg}</div>
                                                        <div className="h-1 w-12 bg-slate-100 dark:bg-slate-800 rounded-full mt-1 overflow-hidden">
                                                            <div
                                                                className="h-full bg-blue-500"
                                                                style={{ width: `${student.avg * 10}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-8 text-center space-y-2">
                                            <p className="text-sm font-bold text-slate-500">Dados insuficientes</p>
                                            <p className="text-xs text-slate-400">Continue avaliando para gerar o ranking.</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="rounded-3xl border-none shadow-premium bg-gradient-to-br from-indigo-500 to-purple-600 text-white overflow-hidden">
                                <CardContent className="p-6 space-y-4">
                                    <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                        <TrendingUp className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black tracking-tight">Evolução do Mês</h3>
                                        <p className="text-indigo-100 text-xs">A média da escola subiu 12% em relação à última semana.</p>
                                    </div>
                                    <Button variant="outline" className="w-full bg-white/10 border-white/20 hover:bg-white/20 text-white rounded-xl border-none font-bold text-xs uppercase tracking-widest">
                                        Ver Relatório Completo
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Nova Avaliação Modal */}
                    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                        <DialogContent className="max-w-2xl rounded-3xl p-0 overflow-hidden border-none shadow-premium">
                            <DialogHeader className="p-6 bg-slate-50 dark:bg-slate-800/50 border-bottom">
                                <DialogTitle className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-blue-500" />
                                    Configurar Nova Avaliação
                                </DialogTitle>
                            </DialogHeader>

                            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2 col-span-2">
                                        <Label className="text-xs font-black uppercase text-slate-400">Título da Avaliação</Label>
                                        <Input
                                            className="h-12 rounded-xl bg-slate-50 border-none px-4 font-bold dark:bg-slate-800"
                                            placeholder="Ex: Avaliação Mensal - Março"
                                            value={formData.title}
                                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black uppercase text-slate-400">Turma</Label>
                                        <Select value={formData.class_id} onValueChange={v => setFormData({ ...formData, class_id: v })}>
                                            <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none dark:bg-slate-800">
                                                <SelectValue placeholder="Selecione a turma" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-none shadow-premium">
                                                {classes.map(c => (
                                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black uppercase text-slate-400">Tipo de Período</Label>
                                        <Select value={formData.period_type} onValueChange={v => setFormData({ ...formData, period_type: v })}>
                                            <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none dark:bg-slate-800">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-none shadow-premium">
                                                <SelectItem value="weekly">Semanal</SelectItem>
                                                <SelectItem value="monthly">Mensal</SelectItem>
                                                <SelectItem value="bimonthly">Bimestral</SelectItem>
                                                <SelectItem value="yearly">Anual</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black uppercase text-slate-400">Data de Referência</Label>
                                        <Input
                                            type="date"
                                            className="h-12 rounded-xl bg-slate-50 border-none px-4 dark:bg-slate-800"
                                            value={formData.assessment_date}
                                            onChange={e => setFormData({ ...formData, assessment_date: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-black uppercase text-slate-400">Critérios de Avaliação</Label>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="rounded-lg h-8 px-3 text-[10px] font-bold uppercase tracking-widest border-slate-200 dark:border-slate-800"
                                            onClick={handleAddCriteria}
                                        >
                                            <Plus className="w-3.5 h-3.5 mr-2" />
                                            Novo Critério
                                        </Button>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {formData.criteria.map((name, index) => (
                                            <div key={index} className="flex gap-2 group">
                                                <Input
                                                    className="h-10 rounded-xl bg-slate-50 border-none px-4 text-sm font-medium dark:bg-slate-800"
                                                    placeholder="Nome do critério"
                                                    value={name}
                                                    onChange={e => handleCriteriaChange(index, e.target.value)}
                                                />
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-10 w-10 rounded-xl text-rose-500 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={() => handleRemoveCriteria(index)}
                                                >
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <DialogFooter className="p-6 bg-slate-50 dark:bg-slate-800/50 flex gap-2">
                                <Button variant="outline" onClick={() => setIsModalOpen(false)} className="rounded-xl border-none bg-white dark:bg-slate-900 font-bold">
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-premium"
                                >
                                    {saving ? "Salvando..." : "Criar Avaliação"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </>
            )}
        </div>
    )
}
