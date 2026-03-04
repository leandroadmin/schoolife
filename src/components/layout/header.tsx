import { Bell, User } from "lucide-react"

export function Header() {
    return (
        <header className="sticky top-0 z-30 flex h-20 w-full items-center justify-between px-8 bg-background/80 backdrop-blur-md">
            <div className="flex items-center gap-4 flex-1">
                {/* Search bar removed by request */}
            </div>

            <div className="flex items-center gap-6">
                <button className="relative group rounded-xl p-2.5 hover:bg-slate-100 dark:hover:bg-slate-900 transition-all active:scale-95">
                    <Bell className="h-5 w-5 text-slate-600 dark:text-slate-400 group-hover:text-primary transition-colors" />
                    <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-white dark:ring-slate-950"></span>
                </button>

                <div className="flex items-center gap-4 h-11 px-1.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-900 transition-all cursor-pointer group">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/20 overflow-hidden text-white">
                        <User className="h-5 w-5" />
                    </div>
                    <div className="hidden sm:block">
                        <p className="text-sm font-bold text-slate-900 dark:text-white leading-none mb-1">Admin Escola</p>
                        <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 tracking-wider uppercase">Diretor</p>
                    </div>
                </div>
            </div>
        </header>
    )
}
