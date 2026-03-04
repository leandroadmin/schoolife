import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users2, Loader2, ArrowRight } from "lucide-react"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import type { Teacher } from "@/types"

export default function TeacherLoginPage() {
    const [teachers, setTeachers] = useState<Teacher[]>([])
    const [selectedTeacher, setSelectedTeacher] = useState<string>("")
    const [loading, setLoading] = useState(false)
    const [fetching, setFetching] = useState(true)
    const navigate = useNavigate()

    useEffect(() => {
        fetchTeachers()
        // If already logged in, redirect
        if (localStorage.getItem('teacher_id')) {
            navigate('/teacher/dashboard')
        }
    }, [navigate])

    async function fetchTeachers() {
        try {
            setFetching(true)
            const { data, error } = await supabase
                .from('teachers')
                .select('id, full_name, email')
                .eq('status', 'active')
                .order('full_name')

            if (error) throw error
            setTeachers(data as Teacher[] || [])
        } catch (error) {
            console.error('Error fetching teachers:', error)
            toast.error("Erro ao carregar lista de professores")
        } finally {
            setFetching(false)
        }
    }

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedTeacher) {
            toast.error("Por favor, selecione um professor para prosseguir.")
            return
        }

        setLoading(true)
        setTimeout(() => {
            localStorage.setItem('teacher_id', selectedTeacher)
            // also ensure student login is cleared if testing
            localStorage.removeItem('student_id')
            setLoading(false)
            navigate("/teacher/dashboard")
        }, 800)
    }

    return (
        <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 items-center justify-center p-4">
            <div className="w-full max-w-md animate-in slide-in-from-bottom-4 duration-500">
                <div className="text-center mb-10">
                    <div className="inline-flex h-16 w-16 rounded-2xl bg-amber-500 items-center justify-center shadow-lg shadow-amber-500/20 mb-6">
                        <Users2 className="h-8 w-8 text-white" />
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-2">Portal do Professor</h1>
                    <p className="text-slate-500 font-medium">Acesso restrito para docentes.</p>
                </div>

                <Card className="border-none shadow-2xl rounded-3xl overflow-hidden bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl">
                    <CardHeader className="bg-slate-100/50 dark:bg-slate-800/50 pb-6 border-b border-slate-200/50 dark:border-slate-700/50">
                        <CardTitle className="text-lg">Simulação de Acesso</CardTitle>
                        <CardDescription>
                            Escolha um professor para entrar no perfil. Opcional para fins de testes rápidos do painel.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-8 pb-8 px-8">
                        <form onSubmit={handleLogin} className="space-y-6">
                            <div className="space-y-3">
                                <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Selecionar Professor</Label>
                                {fetching ? (
                                    <div className="h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                        <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                                    </div>
                                ) : (
                                    <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                                        <SelectTrigger className="h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 border-none px-4 text-base font-medium">
                                            <SelectValue placeholder="Escolha um professor..." />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl border-slate-200 dark:border-slate-800 max-h-[300px]">
                                            {teachers.map((teacher: any) => (
                                                <SelectItem key={teacher.id} value={teacher.id} className="rounded-xl py-3">
                                                    <span className="font-bold text-slate-700 dark:text-slate-200">{teacher.full_name}</span>
                                                    {teacher.email && <span className="text-xs text-slate-400 ml-2">({teacher.email})</span>}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>

                            <Button
                                type="submit"
                                disabled={loading || !selectedTeacher || fetching}
                                className="w-full h-14 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-bold shadow-lg shadow-amber-200 dark:shadow-none transition-all"
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
