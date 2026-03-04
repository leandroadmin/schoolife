import { useState, useEffect } from "react"
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { GraduationCap, LayoutDashboard, LogOut, PanelLeftClose, PanelLeftOpen, Loader2, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSettings } from "@/components/settings-provider"

export function StudentLayout() {
    const navigate = useNavigate()
    const location = useLocation()
    const [isSidebarOpen, setIsSidebarOpen] = useState(true)
    const [studentName, setStudentName] = useState("")
    const [loading, setLoading] = useState(true)
    const { settings } = useSettings()

    useEffect(() => {
        const studentId = localStorage.getItem('student_id')
        if (!studentId) {
            navigate('/student/login')
            return
        }

        async function fetchStudent() {
            try {
                const { data, error } = await supabase
                    .from('students')
                    .select('full_name')
                    .eq('id', studentId)
                    .single()

                if (error || !data) throw error
                setStudentName(data.full_name)
            } catch (error) {
                console.error("Erro ao carregar dados do aluno", error)
                navigate('/student/login')
            } finally {
                setLoading(false)
            }
        }

        fetchStudent()
    }, [navigate])

    const handleLogout = () => {
        localStorage.removeItem('student_id')
        navigate('/student/login')
    }

    if (loading) {
        return (
            <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        )
    }

    return (
        <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans selection:bg-blue-500/30">
            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed md:relative z-20 flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] shadow-2xl md:shadow-none",
                    isSidebarOpen ? "w-[260px] translate-x-0" : "w-[260px] -translate-x-full md:w-[80px] md:translate-x-0"
                )}
            >
                {/* Logo Area */}
                <div className="h-20 flex items-center px-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <div className="flex items-center gap-3 w-full">
                        {settings?.logo_url ? (
                            <div className="flex h-20 w-full items-center justify-start overflow-hidden py-2">
                                <img src={`${settings.logo_url}?t=${Date.now()}`} alt={settings.name || "Logo da Escola"} className="max-h-full max-w-full object-contain drop-shadow-sm" />
                            </div>
                        ) : (
                            <>
                                <div className="min-w-10 h-10 rounded-[14px] bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                                    <GraduationCap className="w-5 h-5 text-white" />
                                </div>
                                <div className={cn("flex flex-col overflow-hidden transition-opacity duration-300", !isSidebarOpen && "md:opacity-0 md:w-0")}>
                                    <span className="text-base font-black tracking-tight text-slate-900 dark:text-white uppercase leading-none truncate">{settings?.name || "Portal"}</span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">do Aluno</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Nav Links */}
                <div className="flex-1 py-8 px-4 flex flex-col gap-2 overflow-y-auto overflow-x-hidden no-scrollbar">
                    <Link to="/student/dashboard" className="block outline-none">
                        <Button
                            variant="ghost"
                            className={cn(
                                "w-full justify-start h-12 rounded-xl transition-all duration-200 group relative overflow-hidden",
                                location.pathname === "/student/dashboard"
                                    ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold"
                                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                            )}
                        >
                            {location.pathname === "/student/dashboard" && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-500 rounded-r-full" />
                            )}
                            <LayoutDashboard className={cn(
                                "w-5 h-5 transition-transform duration-200 group-hover:scale-110 shrink-0",
                                isSidebarOpen ? "mr-4" : "md:mx-auto md:mr-0 mr-4"
                            )} />
                            <span className={cn(
                                "text-sm whitespace-nowrap transition-opacity duration-200",
                                !isSidebarOpen && "md:opacity-0 md:w-0 md:hidden"
                            )}>
                                Dashboard
                            </span>
                        </Button>
                    </Link>

                    <Link to="/student/calendar" className="block outline-none">
                        <Button
                            variant="ghost"
                            className={cn(
                                "w-full justify-start h-12 rounded-xl transition-all duration-200 group relative overflow-hidden",
                                location.pathname === "/student/calendar"
                                    ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold"
                                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                            )}
                        >
                            {location.pathname === "/student/calendar" && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-500 rounded-r-full" />
                            )}
                            <Calendar className={cn(
                                "w-5 h-5 transition-transform duration-200 group-hover:scale-110 shrink-0",
                                isSidebarOpen ? "mr-4" : "md:mx-auto md:mr-0 mr-4"
                            )} />
                            <span className={cn(
                                "text-sm whitespace-nowrap transition-opacity duration-200",
                                !isSidebarOpen && "md:opacity-0 md:w-0 md:hidden"
                            )}>
                                Calendário
                            </span>
                        </Button>
                    </Link>
                </div>

                {/* User Info & Logout */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
                    <div className={cn("flex items-center gap-3 px-2 mb-4 transition-all duration-300", !isSidebarOpen && "md:justify-center")}>
                        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center shrink-0 border-2 border-white dark:border-slate-900 shadow-sm">
                            <span className="text-sm font-bold text-slate-600 dark:text-slate-400">
                                {studentName.charAt(0)}
                            </span>
                        </div>
                        <div className={cn("flex flex-col overflow-hidden", !isSidebarOpen && "md:hidden")}>
                            <span className="text-sm font-bold text-slate-900 dark:text-white truncate">{studentName}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aluno</span>
                        </div>
                    </div>

                    <Button
                        variant="ghost"
                        onClick={handleLogout}
                        className={cn(
                            "w-full h-11 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-colors group",
                            !isSidebarOpen ? "md:justify-center md:px-0" : "justify-start"
                        )}
                    >
                        <LogOut className={cn("w-4 h-4 transition-transform group-hover:-translate-x-1 shrink-0", isSidebarOpen ? "mr-3" : "md:mr-0")} />
                        <span className={cn("text-xs font-bold uppercase tracking-widest", !isSidebarOpen && "md:hidden")}>
                            Sair do Portal
                        </span>
                    </Button>
                    <div className={cn("mt-4 text-center transition-all duration-300", !isSidebarOpen && "md:hidden")}>
                        <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono">
                            v{__APP_VERSION__}
                        </p>
                    </div>
                </div>
            </aside>

            {/* Mobile overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-10 md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col h-full relative overflow-hidden bg-slate-50 dark:bg-slate-950">
                {/* Header */}
                <header className="h-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between px-6 shrink-0 z-10 sticky top-0">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="hidden md:flex rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 h-10 w-10 shrink-0"
                        >
                            {isSidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="md:hidden rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 h-10 w-10 shrink-0"
                        >
                            <LayoutDashboard className="w-5 h-5" />
                        </Button>
                        <h1 className="text-lg font-black tracking-tight text-slate-800 dark:text-white hidden sm:block">Meu Desempenho</h1>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth">
                    <div className="p-6">
                        <div className="w-full mx-auto">
                            <Outlet />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
