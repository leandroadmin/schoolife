import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import type { Transaction, Student } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Search, AlertCircle, MessageSquare, User } from "lucide-react"
import { Input } from "@/components/ui/input"

interface Defaulter {
    student: Student
    totalDebt: number
    overdueCount: number
    oldestDueDate: string
    transactions: Transaction[]
}

export function DefaultersTab() {
    const [defaulters, setDefaulters] = useState<Defaulter[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")

    useEffect(() => {
        fetchDefaulters()
    }, [])

    const fetchDefaulters = async () => {
        try {
            const today = new Date().toISOString().split('T')[0]

            // Fetch overdue incomes
            const { data: overdueData, error: overdueError } = await supabase
                .from('financial_transactions')
                .select('*, students(*)')
                .eq('type', 'income')
                .eq('status', 'pending')
                .lt('due_date', today)

            if (overdueError) throw overdueError

            // Group by student
            const grouped = (overdueData as any[]).reduce((acc: Record<string, Defaulter>, t) => {
                if (!t.student_id || !t.students) return acc

                const sid = t.student_id
                if (!acc[sid]) {
                    acc[sid] = {
                        student: t.students,
                        totalDebt: 0,
                        overdueCount: 0,
                        oldestDueDate: t.due_date,
                        transactions: []
                    }
                }

                acc[sid].totalDebt += t.amount
                acc[sid].overdueCount += 1
                acc[sid].transactions.push(t)

                if (t.due_date < acc[sid].oldestDueDate) {
                    acc[sid].oldestDueDate = t.due_date
                }

                return acc
            }, {})

            // Convert to array and sort by total debt descending
            const sortedDefaulters = Object.values(grouped).sort((a, b) => b.totalDebt - a.totalDebt)
            setDefaulters(sortedDefaulters)

        } catch (error) {
            console.error('Error fetching defaulters:', error)
            toast.error("Erro ao carregar inadimplentes")
        } finally {
            setLoading(false)
        }
    }

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
    }

    const formatDate = (dateString: string) => {
        if (!dateString) return '-'
        return new Date(dateString + "T00:00:00").toLocaleDateString('pt-BR')
    }

    const handleWhatsAppMsg = (defaulter: Defaulter) => {
        const phone = defaulter.student.phone?.replace(/\D/g, '') || ''
        if (!phone) {
            toast.error("Aluno não possui telefone cadastrado")
            return
        }

        const firstName = defaulter.student.full_name.split(' ')[0]
        const formattedDebt = formatCurrency(defaulter.totalDebt)

        const message = `Olá, responsável por ${firstName}. Tudo bem? \n\nAqui é da secretaria da escola. Consta em nosso sistema um valor em aberto de *${formattedDebt}* referente a ${defaulter.overdueCount} parcela(s).\nPara facilitar, estamos à disposição para renegociação ou envio do boleto atualizado. Podemos ajudar com isso?`

        const encodedMsg = encodeURIComponent(message)
        window.open(`https://wa.me/55${phone}?text=${encodedMsg}`, '_blank')
        toast.info("Redirecionando para o WhatsApp...")
    }

    const filteredDefaulters = defaulters.filter(d =>
        d.student.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const totalGlobalDebt = defaulters.reduce((acc, d) => acc + d.totalDebt, 0)

    return (
        <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-none shadow-premium bg-rose-50 dark:bg-rose-500/10">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-rose-600 dark:text-rose-500 uppercase tracking-widest flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" /> Total em Atraso (Global)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-rose-700 dark:text-rose-400">{formatCurrency(totalGlobalDebt)}</div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-premium bg-slate-50 dark:bg-slate-800/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <User className="w-4 h-4" /> Alunos Inadimplentes
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-slate-700 dark:text-white">{defaulters.length}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Actions & Filters */}
            <div className="flex bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-premium">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Buscar aluno inadimplente..."
                        className="pl-10 h-10 rounded-xl bg-slate-50 border-none dark:bg-slate-950"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Data List */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-premium overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-slate-500">Localizando registros...</div>
                ) : filteredDefaulters.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center">
                        <div className="h-16 w-16 bg-emerald-50 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mb-4 text-emerald-500">
                            <AlertCircle className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-700 dark:text-white">Nenhum aluno em atraso</h3>
                        <p className="text-sm text-slate-500 mt-1">A saúde financeira está em dia.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-xs uppercase font-black text-slate-500 dark:text-slate-400">
                                <tr>
                                    <th className="px-6 py-4 rounded-tl-3xl">Aluno</th>
                                    <th className="px-6 py-4">Total Devido</th>
                                    <th className="px-6 py-4">Parcelas Atrasadas</th>
                                    <th className="px-6 py-4">Atraso Mais Antigo</th>
                                    <th className="px-6 py-4 rounded-tr-3xl text-right">Ação de Cobrança</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                {filteredDefaulters.map((d) => (
                                    <tr key={d.student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                <span className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500"><User className="w-4 h-4" /></span>
                                                {d.student.full_name}
                                            </div>
                                            <div className="text-xs text-slate-400 mt-1 ml-10">Tel: {d.student.phone || 'Não cadastrado'}</div>
                                        </td>
                                        <td className="px-6 py-4 font-black text-rose-600 dark:text-rose-500">
                                            {formatCurrency(d.totalDebt)}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                                            {d.overdueCount} {d.overdueCount > 1 ? 'parcelas' : 'parcela'}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                                            <span className="inline-flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3 text-rose-500" />
                                                {formatDate(d.oldestDueDate)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleWhatsAppMsg(d)}
                                                className="h-9 px-4 rounded-xl border-emerald-500 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:border-emerald-500/50 dark:text-emerald-400 dark:hover:bg-emerald-500/20 shadow-sm"
                                            >
                                                <MessageSquare className="w-4 h-4 mr-2" />
                                                Cobrar via WhatsApp
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
