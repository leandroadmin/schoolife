import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import type { Supplier } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { Plus, Search, Building2, Trash2, Edit2 } from "lucide-react"

export function SuppliersTab() {
    const [suppliers, setSuppliers] = useState<Supplier[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [saving, setSaving] = useState(false)

    // Form state
    const [formData, setFormData] = useState({
        name: "",
        document: "",
        phone: "",
        email: "",
        address: "",
        notes: ""
    })

    useEffect(() => {
        fetchSuppliers()
    }, [])

    const fetchSuppliers = async () => {
        try {
            const { data, error } = await supabase
                .from('suppliers')
                .select('*')
                .order('name', { ascending: true })

            if (error) throw error
            if (data) setSuppliers(data as Supplier[])
        } catch (error) {
            console.error('Error fetching suppliers:', error)
            toast.error("Erro ao carregar fornecedores")
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            const { error } = await supabase
                .from('suppliers')
                .insert([formData])

            if (error) throw error

            toast.success("Fornecedor cadastrado com sucesso!")
            setIsAddModalOpen(false)
            setFormData({ name: "", document: "", phone: "", email: "", address: "", notes: "" })
            fetchSuppliers()
        } catch (error) {
            console.error('Error saving supplier:', error)
            toast.error("Erro ao salvar fornecedor")
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir este fornecedor?")) return

        try {
            const { error } = await supabase
                .from('suppliers')
                .delete()
                .eq('id', id)

            if (error) throw error

            toast.success("Fornecedor excluído com sucesso!")
            fetchSuppliers()
        } catch (error) {
            console.error('Error deleting supplier:', error)
            toast.error("Erro ao excluir fornecedor (pode estar vinculado a contas a pagar)")
        }
    }

    const filteredSuppliers = suppliers.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.document?.includes(searchTerm)
    )

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative flex-1 w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Buscar fornecedores..."
                        className="pl-10 h-12 rounded-xl bg-white border-none shadow-premium dark:bg-slate-900"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                    <DialogTrigger asChild>
                        <Button className="h-12 px-6 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl shadow-primary/20 hover:scale-105 transition-all w-full sm:w-auto">
                            <Plus className="mr-2 h-5 w-5" /> Novo Fornecedor
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-none shadow-2xl rounded-3xl">
                        <DialogHeader className="p-8 pb-0">
                            <DialogTitle className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                                    <Building2 className="h-6 w-6 text-primary" />
                                </div>
                                Cadastrar Fornecedor
                            </DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSave} className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2 col-span-2">
                                    <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Nome/Razão Social *</Label>
                                    <Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="h-12 rounded-xl bg-slate-50 border-none" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">CNPJ / CPF</Label>
                                    <Input value={formData.document} onChange={e => setFormData({ ...formData, document: e.target.value })} className="h-12 rounded-xl bg-slate-50 border-none" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Telefone</Label>
                                    <Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="h-12 rounded-xl bg-slate-50 border-none" />
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">E-mail</Label>
                                    <Input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="h-12 rounded-xl bg-slate-50 border-none" />
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Endereço</Label>
                                    <Input value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="h-12 rounded-xl bg-slate-50 border-none" />
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Observações</Label>
                                    <Textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} className="resize-none rounded-xl bg-slate-50 border-none min-h-[100px]" />
                                </div>
                            </div>
                            <div className="pt-4 flex justify-end">
                                <Button type="submit" disabled={saving} className="h-12 px-8 rounded-xl font-bold bg-primary hover:bg-primary/90">
                                    {saving ? "Salvando..." : "Salvar Fornecedor"}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full py-12 text-center text-slate-400">Carregando fornecedores...</div>
                ) : filteredSuppliers.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                        Nenhum fornecedor encontrado.
                    </div>
                ) : (
                    filteredSuppliers.map(supplier => (
                        <Card key={supplier.id} className="border-none shadow-premium bg-white dark:bg-slate-900 group hover:-translate-y-1 transition-transform duration-300">
                            <CardHeader className="p-6 pb-4 flex flex-row items-start justify-between">
                                <div className="space-y-1">
                                    <CardTitle className="text-lg font-black text-slate-800 dark:text-white line-clamp-1" title={supplier.name}>
                                        {supplier.name}
                                    </CardTitle>
                                    {supplier.document && <p className="text-xs font-bold text-slate-400">{supplier.document}</p>}
                                </div>
                                <div className="h-10 w-10 rounded-full flex items-center justify-center bg-slate-50 dark:bg-slate-800 text-slate-400">
                                    <Building2 className="h-5 w-5" />
                                </div>
                            </CardHeader>
                            <CardContent className="p-6 pt-0 space-y-4">
                                <div className="space-y-2">
                                    {supplier.email && <div className="text-sm text-slate-500 line-clamp-1"><span className="font-bold mr-2 text-slate-300">@</span>{supplier.email}</div>}
                                    {supplier.phone && <div className="text-sm text-slate-500 line-clamp-1"><span className="font-bold mr-2 text-slate-300">📞</span>{supplier.phone}</div>}
                                </div>
                                <div className="flex gap-2 pt-4 border-t border-slate-50 dark:border-slate-800 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="outline" size="sm" className="flex-1 rounded-lg border-slate-200 dark:border-slate-800 hover:bg-slate-50">
                                        <Edit2 className="h-3.5 w-3.5 mr-2" /> Editar
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleDelete(supplier.id)} className="px-3 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10">
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    )
}
