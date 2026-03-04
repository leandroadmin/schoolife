import { Bell, LogOut, Search, ShieldAlert } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function SaasHeader() {
    const navigate = useNavigate()

    return (
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-800 bg-slate-950/80 px-8 backdrop-blur-xl transition-all duration-300">
            <div className="flex flex-1 items-center gap-6">
                <div className="relative w-full max-w-md hidden md:block">
                    <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <Input
                        type="search"
                        placeholder="Buscar escolas, IDs ou planos..."
                        className="h-11 w-full rounded-2xl border-slate-800 bg-slate-900 pl-10 pr-4 text-sm text-slate-200 placeholder:text-slate-500 focus-visible:ring-1 focus-visible:ring-indigo-500/50"
                    />
                </div>
            </div>

            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" className="relative h-11 w-11 rounded-full text-slate-400 hover:bg-slate-900 hover:text-white">
                    <Bell className="h-5 w-5" />
                    <span className="absolute right-2.5 top-2.5 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                    </span>
                </Button>

                <div className="h-8 w-px bg-slate-800 hidden sm:block"></div>

                <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end hidden sm:flex">
                        <span className="text-sm font-bold text-white tracking-tight">Super Admin</span>
                        <span className="text-[10px] uppercase font-black tracking-widest text-indigo-400">Master</span>
                    </div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400">
                        <ShieldAlert className="h-5 w-5" />
                    </div>
                </div>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate('/login')}
                    className="h-11 w-11 rounded-full text-slate-400 hover:bg-red-500/10 hover:text-red-400 ml-2"
                    title="Sair do Master"
                >
                    <LogOut className="h-5 w-5" />
                </Button>
            </div>
        </header>
    )
}
