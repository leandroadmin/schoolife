import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import {
    Plus,
    Save,
    FileText,
    Trash2,
    ArrowLeft,
    Loader2,
    Settings,
    Upload,
    Signature
} from "lucide-react"
import { toast } from "sonner"
import { ContractEditor } from "./components/contract-editor"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

export default function ContractTemplates() {
    const [templates, setTemplates] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [editingTemplate, setEditingTemplate] = useState<any>(null)
    const [saving, setSaving] = useState(false)
    const [schoolSettings, setSchoolSettings] = useState<any>(null)

    useEffect(() => {
        fetchData()
    }, [])

    async function fetchData() {
        try {
            setLoading(true)
            const [templatesRes, settingsRes] = await Promise.all([
                supabase.from('contract_templates').select('*').order('created_at', { ascending: false }),
                supabase.from('school_settings').select('*').single()
            ])

            if (templatesRes.error) throw templatesRes.error
            setTemplates(templatesRes.data || [])
            setSchoolSettings(settingsRes.data)
        } catch (error) {
            console.error('Error fetching templates:', error)
            toast.error("Erro ao carregar modelos")
        } finally {
            setLoading(false)
        }
    }

    async function handleSave() {
        if (!editingTemplate.title || !editingTemplate.content) {
            toast.error("Título e conteúdo são obrigatórios")
            return
        }

        try {
            setSaving(true)
            const { error } = await supabase
                .from('contract_templates')
                .upsert({
                    id: editingTemplate.id || undefined,
                    title: editingTemplate.title,
                    content: editingTemplate.content,
                    updated_at: new Date().toISOString()
                })

            if (error) throw error
            toast.success("Modelo salvo com sucesso")
            setEditingTemplate(null)
            fetchData()
        } catch (error) {
            console.error('Error saving template:', error)
            toast.error("Erro ao salvar modelo")
        } finally {
            setSaving(false)
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Tem certeza que deseja excluir este modelo?")) return

        try {
            const { error } = await supabase
                .from('contract_templates')
                .delete()
                .eq('id', id)

            if (error) throw error
            toast.success("Modelo excluído")
            fetchData()
        } catch (error) {
            console.error('Error deleting template:', error)
            toast.error("Erro ao excluir modelo")
        }
    }

    if (loading) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (editingTemplate) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => setEditingTemplate(null)}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-black text-slate-800 dark:text-white">
                                {editingTemplate.id ? "Editar Modelo" : "Novo Modelo de Contrato"}
                            </h1>
                            <p className="text-slate-500 text-sm">Configure o texto base e as variáveis do contrato.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="outline" onClick={() => setEditingTemplate(null)} className="rounded-xl border-none bg-white dark:bg-slate-900 font-bold">
                            Cancelar
                        </Button>
                        <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-premium">
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                            Salvar Modelo
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="lg:col-span-3 space-y-4">
                        <Card className="rounded-3xl border-none shadow-premium">
                            <CardContent className="p-6 space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase text-slate-400">Título do Modelo</Label>
                                    <Input
                                        value={editingTemplate.title}
                                        onChange={e => setEditingTemplate({ ...editingTemplate, title: e.target.value })}
                                        className="h-12 rounded-xl bg-slate-50 border-none px-4 font-bold dark:bg-slate-800"
                                        placeholder="Ex: Contrato de Prestação de Serviços 2024"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase text-slate-400">Conteúdo do Contrato</Label>
                                    <ContractEditor
                                        content={editingTemplate.content}
                                        onChange={content => setEditingTemplate({ ...editingTemplate, content })}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        <Card className="rounded-3xl border-none shadow-premium bg-blue-600 text-white">
                            <CardHeader>
                                <CardTitle className="text-lg font-black flex items-center gap-2">
                                    <Settings className="w-5 h-5" />
                                    Variáveis Disponíveis
                                </CardTitle>
                                <CardDescription className="text-blue-100 text-xs">
                                    Clique para copiar e cole no editor.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {[
                                    { label: "Nome do Aluno", tag: "{{nome_aluno}}" },
                                    { label: "CPF do Aluno", tag: "{{cpf_aluno}}" },
                                    { label: "Data de Nascimento", tag: "{{data_nascimento}}" },
                                    { label: "Endereço Completo", tag: "{{endereco_aluno}}" },
                                    { label: "Curso/Turma", tag: "{{nome_turma}}" },
                                    { label: "Valor Mensalidade", tag: "{{valor_mensalidade}}" },
                                    { label: "Assinatura Escola", tag: "{{assinatura_escola}}" },
                                    { label: "Logo Escola", tag: "{{logo_escola}}" },
                                ].map(v => (
                                    <button
                                        key={v.tag}
                                        onClick={() => {
                                            navigator.clipboard.writeText(v.tag)
                                            toast.success("Copiado!", { duration: 1000 })
                                        }}
                                        className="w-full text-left p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-xs font-mono flex justify-between items-center group"
                                    >
                                        <span>{v.label}</span>
                                        <Badge variant="outline" className="text-[9px] border-white/20 text-white group-hover:bg-white group-hover:text-blue-600 transition-colors">
                                            {v.tag}
                                        </Badge>
                                    </button>
                                ))}
                            </CardContent>
                        </Card>

                        <Card className="rounded-3xl border-none shadow-premium">
                            <CardHeader>
                                <CardTitle className="text-lg font-black flex items-center gap-2">
                                    <Upload className="w-5 h-5 text-blue-500" />
                                    Branding da Escola
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-slate-400">Assinatura Digital</Label>
                                    <div className="h-24 w-full rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center gap-2 group hover:border-blue-500 transition-colors cursor-pointer relative overflow-hidden">
                                        {schoolSettings?.school_signature_url ? (
                                            <img src={schoolSettings.school_signature_url} className="h-full w-full object-contain p-2" />
                                        ) : (
                                            <>
                                                <Signature className="w-6 h-6 text-slate-300 group-hover:text-blue-500" />
                                                <span className="text-[10px] font-bold text-slate-400 group-hover:text-blue-500 uppercase tracking-widest">Alterar Assinatura</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Modelos de Contrato</h1>
                    <p className="text-slate-500 mt-1">Crie e edite as minutas dos contratos da escola.</p>
                </div>
                <Button onClick={() => setEditingTemplate({ title: "", content: "" })} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-premium">
                    <Plus className="w-4 h-4 mr-2" /> Novo Modelo
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map(template => (
                    <Card key={template.id} className="rounded-3xl border-none shadow-premium group hover:scale-[1.02] transition-all cursor-pointer overflow-hidden border-2 border-transparent hover:border-blue-500/20">
                        <CardHeader className="bg-slate-50 dark:bg-slate-800/50 p-6 border-b border-slate-100 dark:border-slate-800">
                            <div className="h-12 w-12 rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
                                <FileText className="w-6 h-6" />
                            </div>
                            <CardTitle className="text-lg font-black text-slate-800 dark:text-white line-clamp-1">{template.title}</CardTitle>
                            <CardDescription className="text-slate-400 text-xs">Atualizado em: {new Date(template.updated_at).toLocaleDateString()}</CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 flex gap-2">
                            <Button variant="ghost" className="flex-1 rounded-xl font-bold text-xs" onClick={() => setEditingTemplate(template)}>
                                Editar
                            </Button>
                            <Button variant="ghost" className="rounded-xl text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30" size="icon" onClick={() => handleDelete(template.id)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </CardContent>
                    </Card>
                ))}

                {templates.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center py-12 text-center space-y-4">
                        <div className="h-20 w-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-300">
                            <Plus className="w-10 h-10" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Nenhum modelo criado</h3>
                            <p className="text-sm text-slate-400">Comece criando o primeiro modelo de contrato da escola.</p>
                        </div>
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl" onClick={() => setEditingTemplate({ title: "", content: "" })}>
                            Criar Primeiro Modelo
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}
