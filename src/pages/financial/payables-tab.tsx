import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import type { Transaction, Supplier } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { Plus, Search, ArrowDownRight, Clock, AlertCircle, CheckCircle2 } from "lucide-react"

export function PayablesTab() {
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [suppliers, setSuppliers] = useState<Supplier[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "paid" | "overdue">("all")
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [saving, setSaving] = useState(false)

    // Form state
    const [formData, setFormData] = useState({
        description: "",
        amount: "",
        due_date: "",
        supplier_id: "",
        category: "Despesa Fixa"
    })

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            // Fetch Payables
            const { data: transData, error: transError } = await supabase
                .from('financial_transactions')
                .select('*, suppliers(name)')
                .eq('type', 'expense')
                .order('due_date', { ascending: true })

            if (transError) throw transError

            // Check overdue statuses and update locally for display (or we can just calculate it on the fly)
            const today = new Date().toISOString().split('T')[0]
            const processedTrans = (transData as any[]).map(t => {
                if (t.status === 'pending' && t.due_date && t.due_date < today) {
                    return { ...t, status: 'overdue' }
                }
                return t
            })

            setTransactions(processedTrans as Transaction[])

            // Fetch Suppliers for the dropdown
            const { data: suppData, error: suppError } = await supabase
                .from('suppliers')
                .select('*')
                .order('name', { ascending: true })

            if (suppError) throw suppError
            if (suppData) setSuppliers(suppData as Supplier[])

        } catch (error) {
            console.error('Error fetching payables data:', error)
            toast.error("Erro ao carregar contas a pagar")
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            const newTransaction = {
                type: 'expense',
                description: formData.description,
                amount: parseFloat(formData.amount),
                due_date: formData.due_date,
                supplier_id: formData.supplier_id || null,
                category: formData.category,
                status: 'pending',
                date: new Date().toISOString().split('T')[0], // Default creation date
            }

            const { error } = await supabase
                .from('financial_transactions')
                .insert([newTransaction])

            if (error) throw error

            toast.success("Conta a pagar registrada!")
            setIsAddModalOpen(false)
            setFormData({ description: "", amount: "", due_date: "", supplier_id: "", category: "Despesa Fixa" })
            fetchData()
        } catch (error) {
            console.error('Error saving payable:', error)
            toast.error("Erro ao registrar conta a pagar")
        } finally {
            setSaving(false)
        }
    }

    const markAsPaid = async (id: string) => {
        try {
            const { error } = await supabase
                .from('financial_transactions')
                .update({ status: 'paid', date: new Date().toISOString().split('T')[0] }) // Set payment date to today
                .eq('id', id)

            if (error) throw error
            toast.success("Conta marcada como paga!")
            fetchData()
        } catch (error) {
            console.error('Error updating status:', error)
            toast.error("Erro ao atualizar conta")
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir este registro?")) return

        try {
            const { error } = await supabase
                .from('financial_transactions')
                .delete()
                .eq('id', id)

            if (error) throw error
            toast.success("Registro excluído!")
            fetchData()
        } catch (error) {
            console.error('Error deleting:', error)
            toast.error("Erro ao excluir registro")
        }
    }

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
    }

    const formatDate = (dateString: string) => {
        if (!dateString) return '-'
        return new Date(dateString + "T00:00:00").toLocaleDateString('pt-BR')
    }

    // Filter Logic
    const filteredTransactions = transactions.filter(t => {
        const matchesSearch = t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (t as any).suppliers?.name?.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesStatus = statusFilter === "all" || t.status === statusFilter
        return matchesSearch && matchesStatus
    })

    // Summaries
    const totalPending = filteredTransactions.filter(t => t.status === 'pending').reduce((acc, t) => acc + t.amount, 0)
    const totalOverdue = filteredTransactions.filter(t => t.status === 'overdue').reduce((acc, t) => acc + t.amount, 0)

    const getStatusBadge = (status: string, dueDate: string | null) => {
        const today = new Date().toISOString().split('T')[0]
        const isExpiringToday = status === 'pending' && dueDate === today

        if (status === 'paid') return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"><CheckCircle2 className="w-3 h-3" /> Pago</span>
        if (status === 'overdue') return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400"><AlertCircle className="w-3 h-3" /> Vencido</span>
        if (isExpiringToday) return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"><Clock className="w-3 h-3" /> Vence Hoje</span>

        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400"><Clock className="w-3 h-3" /> Pendente</span>
    }

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-none shadow-premium bg-amber-50 dark:bg-amber-500/10">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-amber-600 dark:text-amber-500 uppercase tracking-widest flex items-center gap-2">
                            <Clock className="w-4 h-4" /> A Vencer / Pendente
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-amber-700 dark:text-amber-400">{formatCurrency(totalPending)}</div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-premium bg-rose-50 dark:bg-rose-500/10">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-rose-600 dark:text-rose-500 uppercase tracking-widest flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" /> Vencidas
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-rose-700 dark:text-rose-400">{formatCurrency(totalOverdue)}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Actions & Filters */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-premium">
                <div className="flex flex-1 gap-4 w-full">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Buscar descrição ou fornecedor..."
                            className="pl-10 h-10 rounded-xl bg-slate-50 border-none dark:bg-slate-950"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                        <SelectTrigger className="w-[180px] h-10 rounded-xl bg-slate-50 border-none dark:bg-slate-950 font-medium">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-none shadow-premium">
                            <SelectItem value="all">Todos os Status</SelectItem>
                            <SelectItem value="pending">Pendentes</SelectItem>
                            <SelectItem value="overdue">Vencidos</SelectItem>
                            <SelectItem value="paid">Pagos</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                    <DialogTrigger asChild>
                        <Button className="h-10 px-6 rounded-xl font-bold bg-rose-600 text-white hover:bg-rose-700 shadow-xl shadow-rose-600/20 w-full sm:w-auto">
                            <Plus className="mr-2 h-4 w-4" /> Nova Despesa
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl rounded-3xl">
                        <DialogHeader className="p-8 pb-0">
                            <DialogTitle className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-rose-100 flex items-center justify-center">
                                    <ArrowDownRight className="h-5 w-5 text-rose-600" />
                                </div>
                                Cadastrar Despesa
                            </DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSave} className="p-8 space-y-6">
                            <div className="grid grid-cols-1 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Descrição *</Label>
                                    <Input required value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="h-12 rounded-xl bg-slate-50 border-none" placeholder="Ex: Conta de Luz" />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Valor (R$) *</Label>
                                        <Input type="number" step="0.01" required value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} className="h-12 rounded-xl bg-slate-50 border-none" placeholder="0.00" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Vencimento *</Label>
                                        <Input type="date" required value={formData.due_date} onChange={e => setFormData({ ...formData, due_date: e.target.value })} className="h-12 rounded-xl bg-slate-50 border-none" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Fornecedor (Opcional)</Label>
                                    <Select value={formData.supplier_id} onValueChange={(v) => setFormData({ ...formData, supplier_id: v })}>
                                        <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none">
                                            <SelectValue placeholder="Selecione um fornecedor" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none" className="text-slate-400 italic">Nenhum fornecedor vinculado</SelectItem>
                                            {suppliers.map(s => (
                                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Categoria</Label>
                                    <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                                        <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none">
                                            <SelectValue placeholder="Categoria" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Despesa Fixa">Despesa Fixa (Aluguel, Luz, Internet)</SelectItem>
                                            <SelectItem value="Despesa Variável">Despesa Variável</SelectItem>
                                            <SelectItem value="Folha de Pagamento">Folha de Pagamento / Professores</SelectItem>
                                            <SelectItem value="Manutenção e Limpeza">Manutenção e Limpeza</SelectItem>
                                            <SelectItem value="Outros">Outros</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="pt-4 flex justify-end">
                                <Button type="submit" disabled={saving} className="h-12 px-8 rounded-xl font-bold bg-rose-600 hover:bg-rose-700 text-white">
                                    {saving ? "Registrando..." : "Registrar Despesa"}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Data List */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-premium overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-slate-500">Carregando dados...</div>
                ) : filteredTransactions.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center">
                        <div className="h-16 w-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 text-slate-400">
                            <ArrowDownRight className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-700 dark:text-white">Nenhuma despesa encontrada</h3>
                        <p className="text-sm text-slate-500 mt-1">Tente ajustar os filtros ou registre uma nova conta a pagar.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-xs uppercase font-black text-slate-500 dark:text-slate-400">
                                <tr>
                                    <th className="px-6 py-4 rounded-tl-3xl">Descrição & Categoria</th>
                                    <th className="px-6 py-4">Fornecedor</th>
                                    <th className="px-6 py-4">Vencimento</th>
                                    <th className="px-6 py-4 text-right">Valor</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 rounded-tr-3xl text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                {filteredTransactions.map((t) => (
                                    <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-900 dark:text-white">{t.description}</div>
                                            <div className="text-xs text-slate-400 mt-0.5">{t.category}</div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                                            {(t as any).suppliers?.name || <span className="text-slate-400 italic">Avulso</span>}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-600 dark:text-slate-300">
                                            {formatDate(t.due_date || "")}
                                        </td>
                                        <td className="px-6 py-4 text-right font-black text-slate-900 dark:text-white">
                                            {formatCurrency(t.amount)}
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(t.status, t.due_date)}
                                        </td>
                                        <td className="px-6 py-4 text-right whitespace-nowrap">
                                            {t.status !== 'paid' && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => markAsPaid(t.id)}
                                                    className="mr-2 h-8 px-3 rounded-lg font-bold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:hover:bg-emerald-500/30"
                                                >
                                                    Pagar
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDelete(t.id)}
                                                className="h-8 px-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                Excluir
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
