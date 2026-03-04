import { Link, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import { useSettings } from "@/components/settings-provider"
import {
    LayoutDashboard,
    Users,
    GraduationCap,
    Calendar,
    FileText,
    DollarSign,
    Settings,
    LogOut,
    BookOpen,
    ClipboardList,
    Megaphone,
    UserPlus
} from "lucide-react"

const sidebarItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    { icon: Users, label: "Alunos", href: "/students" },
    { icon: GraduationCap, label: "Professores", href: "/teachers" },
    { icon: BookOpen, label: "Turmas", href: "/classes" },
    { icon: ClipboardList, label: "Presença", href: "/attendance" },
    { icon: Calendar, label: "Calendário", href: "/calendar" },
    { icon: FileText, label: "Avaliações", href: "/evaluations" },
    { icon: DollarSign, label: "Financeiro", href: "/financial" },
    { icon: FileText, label: "Contratos", href: "/contracts" },
    { icon: Megaphone, label: "Comunicados", href: "/announcements" },
    { icon: UserPlus, label: "Leads (CRM)", href: "/leads" },
    { icon: Settings, label: "Configurações", href: "/settings" },
]

export function Sidebar() {
    const location = useLocation()
    const { settings } = useSettings()

    console.log("Sidebar received settings:", {
        id: settings?.id,
        logo: settings?.logo_url,
        name: settings?.name
    })

    return (
        <aside className="fixed left-4 top-4 bottom-4 z-40 w-64 rounded-3xl border bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl shadow-premium transition-all duration-300 ease-in-out hidden lg:flex flex-col">
            <div className="flex h-24 items-center px-8">
                <div className="flex items-center gap-3 w-full">
                    {settings?.logo_url ? (
                        <div className="flex h-20 w-full items-center justify-start overflow-hidden py-2">
                            <img src={`${settings.logo_url}?t=${Date.now()}`} alt={settings.name || "Logo da Escola"} className="max-h-full max-w-full object-contain drop-shadow-sm" />
                        </div>
                    ) : (
                        <>
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/20">
                                <GraduationCap className="h-6 w-6" />
                            </div>
                            <span className="text-xl font-bold tracking-tight bg-gradient-to-br from-slate-900 to-slate-500 bg-clip-text text-transparent dark:from-white dark:to-slate-400 truncate">
                                {settings?.name || "Schoolify"}
                            </span>
                        </>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4 custom-scrollbar">
                <nav className="space-y-1.5">
                    {sidebarItems.map((item) => {
                        const isActive = location.pathname === item.href
                        return (
                            <Link
                                key={item.href}
                                to={item.href}
                                className={cn(
                                    "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200 group relative",
                                    isActive
                                        ? "bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]"
                                        : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white"
                                )}
                            >
                                <item.icon className={cn(
                                    "h-5 w-5 transition-transform duration-200 group-hover:scale-110",
                                    isActive ? "text-white" : "text-slate-400 dark:text-slate-500 group-hover:text-primary"
                                )} />
                                {item.label}
                                {isActive && (
                                    <span className="absolute right-3 h-1.5 w-1.5 rounded-full bg-white/50" />
                                )}
                            </Link>
                        )
                    })}
                </nav>
            </div>

            <div className="p-4 mt-auto">
                <div className="rounded-2xl bg-slate-50 dark:bg-slate-900 p-4 border border-slate-100 dark:border-slate-800">
                    <button
                        onClick={() => {
                            localStorage.removeItem('admin_authenticated')
                            window.location.href = '/login'
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 transition-all hover:bg-destructive/10 hover:text-destructive group"
                    >
                        <LogOut className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                        Sair da conta
                    </button>
                </div>
            </div>
        </aside>
    )
}
