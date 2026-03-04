import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { GraduationCap, Loader2, Users2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

export default function LoginPage() {
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const emailInput = (document.getElementById('email') as HTMLInputElement).value;
            const passwordInput = (document.getElementById('password') as HTMLInputElement).value;

            const { data, error } = await supabase.auth.signInWithPassword({
                email: emailInput,
                password: passwordInput,
            })

            if (error) {
                throw error
            }

            // Route based on role
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', data.user.id)
                .single()

            if (profile?.role === 'super_admin') {
                navigate("/saas-admin/dashboard")
            } else {
                navigate("/dashboard")
            }
        } catch (error: any) {
            console.error('Login error:', error)
            toast.error("Erro ao fazer login. Verifique suas credenciais.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
            {/* Left Side: Branding / Background */}
            <div className="hidden lg:flex flex-col justify-between w-1/2 bg-slate-900 p-12 relative text-white">
                <div className="absolute inset-0 opacity-20 pointer-events-none">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(16,185,129,0.15),transparent)]"></div>
                    <div className="absolute inset-x-0 bottom-0 h-96 bg-gradient-to-t from-emerald-500/20 to-transparent"></div>
                </div>

                <div className="z-10 flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <GraduationCap className="h-7 w-7 text-white" />
                    </div>
                    <span className="text-2xl font-black tracking-tight uppercase italic underline decoration-emerald-500 underline-offset-8">Schoolify</span>
                </div>

                <div className="z-10 max-w-lg">
                    <h2 className="text-6xl font-black leading-[1.1] mb-6 tracking-tighter">Gerencie sua escola com <span className="text-emerald-500 underline decoration-white/20 underline-offset-8">precisão digital.</span></h2>
                    <p className="text-xl text-slate-400 font-medium">O sistema operacional completo para escolas de idiomas que buscam excelência e crescimento.</p>
                </div>

                <div className="z-10 flex items-center gap-6 text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                    <span>© 2026 SCHOOLIFY INC.</span>
                    <span>PRIVACIDADE</span>
                    <span>SUPORTE</span>
                </div>
            </div>

            {/* Right Side: Login Form */}
            <div className="flex-1 flex flex-col justify-center items-center p-8 sm:p-12 animate-in-stagger">
                <div className="w-full max-w-md space-y-10">
                    <div className="lg:hidden flex items-center gap-3 mb-12">
                        <div className="h-10 w-10 rounded-xl bg-emerald-500 flex items-center justify-center">
                            <GraduationCap className="h-6 w-6 text-white" />
                        </div>
                        <span className="text-xl font-bold tracking-tight">Schoolify</span>
                    </div>

                    <div className="space-y-4">
                        <h1 className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white">Acesse o portal</h1>
                        <p className="text-slate-500 dark:text-slate-400 font-medium">Entre com suas credenciais administrativas para prosseguir.</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-xs font-bold uppercase tracking-widest text-slate-400">E-mail Corporativo</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="admin@escola.com"
                                    defaultValue="admin@escola.com"
                                    className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none px-6 text-base font-medium shadow-inner"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password" className="text-xs font-bold uppercase tracking-widest text-slate-400">Chave de Acesso</Label>
                                    <button type="button" className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 transition-colors uppercase tracking-widest">
                                        Esqueci a chave
                                    </button>
                                </div>
                                <Input
                                    id="password"
                                    type="password"
                                    defaultValue="admin123"
                                    className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none px-6 text-base font-medium shadow-inner"
                                    required
                                />
                            </div>
                        </div>

                        <Button type="submit" className="w-full h-14 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-black uppercase tracking-[0.2em] text-xs shadow-2xl transition-all hover:bg-black dark:hover:bg-slate-100 hover:scale-[1.01]" disabled={loading}>
                            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Entrar no Sistema"}
                        </Button>
                    </form>

                    <div className="pt-8 border-t border-slate-100 dark:border-slate-800 text-center space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Button variant="outline" onClick={() => navigate('/teacher/login')} className="w-full h-12 rounded-2xl border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors px-2">
                                <Users2 className="w-4 h-4 mr-2" />
                                <span className="text-xs">Professor</span>
                            </Button>
                            <Button variant="outline" onClick={() => navigate('/student/login')} className="w-full h-12 rounded-2xl border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors px-2">
                                <GraduationCap className="w-4 h-4 mr-2" />
                                <span className="text-xs">Aluno</span>
                            </Button>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400 mb-2">Ambiente de Demonstração</p>
                            <p className="text-xs font-bold text-slate-500 mb-1">Escola (Tenant): <span className="text-emerald-500">admin@escola.com</span></p>
                            <p className="text-xs font-bold text-slate-500">Super Admin (SaaS): <span className="text-indigo-500">super@admin.com</span></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
