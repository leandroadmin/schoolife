import { useEffect, useState } from "react"
import { Building2, TrendingUp, Users2, Activity } from "lucide-react"
import { supabase } from "@/lib/supabase"

type School = {
    id: string
    name: string
    subdomain: string | null
    status: 'active' | 'suspended' | 'trial'
    plan_tier: string
}

export default function SaasDashboardPage() {
    const [schools, setSchools] = useState<School[]>([])
    const [loading, setLoading] = useState(true)
    const [metrics, setMetrics] = useState({
        totalSchools: 0,
        activeSessions: 1, // Mock
        mrr: "R$ 0,00"
    })

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoading(true)
                const { data, error, count } = await supabase
                    .from('schools')
                    .select('*', { count: 'exact' })
                    .order('created_at', { ascending: false })
                    .limit(5)

                if (error) throw error

                setSchools(data || [])
                setMetrics(prev => ({ ...prev, totalSchools: count || 0 }))
            } catch (error) {
                console.error("Error fetching admin dashboard:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchDashboardData()
    }, [])

    return (
        <div className="pt-8 space-y-8 animate-in-stagger">
            <div className="flex flex-col gap-2">
                <h1 className="text-4xl font-black tracking-tighter text-white">Visão Geral da Plataforma</h1>
                <p className="text-sm font-medium text-slate-400">Métricas globais de todos os tenants (escolas) ativos no SaaS.</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                    title="Escolas Ativas"
                    value={metrics.totalSchools.toString()}
                    trend="+1"
                    description="No total"
                    icon={Building2}
                    color="text-indigo-400"
                    bg="bg-indigo-500/10 border-indigo-500/20"
                />
                <MetricCard
                    title="Total de Alunos (Global)"
                    value="15"
                    trend="+5"
                    description="Matrículas recentes"
                    icon={Users2}
                    color="text-emerald-400"
                    bg="bg-emerald-500/10 border-emerald-500/20"
                />
                <MetricCard
                    title="MRR (Receita Recorrente)"
                    value="R$ 497,00"
                    trend="+12%"
                    description="Comparado ao mês anterior"
                    icon={TrendingUp}
                    color="text-amber-400"
                    bg="bg-amber-500/10 border-amber-500/20"
                />
                <MetricCard
                    title="Sessões Ativas"
                    value="1"
                    trend="Estável"
                    description="Uso simultâneo atual"
                    icon={Activity}
                    color="text-blue-400"
                    bg="bg-blue-500/10 border-blue-500/20"
                />
            </div>

            {/* Placeholder for Data Table */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-8 backdrop-blur-xl">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-white tracking-tight">Escolas Recentes</h2>
                        <p className="text-xs font-semibold text-slate-400 mt-1">Tenants registrados no sistema e seus status.</p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-400">
                        <thead className="bg-slate-950/50 text-[10px] font-black uppercase tracking-widest text-slate-500 border-y border-slate-800">
                            <tr>
                                <th className="px-6 py-4">Escola / Tenant</th>
                                <th className="px-6 py-4">Plano</th>
                                <th className="px-6 py-4">Alunos</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-5 text-center">Carregando escolas...</td>
                                </tr>
                            ) : schools.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-5 text-center">Nenhuma escola cadastrada ainda.</td>
                                </tr>
                            ) : (
                                schools.map(school => (
                                    <tr key={school.id} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-white font-bold">
                                                    {school.name.substring(0, 1).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-white">{school.name}</div>
                                                    <div className="text-[10px] uppercase font-bold text-slate-500">Cód: {school.id.split('-')[0]}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className="inline-flex items-center rounded-full bg-indigo-500/10 px-2.5 py-1 text-xs font-bold text-indigo-400 border border-indigo-500/20 uppercase">
                                                {school.plan_tier || 'BASIC'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 font-medium text-slate-300">--</td>
                                        <td className="px-6 py-5">
                                            {school.status === 'active' ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                                                    <span className="text-xs font-bold text-emerald-400">Ativa</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <div className="h-2 w-2 rounded-full bg-rose-500"></div>
                                                    <span className="text-xs font-bold text-rose-400">Suspensa</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-5 text-right flex justify-end gap-2">
                                            <button className="text-xs font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-widest border border-indigo-500/30 rounded-lg px-3 py-1.5 hover:bg-indigo-500/10 transition-colors">
                                                Detalhes
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

function MetricCard({ title, value, trend, description, icon: Icon, color, bg }: any) {
    return (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-xl flex flex-col justify-between hover:border-slate-700 transition-colors group">
            <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{title}</span>
                <div className={`p-2 rounded-xl ${bg}`}>
                    <Icon className={`h-5 w-5 ${color} transition-transform group-hover:scale-110`} />
                </div>
            </div>
            <div>
                <span className="text-3xl font-black tracking-tighter text-white">{value}</span>
                <div className="mt-2 flex items-center gap-2">
                    <span className={`text-xs font-bold ${color}`}>{trend}</span>
                    <span className="text-xs font-medium text-slate-500">{description}</span>
                </div>
            </div>
        </div>
    )
}
