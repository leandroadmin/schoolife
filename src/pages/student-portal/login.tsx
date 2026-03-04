import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { GraduationCap, Loader2, ArrowRight } from "lucide-react"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
    ;

export default function StudentLoginPage() {
    const [students, setStudents] = useState<any[]>([])
    const [selectedStudent, setSelectedStudent] = useState<string>("")
    const [loading, setLoading] = useState(false)
    const [fetching, setFetching] = useState(true)
    const navigate = useNavigate()

    useEffect(() => {
        fetchStudents()
        // If already logged in, redirect
        if (localStorage.getItem('student_id')) {
            navigate('/student/dashboard')
        }
    }, [navigate])

    async function fetchStudents() {
        try {
            setFetching(true)
            const { data, error } = await supabase
                .from('students')
                .select('id, full_name, email')
                .eq('status', 'active')
                .order('full_name')

            if (error) throw error
            setStudents(data || [])
        } catch (error) {
            console.error('Error fetching students:', error)
            toast.error("Erro ao carregar lista de alunos")
        } finally {
            setFetching(false)
        }
    }

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedStudent) {
            toast.error("Por favor, selecione um aluno para prosseguir.")
            return
        }

        setLoading(true)
        setTimeout(() => {
            localStorage.setItem('student_id', selectedStudent)
            setLoading(false)
            navigate("/student/dashboard")
        }, 800)
    }

    return (
        <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 items-center justify-center p-4">
            <div className="w-full max-w-md animate-in slide-in-from-bottom-4 duration-500">
                <div className="text-center mb-10">
                    <div className="inline-flex h-16 w-16 rounded-2xl bg-blue-600 items-center justify-center shadow-lg shadow-blue-500/20 mb-6">
                        <GraduationCap className="h-8 w-8 text-white" />
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-2">Portal do Aluno</h1>
                    <p className="text-slate-500 font-medium">Selecione seu perfil para acessar o sistema.</p>
                </div>

                <Card className="border-none shadow-2xl rounded-3xl overflow-hidden bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl">
                    <CardHeader className="bg-slate-100/50 dark:bg-slate-800/50 pb-6 border-b border-slate-200/50 dark:border-slate-700/50">
                        <CardTitle className="text-lg">Simulação de Acesso</CardTitle>
                        <CardDescription>
                            Em um ambiente real, o aluno usaria email e senha. Aqui, escolha um aluno para testar o portal.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-8 pb-8 px-8">
                        <form onSubmit={handleLogin} className="space-y-6">
                            <div className="space-y-3">
                                <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Selecionar Aluno</Label>
                                {fetching ? (
                                    <div className="h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                        <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                                    </div>
                                ) : (
                                    <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                                        <SelectTrigger className="h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 border-none px-4 text-base font-medium">
                                            <SelectValue placeholder="Escolha um aluno na lista..." />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl border-slate-200 dark:border-slate-800 max-h-[300px]">
                                            {students.map((student: any) => (
                                                <SelectItem key={student.id} value={student.id} className="rounded-xl py-3">
                                                    <span className="font-bold text-slate-700 dark:text-slate-200">{student.full_name}</span>
                                                    {student.email && <span className="text-xs text-slate-400 ml-2">({student.email})</span>}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>

                            <Button
                                type="submit"
                                disabled={loading || !selectedStudent || fetching}
                                className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 dark:shadow-none transition-all"
                            >
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        Acessar Meu Painel <ArrowRight className="w-5 h-5 ml-2" />
                                    </>
                                )}
                            </Button>

                            <div className="text-center pt-4">
                                <Button variant="link" onClick={() => navigate('/login')} className="text-slate-400 font-medium">
                                    Voltar para acesso Administrativo
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
