import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Wallet } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, PieChart, Pie, Cell } from "recharts"

export function FinancialDashboardTab() {
    const [summary, setSummary] = useState({
        income: 0,
        expenses: 0,
        balance: 0
    })
    const [chartData, setChartData] = useState<any[]>([])
    const [expensePieData, setExpensePieData] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchDashboardData() {
            try {
                // Fetch paid and pending transactions to calculate history
                const { data: transactions, error } = await supabase
                    .from('financial_transactions')
                    .select('type, amount, status, date, category, due_date')

                if (error) throw error

                if (transactions) {
                    // Global Summary (only Paid)
                    const paidIncome = transactions
                        .filter(t => t.type === 'income' && t.status === 'paid')
                        .reduce((acc, curr) => acc + curr.amount, 0)

                    const paidExpenses = transactions
                        .filter(t => t.type === 'expense' && t.status === 'paid')
                        .reduce((acc, curr) => acc + curr.amount, 0)

                    setSummary({
                        income: paidIncome,
                        expenses: paidExpenses,
                        balance: paidIncome - paidExpenses
                    })

                    // Monthly Data for Bar Chart (last 6 months)
                    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
                    const monthlyAgg: Record<string, { Receitas: number, Despesas: number, monthIndex: number }> = {}

                    const today = new Date()
                    for (let i = 5; i >= 0; i--) {
                        const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
                        const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`
                        monthlyAgg[key] = { Receitas: 0, Despesas: 0, monthIndex: d.getMonth() + (d.getFullYear() * 12) }
                    }

                    transactions.forEach(t => {
                        if (t.status !== 'paid') return // we only chart realized cash flow
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
                        .map(({ name, Receitas, Despesas }) => ({ name, Receitas, Despesas }))

                    setChartData(formattedChartData)

                    // Expense Category Breakdown for Pie Chart
                    const categoryAgg: Record<string, number> = {}
                    transactions.forEach(t => {
                        if (t.type === 'expense' && t.status === 'paid') {
                            const cat = t.category || 'Outros'
                            categoryAgg[cat] = (categoryAgg[cat] || 0) + t.amount
                        }
                    })

                    const COLORS = ['#10b981', '#f43f5e', '#f59e0b', '#3b82f6', '#8b5cf6', '#64748b']
                    const formattedPieData = Object.entries(categoryAgg)
                        .map(([name, value], index) => ({
                            name,
                            value,
                            color: COLORS[index % COLORS.length]
                        }))
                        .sort((a, b) => b.value - a.value)

                    setExpensePieData(formattedPieData)
                }
            } catch (error) {
                console.error('Error fetching dashboard summary:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchDashboardData()
    }, [])

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(value)
    }

    if (loading) return (
        <div className="flex justify-center items-center p-12 text-slate-400">
            Carregando indicadores financeiros...
        </div>
    )

    return (
        <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
                <Card className="border-none shadow-premium bg-white dark:bg-slate-900 overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                        <TrendingUp className="h-12 w-12 text-emerald-600" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                            Receitas (Realizadas)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-emerald-600 tabular-nums">{formatCurrency(summary.income)}</div>
                        <p className="text-[11px] font-bold text-emerald-500 mt-1 uppercase">Entradas Computadas</p>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-premium bg-white dark:bg-slate-900 overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                        <TrendingDown className="h-12 w-12 text-rose-600" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                            Despesas (Pagas)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-rose-600 tabular-nums">{formatCurrency(summary.expenses)}</div>
                        <p className="text-[11px] font-bold text-rose-500 mt-1 uppercase">Saídas Computadas</p>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-premium bg-emerald-900 dark:bg-slate-950 overflow-hidden relative group text-white">
                    <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:rotate-12 transition-transform">
                        <Wallet className="h-12 w-12" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
                            Saldo Líquido Caixa
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black tabular-nums">{formatCurrency(summary.balance)}</div>
                        <p className="text-[11px] font-bold text-emerald-400 mt-1 uppercase">Disponível em Conta</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-7">
                <Card className="md:col-span-4 border-none shadow-premium bg-white dark:bg-slate-900">
                    <CardHeader>
                        <CardTitle className="text-lg font-black text-slate-800 dark:text-white">Fluxo de Caixa Mensal</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-0">
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 12, fill: '#64748B' }}
                                        tickFormatter={(value) => `R$${value}`}
                                    />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                        formatter={(value: any) => [formatCurrency(Number(value || 0)), ""]}
                                    />
                                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                    <Bar dataKey="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                    <Bar dataKey="Despesas" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
                <Card className="md:col-span-3 border-none shadow-premium bg-white dark:bg-slate-900">
                    <CardHeader>
                        <CardTitle className="text-lg font-black text-slate-800 dark:text-white">Despesas por Categoria</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {expensePieData.length > 0 ? (
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={expensePieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {expensePieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                            formatter={(value: any) => [formatCurrency(value), ""]}
                                        />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="h-[300px] flex items-center justify-center text-slate-400">
                                Nenhum dado de despesa para exibir.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
