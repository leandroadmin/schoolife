import { Building2, LayoutDashboard, Settings, Users2, ShieldAlert } from "lucide-react"
import { useLocation, Link } from "react-router-dom"

const saasItems = [
    { icon: LayoutDashboard, label: "Painel Global", href: "/saas-admin/dashboard" },
    { icon: Building2, label: "Escolas (Tenants)", href: "/saas-admin/schools" },
    { icon: Users2, label: "Assinaturas e Planos", href: "/saas-admin/plans" },
    { icon: ShieldAlert, label: "Auditoria e Logs", href: "/saas-admin/logs" },
    { icon: Settings, label: "Configurações Master", href: "/saas-admin/settings" },
]

export function SaasSidebar() {
    const location = useLocation()

    return (
        <aside className="fixed left-4 top-4 bottom-4 z-40 w-64 rounded-3xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl shadow-2xl transition-all duration-300 ease-in-out hidden lg:flex flex-col">
            <div className="flex h-24 items-center px-8 border-b border-slate-800">
                <div className="flex items-center gap-3 w-full">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500 text-white shadow-lg shadow-indigo-500/20">
                        <Building2 className="h-6 w-6" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xl font-bold tracking-tight text-white truncate">
                            Master SaaS
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Super Admin</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-6 custom-scrollbar">
                <nav className="space-y-1.5">
                    {saasItems.map((item) => {
                        const isActive = location.pathname.startsWith(item.href)
                        return (
                            <Link
                                key={item.href}
                                to={item.href}
                                className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-bold transition-all duration-200 group ${isActive
                                    ? "bg-indigo-500/10 text-indigo-400 shadow-inner"
                                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                                    }`}
                            >
                                <item.icon className={`h-5 w-5 transition-transform duration-300 ${isActive ? "scale-110" : "group-hover:scale-110"}`} />
                                <span className="tracking-wide">{item.label}</span>
                            </Link>
                        )
                    })}
                </nav>
            </div>

            <div className="p-6 border-t border-slate-800">
                <div className="rounded-2xl bg-indigo-500/10 p-4 border border-indigo-500/20">
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">Status da Plataforma</p>
                    <p className="text-xs font-bold text-white flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        Operacional
                    </p>
                </div>
            </div>
        </aside>
    )
}
