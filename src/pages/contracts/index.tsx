import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import {
    Plus,
    FileText,
    Search,
    Download,
    Send,
    Trash2,
    Settings,
    Clock,
    BadgeCheck,
    Loader2,
    Calendar,
    ChevronRight
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import ContractGenerator from "./generator"
import ContractTemplates from "./templates"
import { Badge } from "@/components/ui/badge"

export default function ContractsPage() {
    const [view, setView] = useState<'list' | 'generate' | 'templates'>('list')
    const [contracts, setContracts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")

    useEffect(() => {
        if (view === 'list') {
            fetchContracts()
        }
    }, [view])

    async function fetchContracts() {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('generated_contracts')
                .select('*, students(full_name, avatar_url)')
                .order('created_at', { ascending: false })

            if (error) throw error
            setContracts(data || [])
        } catch (error) {
            console.error('Error fetching contracts:', error)
            toast.error("Erro ao carregar histórico")
        } finally {
            setLoading(false)
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Excluir este contrato do histórico?")) return

        try {
            const { error } = await supabase.from('generated_contracts').delete().eq('id', id)
            if (error) throw error
            toast.success("Contrato removido")
            fetchContracts()
        } catch (error) {
            toast.error("Erro ao excluir")
        }
    }

    const filteredContracts = contracts.filter(c =>
        c.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.students?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (view === 'generate') return <ContractGenerator onBack={() => setView('list')} />
    if (view === 'templates') return (
        <div className="space-y-6">
            <Button variant="ghost" onClick={() => setView('list')} className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Voltar para Contratos
            </Button>
            <ContractTemplates />
        </div>
    )

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Gestão de Contratos</h1>
                    <p className="text-slate-500 mt-1">Gere, envie e acompanhe os contratos dos alunos.</p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <Button variant="outline" onClick={() => setView('templates')} className="rounded-xl border-none bg-white dark:bg-slate-900 font-bold shadow-sm">
                        <Settings className="w-4 h-4 mr-2" /> Modelos
                    </Button>
                    <Button onClick={() => setView('generate')} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-premium">
                        <Plus className="w-4 h-4 mr-2" /> Gerar Contrato
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="rounded-3xl border-none shadow-premium bg-gradient-to-br from-slate-800 to-slate-900 text-white">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-slate-300 font-bold uppercase text-[10px] tracking-widest">Contratos Emitidos</CardDescription>
                        <CardTitle className="text-4xl font-black">{contracts.length}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2 text-slate-400 text-xs text-blue-100">
                            <Clock className="w-3 h-3" />
                            <span>Total histórico</span>
                        </div>
                    </CardContent>
                </Card>
                <Card className="rounded-3xl border-none shadow-premium">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Aguardando Assinatura</CardDescription>
                        <CardTitle className="text-4xl font-black text-slate-800 dark:text-white">
                            {contracts.filter(c => c.status === 'generated').length}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2 text-amber-500 text-xs font-bold">
                            <BadgeCheck className="w-3 h-3" />
                            <span>{Math.round((contracts.filter(c => c.status === 'generated').length / (contracts.length || 1)) * 100)}% do total</span>
                        </div>
                    </CardContent>
                </Card>
                <Card className="rounded-3xl border-none shadow-premium">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Convertidos</CardDescription>
                        <CardTitle className="text-4xl font-black text-slate-800 dark:text-white">
                            {contracts.filter(c => c.status === 'signed').length}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2 text-green-500 text-xs font-bold">
                            <BadgeCheck className="w-3 h-3" />
                            <span>Assinados este mês</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-premium p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div className="relative w-full sm:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Buscar por aluno ou título..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="pl-10 h-10 rounded-xl bg-slate-50 border-none dark:bg-slate-800"
                        />
                    </div>
                </div>

                <div className="space-y-3">
                    {loading ? (
                        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" /></div>
                    ) : filteredContracts.length > 0 ? (
                        filteredContracts.map(contract => (
                            <div
                                key={contract.id}
                                className="group flex items-center justify-between p-4 rounded-2xl border-2 border-transparent hover:border-blue-500/10 hover:bg-blue-50/10 dark:hover:bg-blue-900/5 transition-all"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                                        <FileText className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 dark:text-white">{contract.students?.full_name}</h3>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-xs text-slate-400 flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(contract.created_at).toLocaleDateString()}
                                            </span>
                                            <Badge className={cn(
                                                "text-[9px] font-black uppercase tracking-wider h-4",
                                                contract.status === 'signed' ? "bg-green-100 text-green-700" :
                                                    contract.status === 'sent' ? "bg-blue-100 text-blue-700" :
                                                        "bg-amber-100 text-amber-700"
                                            )}>
                                                {contract.status === 'signed' ? 'Assinado' :
                                                    contract.status === 'sent' ? 'Enviado' : 'Gerado'}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Download className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Send className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDelete(contract.id)}
                                        className="h-9 w-9 rounded-xl text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-50"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-slate-300 group-hover:text-blue-500">
                                        <ChevronRight className="h-5 w-5" />
                                    </Button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-20 grayscale opacity-40">
                            <FileText className="w-12 h-12 mx-auto mb-4" />
                            <p className="font-bold">Nenhum contrato gerado</p>
                            <p className="text-xs">Os contratos emitidos aparecerão aqui.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

function ArrowLeft(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m12 19-7-7 7-7" />
            <path d="M19 12H5" />
        </svg>
    )
}
