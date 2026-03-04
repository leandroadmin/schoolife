import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, Save, ArrowLeft, MessageCircle, Users } from "lucide-react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

interface GradingSheetProps {
    assessment: any
    onBack: () => void
}

export function GradingSheet({ assessment, onBack }: GradingSheetProps) {
    const [students, setStudents] = useState<any[]>([])
    const [criteria, setCriteria] = useState<any[]>([])
    const [grades, setGrades] = useState<Record<string, Record<string, { grade: string, comments: string }>>>({})
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        fetchData()
    }, [assessment.id])

    const fetchData = async () => {
        try {
            setLoading(true)

            // Fetch students, criteria and existing grades in parallel
            const [studentsRes, criteriaRes, gradesRes] = await Promise.all([
                supabase.from('students').select('*').eq('class_id', assessment.class_id),
                supabase.from('assessment_criteria').select('*').eq('assessment_id', assessment.id),
                supabase.from('assessment_grades').select('*').eq('assessment_id', assessment.id)
            ])

            if (studentsRes.error) throw studentsRes.error
            if (criteriaRes.error) throw criteriaRes.error
            if (gradesRes.error) throw gradesRes.error

            const studentsList = studentsRes.data || []
            setStudents(studentsList)
            setCriteria(criteriaRes.data || [])

            // Format grades into an easy-to-access object: { studentId: { criteriaId: { grade, comments } } }
            const gradesMap: any = {}
            gradesRes.data?.forEach(g => {
                if (!gradesMap[g.student_id]) gradesMap[g.student_id] = {}
                gradesMap[g.student_id][g.criteria_id] = {
                    grade: g.grade.toString(),
                    comments: g.comments || ""
                }
            })
            setGrades(gradesMap)
        } catch (error) {
            console.error('Error fetching grading data:', error)
            toast.error("Erro ao carregar planilha de notas")
        } finally {
            setLoading(false)
        }
    }

    const handleGradeChange = (studentId: string, criteriaId: string, value: string) => {
        // Validate numeric grade 0-10
        if (value !== "" && (isNaN(Number(value)) || Number(value) < 0 || Number(value) > 10)) {
            return
        }

        setGrades(prev => ({
            ...prev,
            [studentId]: {
                ...(prev[studentId] || {}),
                [criteriaId]: {
                    ...(prev[studentId]?.[criteriaId] || { comments: "" }),
                    grade: value
                }
            }
        }))
    }

    const handleSave = async () => {
        try {
            setSaving(true)
            const gradesToInsert: any[] = []

            Object.entries(grades).forEach(([studentId, criteriaMap]) => {
                Object.entries(criteriaMap).forEach(([criteriaId, data]) => {
                    if (data.grade !== "") {
                        gradesToInsert.push({
                            assessment_id: assessment.id,
                            student_id: studentId,
                            criteria_id: criteriaId,
                            grade: Number(data.grade),
                            comments: data.comments
                        })
                    }
                })
            })

            if (gradesToInsert.length === 0) {
                toast.error("Nenhuma nota inserida")
                return
            }

            // Simple upsert logic using assessment_id, student_id, criteria_id unique constraint
            const { error } = await supabase
                .from('assessment_grades')
                .upsert(gradesToInsert, { onConflict: 'assessment_id,student_id,criteria_id' })

            if (error) throw error
            toast.success("Notas salvas com sucesso!")
        } catch (error) {
            console.error('Error saving grades:', error)
            toast.error("Erro ao salvar notas")
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <Loader2 className="h-10 w-10 animate-spin text-blue-500 opacity-20" />
                <p className="text-slate-400 font-bold animate-pulse uppercase tracking-widest text-xs">Carregando planilha...</p>
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={onBack} className="rounded-xl border-none bg-slate-100 dark:bg-slate-800">
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">{assessment.title}</h1>
                        <p className="text-slate-500 text-sm">Turma: {assessment.classes?.name} • Lançamento de Notas</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-premium px-6">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        {saving ? "Salvando..." : "Salvar Notas"}
                    </Button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-premium overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                            <TableRow className="border-none">
                                <TableHead className="w-[300px] font-black uppercase text-[10px] tracking-widest text-slate-400">Aluno</TableHead>
                                {criteria.map(c => (
                                    <TableHead key={c.id} className="text-center font-black uppercase text-[10px] tracking-widest text-slate-400 min-w-[120px]">
                                        {c.name}
                                    </TableHead>
                                ))}
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {students.map((student) => (
                                <TableRow key={student.id} className="border-slate-50 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                    <TableCell className="py-4">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-10 w-10 border-2 border-white dark:border-slate-800 shadow-sm">
                                                <AvatarImage src={student.avatar_url} />
                                                <AvatarFallback className="font-bold text-slate-400 bg-slate-100">{student.full_name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-800 dark:text-slate-200">{student.full_name}</span>
                                                <span className="text-[10px] text-slate-400 font-medium">Matrícula: {student.id.substring(0, 8)}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    {criteria.map(c => (
                                        <TableCell key={c.id} className="text-center">
                                            <div className="relative group max-w-[80px] mx-auto">
                                                <Input
                                                    type="text"
                                                    value={grades[student.id]?.[c.id]?.grade || ""}
                                                    onChange={(e) => handleGradeChange(student.id, c.id, e.target.value)}
                                                    className="h-12 text-center rounded-xl bg-slate-50 border-none px-2 font-black dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 transition-all"
                                                    placeholder="-"
                                                />
                                                {/* Visual indicator for high/low grades */}
                                                {grades[student.id]?.[c.id]?.grade && (
                                                    <div className={`absolute -right-1 -top-1 w-2 h-2 rounded-full ${Number(grades[student.id]?.[c.id]?.grade) >= 6 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                                )}
                                            </div>
                                        </TableCell>
                                    ))}
                                    <TableCell>
                                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-all">
                                            <MessageCircle className="w-4 h-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                {students.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                        <div className="h-16 w-16 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-300">
                            <Users className="w-8 h-8" />
                        </div>
                        <div>
                            <p className="font-bold text-slate-800 dark:text-white">Nenhum aluno ativo nesta turma</p>
                            <p className="text-sm text-slate-400">Verifique a matrícula dos alunos na aba de Turmas.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
