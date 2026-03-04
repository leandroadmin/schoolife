import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Plus,
    Phone,
    Mail,
    UserPlus,
    X,
    MessageSquare,
    History,
    Loader2,
    ChevronRight,
    Clock
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import type { Lead, LeadInteraction } from "@/types"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Sheet,
    SheetContent,
} from "@/components/ui/sheet"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

const COLUMNS = [
    { id: "new", label: "Novo", color: "bg-blue-500" },
    { id: "contacted", label: "Em contato", color: "bg-amber-500" },
    { id: "waiting", label: "Aguardando resposta", color: "bg-purple-500" },
    { id: "enrolled", label: "Matriculado", color: "bg-emerald-500" },
    { id: "lost", label: "Perdido", color: "bg-slate-400" },
]

export default function LeadsCRMPage() {
    const [leads, setLeads] = useState<Lead[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
    const [isSheetOpen, setIsSheetOpen] = useState(false)
    const [interactions, setInteractions] = useState<LeadInteraction[]>([])
    const [loadingInteractions, setLoadingInteractions] = useState(false)
    const [newNote, setNewNote] = useState("")
    const [isLossModalOpen, setIsLossModalOpen] = useState(false)
    const [lossReason, setLossReason] = useState("")
    const [isConverting, setIsConverting] = useState(false)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [newLead, setNewLead] = useState({ name: "", email: "", phone: "", source: "" })
    const [isCreating, setIsCreating] = useState(false)

    useEffect(() => {
        fetchLeads()
    }, [])

    async function fetchLeads() {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('leads')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error
            setLeads(data || [])
        } catch (error) {
            console.error('Error fetching leads:', error)
            toast.error("Erro ao carregar leads")
        } finally {
            setLoading(false)
        }
    }

    async function fetchInteractions(leadId: string) {
        try {
            setLoadingInteractions(true)
            const { data, error } = await supabase
                .from('lead_interactions')
                .select('*')
                .eq('lead_id', leadId)
                .order('created_at', { ascending: false })

            if (error) throw error
            setInteractions(data || [])
        } catch (error) {
            console.error(error)
        } finally {
            setLoadingInteractions(false)
        }
    }

    const openLeadDetails = (lead: Lead) => {
        setSelectedLead(lead)
        setIsSheetOpen(true)
        fetchInteractions(lead.id)
    }

    async function updateLeadStatus(leadId: string, newStatus: Lead['status'], reason?: string) {
        try {
            const { error } = await supabase
                .from('leads')
                .update({
                    status: newStatus,
                    loss_reason: reason || null
                })
                .eq('id', leadId)

            if (error) throw error

            // Log interaction
            await supabase.from('lead_interactions').insert([{
                lead_id: leadId,
                content: `Alterou status para ${newStatus}${reason ? `: ${reason}` : ''}`,
                type: 'status_change'
            }])

            toast.success("Status atualizado")
            fetchLeads()
            if (selectedLead?.id === leadId) {
                fetchInteractions(leadId)
                setSelectedLead(prev => prev ? { ...prev, status: newStatus, loss_reason: reason || null } : null)
            }
        } catch (error) {
            console.error(error)
            toast.error("Erro ao atualizar status")
        }
    }

    async function addNote() {
        if (!newNote.trim() || !selectedLead) return

        try {
            const { error } = await supabase
                .from('lead_interactions')
                .insert([{
                    lead_id: selectedLead.id,
                    content: newNote.trim(),
                    type: 'note'
                }])

            if (error) throw error
            toast.success("Anotação adicionada")
            setNewNote("")
            fetchInteractions(selectedLead.id)
        } catch (error) {
            console.error(error)
            toast.error("Erro ao adicionar nota")
        }
    }

    async function convertToStudent() {
        if (!selectedLead) return

        try {
            setIsConverting(true)

            // 1. Create student
            const { error: studentError } = await supabase
                .from('students')
                .insert([{
                    full_name: selectedLead.name,
                    email: selectedLead.email,
                    phone: selectedLead.phone,
                    status: 'active'
                }])
                .select()
                .single()

            if (studentError) throw studentError

            // 2. Update lead status
            const { error: leadError } = await supabase
                .from('leads')
                .update({
                    status: 'enrolled',
                    converted_at: new Date().toISOString()
                })
                .eq('id', selectedLead.id)

            if (leadError) throw leadError

            // 3. Log conversion
            await supabase.from('lead_interactions').insert([{
                lead_id: selectedLead.id,
                content: `Lead convertido em aluno com sucesso!`,
                type: 'conversion'
            }])

            toast.success("Sorte! Lead convertido em aluno.")
            setIsSheetOpen(false)
            fetchLeads()
        } catch (error) {
            console.error(error)
            toast.error("Erro na conversão")
        } finally {
            setIsConverting(false)
        }
    }

    async function handleCreateLead() {
        if (!newLead.name.trim()) {
            toast.error("Nome é obrigatório")
            return
        }

        try {
            setIsCreating(true)
            const { data, error } = await supabase
                .from('leads')
                .insert([{
                    ...newLead,
                    status: 'new'
                }])
                .select()
                .single()

            if (error) throw error

            // Log interaction
            await supabase.from('lead_interactions').insert([{
                lead_id: data.id,
                content: `Lead cadastrado via CRM.`,
                type: 'note'
            }])

            toast.success("Lead cadastrado com sucesso!")
            setIsCreateModalOpen(false)
            setNewLead({ name: "", email: "", phone: "", source: "" })
            fetchLeads()
        } catch (error) {
            console.error(error)
            toast.error("Erro ao cadastrar lead")
        } finally {
            setIsCreating(false)
        }
    }

    const renderLeadCard = (lead: Lead) => (
        <Card
            key={lead.id}
            className="mb-3 rounded-2xl border-none shadow-sm hover:shadow-md transition-all cursor-pointer group bg-white dark:bg-slate-800/50"
            onClick={() => openLeadDetails(lead)}
        >
            <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                    <h4 className="font-bold text-slate-800 dark:text-white leading-tight">{lead.name}</h4>
                    <Badge variant="outline" className="text-[9px] font-black uppercase tracking-tight py-0 h-4 px-1 line-clamp-1">
                        {lead.source || 'Geral'}
                    </Badge>
                </div>

                <div className="space-y-1.5">
                    {lead.phone && (
                        <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                            <Phone className="w-3 h-3" /> {lead.phone}
                        </div>
                    )}
                    <div className="flex items-center gap-2 text-slate-400 text-[10px]">
                        <Clock className="w-3 h-3" />
                        {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                    </div>
                </div>
            </CardContent>
        </Card>
    )

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">CRM de Leads</h1>
                    <p className="text-slate-500 mt-1">Gerencie seu funil de vendas e matrículas.</p>
                </div>
                <Button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-premium h-11 px-6 text-sm font-bold"
                >
                    <Plus className="w-4 h-4 mr-2" /> Novo Lead
                </Button>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                    {COLUMNS.map(column => (
                        <div key={column.id} className="flex flex-col min-h-[500px]">
                            <div className="flex items-center justify-between mb-4 sticky top-0 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md py-2 z-10">
                                <div className="flex items-center gap-2">
                                    <div className={cn("w-2 h-2 rounded-full", column.color)} />
                                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                        {column.label}
                                        <span className="ml-2 bg-slate-200 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded text-[10px]">
                                            {leads.filter(l => l.status === column.id || (!l.status && column.id === 'new')).length}
                                        </span>
                                    </h3>
                                </div>
                            </div>

                            <div className="flex-1 rounded-2xl p-2 bg-slate-100/50 dark:bg-slate-800/20">
                                {leads
                                    .filter(l => l.status === column.id || (!l.status && column.id === 'new'))
                                    .map(renderLeadCard)}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Lead Details Sheet */}
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetContent className="sm:max-w-xl border-none rounded-l-[40px] shadow-2xl p-0 overflow-hidden flex flex-col">
                    {selectedLead && (
                        <>
                            <div className="bg-slate-900 text-white p-8 space-y-6">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <Badge className="bg-blue-500/20 text-blue-400 border-none uppercase text-[10px] font-black tracking-widest">
                                            {COLUMNS.find(c => c.id === selectedLead.status)?.label || 'Novo'}
                                        </Badge>
                                        <h2 className="text-4xl font-black leading-tight">{selectedLead.name}</h2>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => setIsSheetOpen(false)} className="text-white hover:bg-white/10 rounded-full h-12 w-12 shrink-0">
                                        <X className="w-6 h-6" />
                                    </Button>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white/5 rounded-2xl p-4 flex flex-col justify-center">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Telefone</span>
                                        <span className="font-bold flex items-center gap-2"><Phone className="w-4 h-4 text-blue-400" /> {selectedLead.phone || '-'}</span>
                                    </div>
                                    <div className="bg-white/5 rounded-2xl p-4 flex flex-col justify-center">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">E-mail</span>
                                        <span className="font-bold flex items-center gap-2"><Mail className="w-4 h-4 text-blue-400" /> {selectedLead.email || '-'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 p-8 overflow-hidden flex flex-col space-y-8 bg-slate-50 dark:bg-slate-950">
                                {/* Workflow Actions */}
                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ações de Fluxo</Label>
                                    <div className="flex flex-wrap gap-2">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" className="rounded-xl border-slate-200 dark:border-slate-800">
                                                    Mover para... <ChevronRight className="w-4 h-4 ml-2" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent className="rounded-xl p-2 min-w-[200px]">
                                                {COLUMNS.map(col => (
                                                    <DropdownMenuItem
                                                        key={col.id}
                                                        onClick={() => {
                                                            if (col.id === 'lost') setIsLossModalOpen(true)
                                                            else updateLeadStatus(selectedLead.id, col.id as any)
                                                        }}
                                                        className="rounded-lg h-10 font-medium"
                                                    >
                                                        <div className={cn("w-2 h-2 rounded-full mr-2", col.color)} />
                                                        {col.label}
                                                    </DropdownMenuItem>
                                                ))}
                                            </DropdownMenuContent>
                                        </DropdownMenu>

                                        <Button
                                            onClick={convertToStudent}
                                            disabled={isConverting || selectedLead.status === 'enrolled'}
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-200 dark:shadow-none"
                                        >
                                            {isConverting ? <Loader2 className="animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
                                            Converter em Aluno
                                        </Button>
                                    </div>
                                </div>

                                {/* Notes Section */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Anotações e Histórico</Label>
                                        <History className="w-4 h-4 text-slate-300" />
                                    </div>
                                    <div className="flex gap-2">
                                        <Input
                                            value={newNote}
                                            onChange={e => setNewNote(e.target.value)}
                                            placeholder="Adicionar nota rápida..."
                                            className="rounded-xl bg-white border-none shadow-sm h-11"
                                            onKeyDown={e => e.key === 'Enter' && addNote()}
                                        />
                                        <Button onClick={addNote} size="icon" className="rounded-xl h-11 w-11 shrink-0 bg-slate-900 border-none hover:bg-slate-800">
                                            <Plus className="w-5 h-5 text-white" />
                                        </Button>
                                    </div>

                                    <ScrollArea className="flex-1 h-[300px] -mx-8 px-8">
                                        <div className="space-y-5">
                                            {loadingInteractions ? (
                                                <div className="text-center py-10 opacity-50"><Loader2 className="animate-spin inline-block" /></div>
                                            ) : interactions.length > 0 ? (
                                                interactions.map(interaction => (
                                                    <div key={interaction.id} className="relative pl-6 border-l-2 border-slate-100 dark:border-slate-800 py-1">
                                                        <div className={cn(
                                                            "absolute -left-1.5 top-2 w-3 h-3 rounded-full border-2 border-slate-50 dark:border-slate-950",
                                                            interaction.type === 'note' ? "bg-blue-400" :
                                                                interaction.type === 'status_change' ? "bg-amber-400" : "bg-emerald-400"
                                                        )} />
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight">
                                                                {new Date(interaction.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                            <Badge variant="outline" className="text-[8px] font-black uppercase py-0 px-1 border-slate-200">
                                                                {interaction.type === 'note' ? 'Nota' : interaction.type === 'status_change' ? 'Status' : 'Conversão'}
                                                            </Badge>
                                                        </div>
                                                        <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">{interaction.content}</p>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center py-20 grayscale opacity-40">
                                                    <MessageSquare className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                                                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Sem interações</p>
                                                </div>
                                            )}
                                        </div>
                                    </ScrollArea>
                                </div>
                            </div>
                        </>
                    )}
                </SheetContent>
            </Sheet>

            {/* Loss Reason Modal */}
            <Dialog open={isLossModalOpen} onOpenChange={setIsLossModalOpen}>
                <DialogContent className="rounded-3xl border-none shadow-premium max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black">Lead Perdido</DialogTitle>
                        <DialogDescription>
                            Por que perdemos este lead? Essa informação ajuda na nossa análise.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Motivo da Perda</Label>
                            <Textarea
                                value={lossReason}
                                onChange={e => setLossReason(e.target.value)}
                                placeholder="Dificuldade financeira, mudou de cidade, não gostou do horário..."
                                className="rounded-2xl bg-slate-50 border-none p-4"
                            />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={() => setIsLossModalOpen(false)} className="flex-1 rounded-xl">Cancelar</Button>
                        <Button
                            onClick={() => {
                                if (selectedLead) {
                                    updateLeadStatus(selectedLead.id, 'lost', lossReason)
                                    setIsLossModalOpen(false)
                                    setLossReason("")
                                }
                            }}
                            className="flex-1 bg-slate-900 border-none hover:bg-slate-800 rounded-xl font-bold"
                        >
                            Confirmar
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Create Lead Modal */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent className="rounded-[32px] border-none shadow-2xl max-w-md p-8 bg-white dark:bg-slate-900">
                    <DialogHeader className="mb-6">
                        <DialogTitle className="text-3xl font-black text-slate-900 dark:text-white">Novo Lead</DialogTitle>
                        <DialogDescription className="text-slate-500 font-medium">
                            Cadastre um novo potencial aluno no seu funil.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-5">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nome Completo</Label>
                            <Input
                                value={newLead.name}
                                onChange={e => setNewLead({ ...newLead, name: e.target.value })}
                                placeholder="Nome do lead..."
                                className="h-12 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-none px-4 font-medium"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">WhatsApp / Tel</Label>
                                <Input
                                    value={newLead.phone}
                                    onChange={e => setNewLead({ ...newLead, phone: e.target.value })}
                                    placeholder="(00) 00000-0000"
                                    className="h-12 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-none px-4 font-medium"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Origem</Label>
                                <Input
                                    value={newLead.source}
                                    onChange={e => setNewLead({ ...newLead, source: e.target.value })}
                                    placeholder="Ex: Instagram, Indicação..."
                                    className="h-12 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-none px-4 font-medium"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">E-mail</Label>
                            <Input
                                value={newLead.email}
                                onChange={e => setNewLead({ ...newLead, email: e.target.value })}
                                placeholder="email@exemplo.com"
                                className="h-12 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-none px-4 font-medium"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 mt-8">
                        <Button
                            variant="ghost"
                            onClick={() => setIsCreateModalOpen(false)}
                            className="flex-1 h-12 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleCreateLead}
                            disabled={isCreating}
                            className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black shadow-lg shadow-blue-200 dark:shadow-none"
                        >
                            {isCreating ? <Loader2 className="animate-spin" /> : "Cadastrar Lead"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
