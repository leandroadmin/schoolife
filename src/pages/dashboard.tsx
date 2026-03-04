import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { format, isToday, isTomorrow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Users, DollarSign, GraduationCap, Building2, TrendingDown, Clock, Activity, CalendarDays } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"

export function Dashboard() {
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({
        activeStudents: 0,
        activeTeachers: 0,
        activeClasses: 0,
        monthlyRevenue: 0,
        cashBalance: 0,
    })
    const [pendingPayments, setPendingPayments] = useState<any[]>([])
    const [cashflowData, setCashflowData] = useState<any[]>([])
    const [upcomingEvents, setUpcomingEvents] = useState<any[]>([])

    useEffect(() => {
        async function fetchDashboard() {
            setLoading(true)
            try {
                // 1. Active Students
                const { count: studentsCount } = await supabase
                    .from('students')
                    .select('*', { count: 'exact', head: true })
                    .eq('status', 'active')

                // 2. Teachers
                const { count: teachersCount } = await supabase
                    .from('teachers')
                    .select('*', { count: 'exact', head: true })

                // 3. Classes
                const { count: classesCount } = await supabase
                    .from('classes')
                    .select('*', { count: 'exact', head: true })
                    .eq('status', 'active')

                // 3.5 Upcoming calendar events
                const { data: upcomingEventsData } = await supabase
                    .from('calendar_events')
                    .select('*, class:classes(name)')
                    .gte('start_time', new Date().toISOString())
                    .order('start_time', { ascending: true })
                    .limit(6)

                // 4. Financials
                const { data: transactions } = await supabase
                    .from('financial_transactions')
                    .select('type, amount, status, date, due_date')

                let monthlyRevenue = 0
                let income = 0
                let expenses = 0
                let pendingList: any[] = []

                if (transactions) {
                    const today = new Date()
                    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)

                    transactions.forEach(t => {
                        const tDate = t.date ? new Date(t.date) : new Date(t.due_date)

                        if (t.status === 'paid') {
                            if (t.type === 'income') {
                                income += t.amount
                                if (tDate >= thisMonthStart) {
                                    monthlyRevenue += t.amount
                                }
                            } else if (t.type === 'expense') {
                                expenses += t.amount
                            }
                        } else if (t.status === 'pending') {
                            if (t.type === 'income' && tDate < today) {
                                pendingList.push(t)
                            }
                        }
                    })

                    // Monthly Data for Bar Chart (last 6 months)
                    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
                    const monthlyAgg: Record<string, { Receitas: number, Despesas: number, monthIndex: number }> = {}

                    for (let i = 5; i >= 0; i--) {
                        const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
                        const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`
                        monthlyAgg[key] = { Receitas: 0, Despesas: 0, monthIndex: d.getMonth() + (d.getFullYear() * 12) }
                    }

                    transactions.forEach(t => {
                        if (t.status !== 'paid') return
                        const d = t.date ? new Date(t.date + "T00:00:00") : new Date(t.due_date + "T00:00:00")
                        const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`

                        if (monthlyAgg[key]) {
                            if (t.type === 'income') monthlyAgg[key].Receitas += t.amount
                            if (t.type === 'expense') monthlyAgg[key].Despesas += t.amount
                        }
                    })

                    const formattedChartData = Object.entries(monthlyAgg)
                        .map(([name, data]) => ({ name, ...data }))
                        .sort((a, b) => a.monthIndex - b.monthIndex)

                    setCashflowData(formattedChartData)
                }

                // Sort and limit pendings to top 5 oldest
                pendingList = pendingList.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()).slice(0, 5)

                setStats({
                    activeStudents: studentsCount || 0,
                    activeTeachers: teachersCount || 0,
                    activeClasses: classesCount || 0,
                    monthlyRevenue,
                    cashBalance: income - expenses
                })
                setPendingPayments(pendingList)
                setUpcomingEvents(upcomingEventsData || [])

            } catch (error) {
                console.error("Dashboard fetch error:", error)
            } finally {
                setLoading(false)
            }
        }
        fetchDashboard()
    }, [])

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
    }

    if (loading) {
        return <div className="p-12 flex justify-center text-slate-400">Carregando painel principal...</div>
    }

    const kpis = [
        {
            title: "Alunos Ativos",
            value: stats.activeStudents.toString(),
            icon: Users,
            color: "emerald"
        },
        {
            title: "Professores",
            value: stats.activeTeachers.toString(),
            icon: Building2,
            color: "emerald"
        },
        {
            title: "Receita (Mês Atual)",
            value: formatCurrency(stats.monthlyRevenue),
            icon: DollarSign,
            color: "emerald"
        },
        {
            title: "Turmas Ativas",
            value: stats.activeClasses.toString(),
            icon: GraduationCap,
            color: "emerald"
        }
    ]

    return (
        <div className="space-y-8 animate-in-stagger pb-12">
            <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Dashboard Geral</h1>
                <p className="text-slate-500 dark:text-slate-400 font-medium">Bem-vindo de volta, Diretor. Aqui estão os números reais da sua escola.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {kpis.map((kpi, i) => (
                    <Card key={i} className="group relative overflow-hidden border-none shadow-premium bg-white dark:bg-slate-900 transition-all hover:-translate-y-1">
                        <div className="absolute top-0 right-0 p-3 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                            <kpi.icon className="h-24 w-24" />
                        </div>
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-bold text-slate-500 dark:text-slate-400 tracking-wide uppercase">
                                {kpi.title}
                            </CardTitle>
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                                <kpi.icon className="h-5 w-5" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">{kpi.value}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4 border-none shadow-premium bg-white dark:bg-slate-900">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-xl">Fluxo de Caixa Mensal</CardTitle>
                    </CardHeader>
                    <CardContent className="h-80 pt-4 border-t border-slate-50 dark:border-slate-800">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={cashflowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={(val) => `R$${val}`} />
                                <Tooltip formatter={(val: any) => [formatCurrency(Number(val || 0)), ""]} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Bar dataKey="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30} />
                                <Bar dataKey="Despesas" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={30} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                <Card className="col-span-3 border-none shadow-premium bg-white dark:bg-slate-900">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-xl flex items-center gap-2 text-rose-600">
                            <TrendingDown className="w-5 h-5" /> Pendências Financeiras
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="border-t border-slate-50 dark:border-slate-800 pt-6">
                        {pendingPayments.length > 0 ? (
                            <div className="space-y-4">
                                {pendingPayments.map((p, i) => {
                                    const delayDays = Math.floor((new Date().getTime() - new Date(p.due_date).getTime()) / (1000 * 3600 * 24))
                                    return (
                                        <div key={i} className="flex flex-col gap-1 group cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 p-3 rounded-xl transition-colors">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Boleto Atrasado</p>
                                                </div>
                                                <div className="text-sm font-black text-rose-600 dark:text-rose-400">{formatCurrency(p.amount)}</div>
                                            </div>
                                            <div className="flex items-center gap-1 text-xs font-semibold text-slate-500 pl-4">
                                                <Clock className="w-3 h-3" /> Atrasado há {delayDays} dias ({new Date(p.due_date).toLocaleDateString('pt-BR')})
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-10 opacity-50 grayscale">
                                <Activity className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                                <p className="text-sm font-bold text-slate-600">Nenhum pagamento atrasado!</p>
                            </div>
                        )}
                        <Button variant="outline" className="w-full mt-6 bg-slate-50 dark:bg-slate-800 font-bold uppercase tracking-widest text-[11px]" onClick={() => window.location.href = '/financial'}>
                            Acessar Financeiro Completo
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Calendar Events Row */}
            <Card className="border-none shadow-premium bg-white dark:bg-slate-900">
                <CardHeader className="pb-4 border-b border-slate-50 dark:border-slate-800">
                    <CardTitle className="text-xl flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                        <CalendarDays className="w-5 h-5" /> Agenda de Aulas e Eventos
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    {upcomingEvents.length > 0 ? (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {upcomingEvents.map((event) => {
                                const evtDate = new Date(event.start_time)
                                const endDate = new Date(event.end_time)
                                const isEvtToday = isToday(evtDate)
                                const isEvtTom = isTomorrow(evtDate)

                                return (
                                    <div key={event.id} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl flex flex-col gap-3 group hover:bg-white hover:shadow-lg dark:hover:bg-slate-800 transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-700">
                                        <div className="flex justify-between items-start">
                                            <div className="flex flex-col">
                                                <h4 className="font-bold text-slate-800 dark:text-white line-clamp-1">{event.title}</h4>
                                                <p className="text-xs font-semibold text-indigo-500 uppercase flex items-center gap-1 mt-0.5">
                                                    {event.class?.name || (event.type === 'holiday' ? 'Feriado' : 'Evento Geral')}
                                                </p>
                                            </div>
                                            {(isEvtToday || isEvtTom) && (
                                                <span className={cn(
                                                    "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
                                                    isEvtToday ? "bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400" : "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400"
                                                )}>
                                                    {isEvtToday ? "HOJE" : "AMANHÃ"}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 mt-auto">
                                            <CalendarDays className="w-4 h-4" />
                                            <span>
                                                {format(evtDate, "dd 'de' MMMM", { locale: ptBR })} • {format(evtDate, "HH:mm")} às {format(endDate, "HH:mm")}
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-12 opacity-50 grayscale">
                            <CalendarDays className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                            <p className="text-sm font-bold text-slate-600">Nenhum evento agendado para os próximos dias.</p>
                        </div>
                    )}
                    <Button variant="outline" className="w-full mt-6 bg-slate-50 dark:bg-slate-800 font-bold uppercase tracking-widest text-[11px]" onClick={() => window.location.href = '/calendar'}>
                        Ver Calendário Completo
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
