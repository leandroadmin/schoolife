import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { GraduationCap, Loader2, ArrowRight } from "lucide-react"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

export default function StudentLoginPage() {
    const [loading, setLoading] = useState(false)

    const navigate = useNavigate()

    useEffect(() => {
        // If already logged in, redirect
        if (localStorage.getItem('student_id')) {
            navigate('/student/dashboard')
        }
    }, [navigate])



    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        const form = e.target as HTMLFormElement
        const username = (form.elements.namedItem('username') as HTMLInputElement).value
        const password = (form.elements.namedItem('password') as HTMLInputElement).value

        if (!username || !password) {
            toast.error("Por favor, preencha o usuário e a senha.")
            return
        }

        setLoading(true)

        try {
            const { data, error } = await supabase
                .from('students')
                .select('id, password')
                .eq('username', username)
                .single()

            if (error || !data) {
                toast.error("Aluno não encontrado.")
                setLoading(false)
                return
            }

            if (data.password !== password) {
                toast.error("Senha incorreta.")
                setLoading(false)
                return
            }

            localStorage.setItem('student_id', data.id)
            localStorage.removeItem('teacher_id') // safety
            navigate("/student/dashboard")
        } catch (err) {
            toast.error("Erro ao validar credenciais.")
        } finally {
            setLoading(false)
        }
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
                        <CardTitle className="text-lg">Acesso Discente</CardTitle>
                        <CardDescription>
                            Entre com seu usuário e senha institucionais.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-8 pb-8 px-8">
                        <form onSubmit={handleLogin} className="space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Usuário</Label>
                                    <div className="relative">
                                        <GraduationCap className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                                        <input
                                            name="username"
                                            required
                                            placeholder="Ex: joao.silva"
                                            className="w-full h-12 rounded-xl bg-slate-100 dark:bg-slate-800 border-none pl-10 pr-4 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Senha</Label>
                                        <button type="button" onClick={() => toast.info("Por favor, solicite a redefinição de senha na secretaria da sua escola.", { description: "Seu acesso é gerenciado diretamente pela administração." })} className="text-[10px] font-bold text-blue-500 hover:text-blue-600 transition-colors uppercase tracking-widest">
                                            Esqueci a senha
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <input
                                            name="password"
                                            type="password"
                                            required
                                            placeholder="••••••••"
                                            className="w-full h-12 rounded-xl bg-slate-100 dark:bg-slate-800 border-none px-4 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 dark:shadow-none transition-all"
                            >
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        Entrar no Painel <ArrowRight className="w-5 h-5 ml-2" />
                                    </>
                                )}
                            </Button>

                            <div className="text-center pt-4 border-t border-slate-100 dark:border-slate-800">
                                <Button variant="link" onClick={() => navigate('/login')} className="text-slate-400 font-medium">
                                    Acesso Administrativo
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
