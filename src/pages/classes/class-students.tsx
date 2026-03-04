import type { Class, Enrollment, Student } from "@/types"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Check, X, Search, UserPlus, Users, Loader2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "sonner"

interface ClassStudentsProps {
    classData: Class
}

interface EnrolledStudent extends Enrollment {
    student: Student
}

export function ClassStudents({ classData }: ClassStudentsProps) {
    const [enrollments, setEnrollments] = useState<EnrolledStudent[]>([])
    const [loading, setLoading] = useState(true)
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const [availableStudents, setAvailableStudents] = useState<Student[]>([])

    async function fetchEnrollments() {
        try {
            const { data, error } = await supabase
                .from('enrollments')
                .select('*, student:students(*)')
                .eq('class_id', classData.id)

            if (error) throw error
            setEnrollments(data as any)
        } catch (error) {
            console.error("Error fetching enrollments:", error)
        } finally {
            setLoading(false)
        }
    }

    async function searchStudents() {
        if (searchTerm.length < 3) return
        try {
            const { data, error } = await supabase
                .from('students')
                .select('*')
                .ilike('full_name', `%${searchTerm}%`)
                .limit(5)

            if (error) throw error

            // Filter out already enrolled students
            const enrolledIds = enrollments.map(e => e.student_id)
            const filtered = data?.filter(s => !enrolledIds.includes(s.id)) || []

            setAvailableStudents(filtered)
        } catch (error) {
            console.error(error)
        }
    }

    async function handleAddStudent(studentId: string) {
        try {
            const { error: enrollError } = await supabase
                .from('enrollments')
                .insert([{
                    class_id: classData.id,
                    student_id: studentId,
                    status: 'active'
                }])

            if (enrollError) throw enrollError

            // Explicitly link the student to the class in the students table
            const { error: studentError } = await supabase
                .from('students')
                .update({ class_id: classData.id })
                .eq('id', studentId)

            if (studentError) throw studentError

            toast.success("Aluno matriculado com sucesso!")
            setIsAddOpen(false)
            fetchEnrollments()
            setSearchTerm("")
            setAvailableStudents([])
        } catch (error) {
            console.error(error)
            toast.error("Erro ao matricular aluno.")
        }
    }

    async function updateStatus(enrollmentId: string, status: 'active' | 'locked' | 'transferred' | 'cancelled') {
        try {
            const { error } = await supabase
                .from('enrollments')
                .update({ status })
                .eq('id', enrollmentId)

            if (error) throw error

            if (status === 'transferred' || status === 'cancelled') {
                // Find studentId for this enrollment
                const { data: enrollData } = await supabase
                    .from('enrollments')
                    .select('student_id')
                    .eq('id', enrollmentId)
                    .single()

                if (enrollData?.student_id) {
                    await supabase.from('students').update({ class_id: null }).eq('id', enrollData.student_id)
                }
            }
            toast.success("Status atualizado!")
            fetchEnrollments()
        } catch (error) {
            console.error(error)
            toast.error("Erro ao atualizar status.")
        }
    }


    useEffect(() => {
        fetchEnrollments()
    }, [classData.id])

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold">Alunos Matriculados</h3>
                    <Badge variant="secondary">{enrollments.length} / {classData.max_students}</Badge>
                </div>

                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="font-bold uppercase text-[10px] tracking-widest">
                            <UserPlus className="mr-2 h-4 w-4" /> Adicionar Aluno
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="rounded-2xl border-none shadow-2xl">
                        <DialogHeader>
                            <DialogTitle>Matricular Aluno</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Buscar aluno por nome..."
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value)
                                        if (e.target.value.length >= 3) searchStudents()
                                    }}
                                    className="pl-9 rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                {availableStudents.map(student => (
                                    <div key={student.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={student.avatar_url || ""} />
                                                <AvatarFallback>{student.full_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm font-medium">{student.full_name}</span>
                                        </div>
                                        <Button size="sm" onClick={() => handleAddStudent(student.id)}>
                                            Matricular
                                        </Button>
                                    </div>
                                ))}
                                {searchTerm.length >= 3 && availableStudents.length === 0 && (
                                    <p className="text-center text-sm text-slate-400 py-4">Nenhum aluno encontrado.</p>
                                )}
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="space-y-3">
                {enrollments.map((enrollment) => (
                    <div key={enrollment.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                        <div className="flex items-center gap-4">
                            <Avatar className="h-10 w-10 border-2 border-white dark:border-slate-700 shadow-sm">
                                <AvatarImage src={enrollment.student.avatar_url || ""} />
                                <AvatarFallback className="bg-slate-100 font-bold text-slate-400">
                                    {enrollment.student.full_name.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <h4 className="font-bold text-sm text-slate-900 dark:text-white">{enrollment.student.full_name}</h4>
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${enrollment.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                                    enrollment.status === 'locked' ? 'bg-amber-100 text-amber-700' :
                                        enrollment.status === 'cancelled' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
                                    }`}>
                                    {enrollment.status === 'active' ? 'Ativo' :
                                        enrollment.status === 'locked' ? 'Trancado' :
                                            enrollment.status === 'transferred' ? 'Transferido' : 'Cancelado'}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {enrollment.status === 'active' && (
                                <>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-500 hover:text-amber-600 hover:bg-amber-50" onClick={() => updateStatus(enrollment.id, 'locked')} title="Trancar Matrícula">
                                        <div className="h-4 w-4 rounded-full border-2 border-current" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50" onClick={() => updateStatus(enrollment.id, 'cancelled')} title="Cancelar Matrícula">
                                        <X className="h-4 w-4" />
                                    </Button>
                                </>
                            )}
                            {(enrollment.status === 'locked' || enrollment.status === 'cancelled') && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50" onClick={() => updateStatus(enrollment.id, 'active')} title="Reativar Matrícula">
                                    <Check className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                ))}

                {enrollments.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                        <Users className="h-10 w-10 mx-auto mb-3 opacity-20" />
                        <p className="text-sm">Nenhum aluno matriculado nesta turma.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
