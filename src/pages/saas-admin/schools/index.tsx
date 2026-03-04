import { useEffect, useState } from "react"
import { Building2, Plus, ArrowUpDown, MoreHorizontal, Copy, ExternalLink, Power, ShieldAlert, Edit2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import type { ColumnDef } from "@tanstack/react-table"
// We'll reuse the DataTable abstraction
import { DataTable } from "@/pages/students/data-table"

// Types
type School = {
    id: string
    name: string
    subdomain: string | null
    status: 'active' | 'suspended' | 'trial'
    plan_tier: 'basic' | 'pro' | 'enterprise'
    created_at: string
}

export default function SaasSchoolsPage() {
    const [schools, setSchools] = useState<School[]>([])
    const [loading, setLoading] = useState(true)
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Detalhamento e Edição de Tenant
    const [selectedSchool, setSelectedSchool] = useState<School | null>(null)
    const [isDetailsOpen, setIsDetailsOpen] = useState(false)
    const [adminDetails, setAdminDetails] = useState<{ id: string, name: string, email: string, phone: string | null } | null>(null)
    const [newTempPassword, setNewTempPassword] = useState("")
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)

    // Form State (New Instance)
    const [newSchoolName, setNewSchoolName] = useState("")
    const [newSchoolSubdomain, setNewSchoolSubdomain] = useState("")
    const [newSchoolPhone, setNewSchoolPhone] = useState("")
    const [newSchoolAddress, setNewSchoolAddress] = useState("")

    // Director State
    const [newAdminFullName, setNewAdminFullName] = useState("")
    const [newAdminEmail, setNewAdminEmail] = useState("")
    const [newAdminPhone, setNewAdminPhone] = useState("")
    const [newDocumentNumber, setNewDocumentNumber] = useState("")
    const [newAdminPassword, setNewAdminPassword] = useState("")

    async function fetchSchools() {
        try {
            setLoading(true)
            // By RLS logic, a `super_admin` can view `public.schools`
            const { data, error } = await supabase
                .from('schools')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error
            setSchools(data || [])
        } catch (error: any) {
            console.error('Error fetching schools:', error)
            toast.error("Erro ao carregar lista de escolas.")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchSchools()
    }, [])

    const handleCreateSchool = async () => {
        if (!newSchoolName || !newAdminEmail) {
            toast.error("Nome da escola e E-mail do diretor são obrigatórios.")
            return
        }

        try {
            setIsSubmitting(true)

            // Step 1: Tell Supabase GoTrue to create the user account (this ensures password hashing and sessions are perfectly valid)
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: newAdminEmail,
                password: newAdminPassword,
            })

            if (authError || !authData.user) {
                // If it fails because the user exists, that's fine, we will just map them
                if (authError?.message !== 'User already registered') {
                    throw authError
                }
            }

            // Step 2: Use the Super Admin token to force-create the School and map the user ID to public.profiles via RPC
            const { error } = await supabase.rpc('provision_tenant_data_only', {
                p_school_name: newSchoolName,
                p_subdomain: newSchoolSubdomain || null,
                p_admin_email: newAdminEmail,
                p_document_number: newDocumentNumber || null,
                p_phone: newSchoolPhone || null,
                p_address: newSchoolAddress || null,
                p_admin_name: newAdminFullName,
                p_admin_phone: newAdminPhone || null,
            })

            if (error) throw error

            toast.success("Instância de escola criada e diretor cadastrado com sucesso!")
            setIsFormOpen(false)
            setNewSchoolName("")
            setNewSchoolSubdomain("")
            setNewSchoolPhone("")
            setNewSchoolAddress("")
            setNewAdminFullName("")
            setNewAdminEmail("")
            setNewAdminPhone("")
            setNewDocumentNumber("")
            setNewAdminPassword("")

            fetchSchools()

        } catch (error: any) {
            console.error('Error provisioning tenant:', error)
            toast.error(error.message || "Erro crítico ao instanciar o tenant.")
        } finally {
            setIsSubmitting(false)
        }
    }

    const openSchoolDetails = async (school: School) => {
        setSelectedSchool(school)
        setIsDetailsOpen(true)
        setAdminDetails(null)

        try {
            // Busca os dados do Diretor (Admin) desta escola específica
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, email, phone')
                .eq('school_id', school.id)
                .eq('role', 'admin')
                .single()

            if (data) {
                setAdminDetails({
                    id: data.id,
                    name: data.full_name,
                    email: data.email,
                    phone: data.phone
                })
            }
        } catch (err) {
            console.error("Erro ao buscar detalhes do admin:", err)
        }
    }

    const handleChangeDirectorPassword = async () => {
        if (!adminDetails || !newTempPassword) {
            toast.error("Preencha a nova senha.")
            return
        }

        try {
            setIsUpdatingPassword(true)
            const { error } = await supabase.rpc('super_admin_update_tenant_password', {
                p_user_id: adminDetails.id,
                p_new_password: newTempPassword
            })

            if (error) throw error

            toast.success("Senha do diretor alterada com sucesso!")
            setNewTempPassword("")
        } catch (error: any) {
            console.error("Erro ao alterar senha:", error)
            toast.error(error.message || "Não foi possível alterar a senha.")
        } finally {
            setIsUpdatingPassword(false)
        }
    }

    const handleSuspend = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === 'active' ? 'suspended' : 'active'
        const actName = currentStatus === 'active' ? 'suspender' : 'reativar'

        if (!confirm(`Tem certeza que deseja ${actName} esta escola? Todos os acessos serão bloqueados.`)) return

        try {
            const { error } = await supabase
                .from('schools')
                .update({ status: newStatus })
                .eq('id', id)

            if (error) throw error
            toast.success(`Escola ${newStatus === 'active' ? 'reativada' : 'suspensa'} com sucesso!`)
            fetchSchools()
        } catch (error) {
            console.error("Erro ao atualizar status:", error)
            toast.error("Erro ao alterar status da escola.")
        }
    }

    const columnsDefs: ColumnDef<School>[] = [
        {
            accessorKey: "name",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="hover:bg-slate-800 p-0 font-bold text-slate-400"
                    >
                        Nome da Instituição (Tenant)
                        <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const school = row.original
                return (
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-white shadow-inner">
                            {school.name.substring(0, 1).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold text-white leading-tight">{school.name}</span>
                            <span className="text-[10px] text-slate-500 font-medium font-mono">ID: {school.id.split('-')[0]}...</span>
                        </div>
                    </div>
                )
            }
        },
        {
            accessorKey: "subdomain",
            header: "Acesso / Domínio",
            cell: ({ row }) => {
                const sub = row.getValue("subdomain") as string
                if (!sub) return <span className="text-xs text-slate-500">—</span>
                return <span className="text-xs font-mono text-indigo-400">{sub}.suaescola.com</span>
            }
        },
        {
            accessorKey: "plan_tier",
            header: "Plano Subscrito",
            cell: ({ row }) => {
                const plan = row.getValue("plan_tier") as string
                return (
                    <Badge variant="outline" className="rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest border border-indigo-500/20 bg-indigo-500/10 text-indigo-400">
                        {plan}
                    </Badge>
                )
            }
        },
        {
            accessorKey: "status",
            header: "Status Ativo",
            cell: ({ row }) => {
                const status = row.getValue("status") as string
                const variants: Record<string, string> = {
                    active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                    suspended: "bg-rose-500/10 text-rose-400 border-rose-500/20",
                    trial: "bg-amber-500/10 text-amber-400 border-amber-500/20"
                }
                const label = status === 'active' ? 'Operacional' : status === 'suspended' ? 'Suspensa' : 'Período Trial'

                return (
                    <Badge variant="outline" className={`rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest border ${variants[status] || variants.suspended}`}>
                        {label}
                    </Badge>
                )
            }
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const school = row.original
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-800">
                                <span className="sr-only">Abrir menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 bg-slate-900 border-slate-800 text-slate-300">
                            <DropdownMenuLabel className="font-bold text-[10px] uppercase tracking-widest text-slate-500">Gestão do Tenant</DropdownMenuLabel>

                            <DropdownMenuItem className="focus:bg-indigo-500/20 focus:text-indigo-400 cursor-pointer text-xs font-bold">
                                <ExternalLink className="mr-2 h-3.5 w-3.5" />
                                Impersonar Sessão
                            </DropdownMenuItem>
                            <DropdownMenuItem className="focus:bg-slate-800 cursor-pointer text-xs font-medium">
                                <Copy className="mr-2 h-3.5 w-3.5" />
                                Copiar ID Oculto
                            </DropdownMenuItem>

                            <DropdownMenuSeparator className="bg-slate-800" />

                            <DropdownMenuItem
                                onClick={() => openSchoolDetails(school)}
                                className="focus:bg-slate-800 cursor-pointer text-xs font-medium"
                            >
                                <Edit2 className="mr-2 h-3.5 w-3.5" />
                                Detalhes e Acessos
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => handleSuspend(school.id, school.status)}
                                className={`${school.status === 'active' ? 'text-rose-400 focus:bg-rose-500/10 focus:text-rose-400' : 'text-emerald-400 focus:bg-emerald-500/10 focus:text-emerald-400'} cursor-pointer text-xs font-bold`}
                            >
                                <Power className="mr-2 h-3.5 w-3.5" />
                                {school.status === 'active' ? 'Suspender Operação' : 'Reativar Sistema'}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )
            },
        },
    ]

    return (
        <div className="pt-8 space-y-8 animate-in-stagger">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black tracking-tighter text-white">Gestão de Tenancy</h1>
                    <p className="text-sm font-medium text-slate-400">Gerencie todas as escolas, assinaturas e isolamentos do banco de dados.</p>
                </div>

                <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold tracking-widest uppercase text-[11px] shadow-lg shadow-indigo-500/20 border-none">
                            <Plus className="mr-2 h-4 w-4 stroke-[3]" /> Nova Instância (Escola)
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-slate-900 border-slate-800 text-slate-200">
                        <DialogHeader>
                            <DialogTitle className="text-white font-black">Instanciar Novo Cliente</DialogTitle>
                            <DialogDescription className="text-slate-400">
                                Preencha os dados do Diretor principal. O sistema criará o isolamento RLS e enviará o e-mail de acesso.
                            </DialogDescription>
                        </DialogHeader>
                        <ScrollArea className="h-[60vh] max-h-[600px] overflow-y-auto px-1">
                            <div className="space-y-6 py-4">
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-indigo-400 border-b border-slate-800 pb-2">1. Dados da Instituição (Tenant)</h3>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2 col-span-2">
                                            <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Nome Oficial da Instituição *</Label>
                                            <Input
                                                value={newSchoolName}
                                                onChange={(e) => setNewSchoolName(e.target.value)}
                                                placeholder="Ex: Master English School"
                                                className="bg-slate-950 border-slate-800 text-white"
                                            />
                                        </div>
                                        <div className="space-y-2 col-span-2 sm:col-span-1">
                                            <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Subdomínio</Label>
                                            <Input
                                                value={newSchoolSubdomain}
                                                onChange={(e) => setNewSchoolSubdomain(e.target.value)}
                                                placeholder="masterenglish"
                                                className="bg-slate-950 border-slate-800 text-white"
                                            />
                                        </div>
                                        <div className="space-y-2 col-span-2 sm:col-span-1">
                                            <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Telefone Institucional</Label>
                                            <Input
                                                value={newSchoolPhone}
                                                onChange={(e) => setNewSchoolPhone(e.target.value)}
                                                placeholder="(00) 0000-0000"
                                                className="bg-slate-950 border-slate-800 text-white"
                                            />
                                        </div>
                                        <div className="space-y-2 col-span-2">
                                            <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Endereço Completo</Label>
                                            <Input
                                                value={newSchoolAddress}
                                                onChange={(e) => setNewSchoolAddress(e.target.value)}
                                                placeholder="Av. Principal, 1000 - Centro, SP"
                                                className="bg-slate-950 border-slate-800 text-white"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-2">
                                    <h3 className="text-sm font-bold text-indigo-400 border-b border-slate-800 pb-2">2. Diretor Responsável (Owner)</h3>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2 col-span-2">
                                            <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Nome Completo *</Label>
                                            <Input
                                                value={newAdminFullName}
                                                onChange={(e) => setNewAdminFullName(e.target.value)}
                                                placeholder="Nome do diretor proprietário"
                                                className="bg-slate-950 border-slate-800 text-white"
                                            />
                                        </div>
                                        <div className="space-y-2 col-span-2 sm:col-span-1">
                                            <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">CNPJ / CPF</Label>
                                            <Input
                                                value={newDocumentNumber}
                                                onChange={(e) => setNewDocumentNumber(e.target.value)}
                                                placeholder="00.000.000/0001-00"
                                                className="bg-slate-950 border-slate-800 text-white"
                                            />
                                        </div>
                                        <div className="space-y-2 col-span-2 sm:col-span-1">
                                            <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Telefone Direto</Label>
                                            <Input
                                                value={newAdminPhone}
                                                onChange={(e) => setNewAdminPhone(e.target.value)}
                                                placeholder="(00) 90000-0000"
                                                className="bg-slate-950 border-slate-800 text-white"
                                            />
                                        </div>
                                        <div className="space-y-2 col-span-2">
                                            <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">E-mail de Login *</Label>
                                            <Input
                                                value={newAdminEmail}
                                                onChange={(e) => setNewAdminEmail(e.target.value)}
                                                type="email"
                                                placeholder="diretor@escola.com"
                                                className="bg-slate-950 border-slate-800 text-white"
                                            />
                                        </div>
                                        <div className="space-y-2 col-span-2">
                                            <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Senha Provisória *</Label>
                                            <Input
                                                value={newAdminPassword}
                                                onChange={(e) => setNewAdminPassword(e.target.value)}
                                                type="password"
                                                placeholder="Crie a senha inicial..."
                                                className="bg-slate-950 border-slate-800 text-white"
                                            />
                                            <p className="text-[10px] text-slate-500 font-medium">Esta é a senha vitalícia do ambiente dele caso ele mesmo não a altere nas Configurações dele depois.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </ScrollArea>
                        <div className="pt-4 flex justify-end">
                            <Button
                                onClick={handleCreateSchool}
                                disabled={isSubmitting || !newAdminEmail || !newAdminPassword || !newSchoolName || !newAdminFullName}
                                className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold w-full h-12 text-sm uppercase tracking-widest"
                            >
                                {isSubmitting ? "Provisionando e Isolando Dados..." : "Finalizar RLS & Instanciar Escola"}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Warning regarding Data Privacy */}
            <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4 flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                    <h4 className="text-sm font-bold text-amber-500">Segurança de Nível Militar (RLS Ativo)</h4>
                    <p className="text-xs font-medium text-amber-400/80 mt-1">
                        Cada tenant nesta lista opera em silos rigorosamente isolados no nível do Banco de Dados. Operações destrutivas afetam apenas a instância selecionada.
                    </p>
                </div>
            </div>

            <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-xl overflow-hidden rounded-[24px]">
                <CardContent className="p-0">
                    <DataTable
                        columns={columnsDefs}
                        data={schools}
                        searchKey="name"
                        customHeaderBg="bg-slate-950 border-y border-slate-800"
                        customRowHover="hover:bg-slate-800/50 transition-colors"
                        customCellClass="text-slate-300"
                        customPaginationText="text-slate-400"
                    />
                </CardContent>
            </Card>

            {/* Configuração Local de Tenant (Sheet Lateral) */}
            <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <SheetContent side="right" className="w-[400px] sm:w-[540px] bg-slate-900 border-l border-slate-800 text-slate-300 p-0 flex flex-col">
                    <SheetHeader className="p-6 border-b border-slate-800 bg-slate-950/50">
                        <SheetTitle className="text-white font-black text-xl flex items-center gap-2">
                            <Building2 className="h-6 w-6 text-indigo-400" /> Detalhes do Tenant
                        </SheetTitle>
                        <SheetDescription className="text-slate-400 text-xs font-medium">
                            Gestão administrativa, dados do responsável e forçar redefinição de segurança.
                        </SheetDescription>
                    </SheetHeader>

                    <ScrollArea className="flex-1 p-6">
                        {selectedSchool && (
                            <div className="space-y-8">

                                {/* Info Institucional Resumo */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-bold text-white uppercase tracking-widest border-b border-slate-800 pb-2 flex items-center gap-2">
                                        Instituição
                                    </h4>
                                    <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                                        <div>
                                            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Nome</p>
                                            <p className="text-sm font-medium text-slate-300 mt-1">{selectedSchool.name}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Plano</p>
                                            <Badge variant="outline" className="mt-1 bg-indigo-500/10 text-indigo-400 border-indigo-500/20">{selectedSchool.plan_tier}</Badge>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Domínio de Acesso</p>
                                            <p className="text-sm font-medium text-slate-300 mt-1">{selectedSchool.subdomain ? `${selectedSchool.subdomain}.suaescola.com` : 'Padrão'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Tenant ID</p>
                                            <p className="text-xs font-mono text-slate-500 mt-1">{selectedSchool.id.split('-')[0]}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Diretor / Login Specs */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-bold text-white uppercase tracking-widest border-b border-slate-800 pb-2">
                                        Dados de Login do Diretor
                                    </h4>

                                    {adminDetails ? (
                                        <div className="space-y-4">
                                            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                                                <div>
                                                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Nome do Diretor</p>
                                                    <p className="text-sm font-bold text-white mt-1">{adminDetails.name}</p>
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">E-mail Principal (Acesso)</p>
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-sm font-medium text-emerald-400">{adminDetails.email}</p>
                                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-500 hover:text-white" onClick={() => { navigator.clipboard.writeText(adminDetails.email); toast.success('E-mail copiado!') }}>
                                                            <Copy className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                                {adminDetails.phone && (
                                                    <div>
                                                        <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">WhatsApp / Telefone</p>
                                                        <p className="text-sm font-medium text-slate-300 mt-1">{adminDetails.phone}</p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Forced Password Reset */}
                                            <div className="bg-rose-500/5 border border-rose-500/20 p-4 rounded-xl space-y-3 mt-4">
                                                <h5 className="text-xs font-bold text-rose-400 flex items-center gap-1"><ShieldAlert className="h-4 w-4" /> Resetar Senha Forçadamente</h5>
                                                <p className="text-[10px] text-slate-500">Em caso de perda de acesso do dono original, redefina a senha por aqui. Ele será deslogado de todas as sessões ativas com a senha anterior.</p>

                                                <div className="flex gap-2">
                                                    <Input
                                                        type="text"
                                                        placeholder="Nova senha temporária"
                                                        value={newTempPassword}
                                                        onChange={(e) => setNewTempPassword(e.target.value)}
                                                        className="bg-slate-950 border-rose-500/20 text-white placeholder:text-slate-600 h-9"
                                                    />
                                                    <Button
                                                        onClick={handleChangeDirectorPassword}
                                                        disabled={isUpdatingPassword || !newTempPassword}
                                                        className="h-9 font-bold bg-rose-500 hover:bg-rose-600 text-white"
                                                    >
                                                        {isUpdatingPassword ? "Gravando..." : "Alterar"}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex h-20 items-center justify-center text-xs font-medium text-slate-500">
                                            Buscando credenciais vinculadas...
                                        </div>
                                    )}
                                </div>

                                <div className="pt-4 grid grid-cols-1 gap-3">
                                    <Button className="w-full h-12 bg-indigo-500 hover:bg-indigo-600 font-bold uppercase tracking-widest text-xs">
                                        <ExternalLink className="mr-2 h-4 w-4" />
                                        Mágica: Entrar nesta Escola (Impersonar)
                                    </Button>
                                </div>
                            </div>
                        )}
                    </ScrollArea>
                </SheetContent>
            </Sheet>
        </div>
    )
}
