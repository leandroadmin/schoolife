import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Building2, Palette, BookOpen, Layers, Save, Plus, Pencil, Trash2, X, Check, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import type { SchoolSettings, CourseType, CourseLevel } from "@/types"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { ImageCropper } from "@/components/image-cropper"
import { useSettings } from "@/components/settings-provider"

export default function SettingsPage() {
    const [settings, setSettings] = useState<Partial<SchoolSettings>>({
        name: "",
        email: "",
        phone: "",
        whatsapp: "",
        address: "",
        facebook: "",
        instagram: "",
        operating_hours: "",
        primary_color: "#10b981",
        logo_url: "",
        school_signature_url: ""
    })
    const { refreshSettings } = useSettings()
    const [loadingSettings, setLoadingSettings] = useState(true)
    const [savingSettings, setSavingSettings] = useState(false)

    // Courses state
    const [courses, setCourses] = useState<CourseType[]>([])
    const [courseDialogOpen, setCourseDialogOpen] = useState(false)
    const [editingCourse, setEditingCourse] = useState<CourseType | null>(null)
    const [courseName, setCourseName] = useState("")
    const [courseDesc, setCourseDesc] = useState("")
    const [savingCourse, setSavingCourse] = useState(false)

    // Levels state
    const [levels, setLevels] = useState<CourseLevel[]>([])
    const [levelDialogOpen, setLevelDialogOpen] = useState(false)
    const [editingLevel, setEditingLevel] = useState<CourseLevel | null>(null)
    const [levelName, setLevelName] = useState("")
    const [levelDesc, setLevelDesc] = useState("")
    const [savingLevel, setSavingLevel] = useState(false)

    // Image Upload State
    const [logoFile, setLogoFile] = useState<File | null>(null)
    const [logoCropperOpen, setLogoCropperOpen] = useState(false)

    const handleCropComplete = async (blob: Blob, type: 'logo') => {
        try {
            setSavingSettings(true)
            const fileExt = "png"
            const fileName = `school-${type}-${Math.random()}.${fileExt}`
            const filePath = `assets/${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, blob, {
                    contentType: 'image/png',
                    upsert: true
                })

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath)

            const updateField = { logo_url: publicUrl }

            const { error: dbError } = await supabase
                .from('school_settings')
                .update({ ...updateField, updated_at: new Date().toISOString() })
                .eq('id', settings.id || '40189b3d-c32f-4723-a4da-ea57aab009b0')

            if (dbError) throw dbError

            setSettings(prev => ({ ...prev, logo_url: publicUrl }))

            toast.success("Imagem salva e carregada com sucesso!")
            refreshSettings()
        } catch (error: unknown) {
            console.error(error)
            toast.error("Erro ao enviar imagem", { description: error instanceof Error ? error.message : "Erro desconhecido" })
        } finally {
            setSavingSettings(false)
        }
    }

    // Fetch settings
    async function fetchSettings() {
        try {
            setLoadingSettings(true)
            const { data, error } = await supabase
                .from("school_settings")
                .select("*")
                .single()
            if (error && error.code !== 'PGRST116') throw error
            if (data) setSettings(data)
        } catch (err: unknown) {
            console.error("Erro ao buscar configurações:", err)
            // toast.error("Erro ao carregar configurações")
        } finally {
            setLoadingSettings(false)
        }
    }

    // Fetch courses
    async function fetchCourses() {
        try {
            const { data, error } = await supabase
                .from("course_types")
                .select("*")
                .order("created_at", { ascending: true })
            if (error) throw error
            setCourses(data || [])
        } catch (err) {
            console.error("Erro ao buscar cursos:", err)
        }
    }

    // Fetch levels
    async function fetchLevels() {
        try {
            const { data, error } = await supabase
                .from("course_levels")
                .select("*")
                .order("created_at", { ascending: true })
            if (error) throw error
            setLevels(data || [])
        } catch (err) {
            console.error("Erro ao buscar níveis:", err)
        }
    }

    useEffect(() => {
        fetchSettings()
        fetchCourses()
        fetchLevels()
    }, [])

    const handleSaveSettings = async () => {
        setSavingSettings(true)
        try {
            const { id, created_at, ...updateData } = settings as any;
            const { error } = await supabase
                .from("school_settings")
                .update({
                    ...updateData,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id || '40189b3d-c32f-4723-a4da-ea57aab009b0')

            if (error) throw error

            toast.success("Configurações salvas!", {
                description: "As alterações de identidade da escola foram aplicadas.",
            })
            refreshSettings()
        } catch (err: unknown) {
            console.error(err)
            toast.error("Erro ao salvar configurações", { description: err instanceof Error ? err.message : "Erro desconhecido" })
        } finally {
            setSavingSettings(false)
        }
    }

    // Course CRUD
    const openNewCourse = () => {
        setEditingCourse(null)
        setCourseName("")
        setCourseDesc("")
        setCourseDialogOpen(true)
    }

    const openEditCourse = (course: CourseType) => {
        setEditingCourse(course)
        setCourseName(course.name)
        setCourseDesc(course.description || "")
        setCourseDialogOpen(true)
    }

    const handleSaveCourse = async () => {
        if (!courseName.trim()) {
            toast.error("Nome do curso é obrigatório")
            return
        }
        setSavingCourse(true)
        try {
            if (editingCourse) {
                const { error } = await supabase
                    .from("course_types")
                    .update({ name: courseName.trim(), description: courseDesc.trim() || null })
                    .eq("id", editingCourse.id)
                if (error) throw error
                toast.success("Curso atualizado!")
            } else {
                const { error } = await supabase
                    .from("course_types")
                    .insert([{ name: courseName.trim(), description: courseDesc.trim() || null }])
                if (error) throw error
                toast.success("Curso criado!", { description: `"${courseName}" foi adicionado.` })
            }
            setCourseDialogOpen(false)
            fetchCourses()
        } catch (err: unknown) {
            console.error(err)
            toast.error("Erro ao salvar curso", { description: err instanceof Error ? err.message : "Erro desconhecido" })
        } finally {
            setSavingCourse(false)
        }
    }

    const handleDeleteCourse = async (course: CourseType) => {
        if (!confirm(`Excluir o curso "${course.name}"?`)) return
        try {
            const { error } = await supabase.from("course_types").delete().eq("id", course.id)
            if (error) throw error
            toast.success("Curso excluído!")
            fetchCourses()
        } catch (err: unknown) {
            console.error(err)
            toast.error("Erro ao excluir", { description: err instanceof Error ? err.message : "Erro desconhecido" })
        }
    }

    // Level CRUD
    const openNewLevel = () => {
        setEditingLevel(null)
        setLevelName("")
        setLevelDesc("")
        setLevelDialogOpen(true)
    }

    const openEditLevel = (level: CourseLevel) => {
        setEditingLevel(level)
        setLevelName(level.name)
        setLevelDesc(level.description || "")
        setLevelDialogOpen(true)
    }

    const handleSaveLevel = async () => {
        if (!levelName.trim()) {
            toast.error("Nome do nível é obrigatório")
            return
        }
        setSavingLevel(true)
        try {
            if (editingLevel) {
                const { error } = await supabase
                    .from("course_levels")
                    .update({ name: levelName.trim(), description: levelDesc.trim() || null })
                    .eq("id", editingLevel.id)
                if (error) throw error
                toast.success("Nível atualizado!")
            } else {
                const { error } = await supabase
                    .from("course_levels")
                    .insert([{ name: levelName.trim(), description: levelDesc.trim() || null }])
                if (error) throw error
                toast.success("Nível criado!", { description: `"${levelName}" foi adicionado.` })
            }
            setLevelDialogOpen(false)
            fetchLevels()
        } catch (err: unknown) {
            console.error(err)
            toast.error("Erro ao salvar nível", { description: err instanceof Error ? err.message : "Erro desconhecido" })
        } finally {
            setSavingLevel(false)
        }
    }

    const handleDeleteLevel = async (level: CourseLevel) => {
        if (!confirm(`Excluir o nível "${level.name}"?`)) return
        try {
            const { error } = await supabase.from("course_levels").delete().eq("id", level.id)
            if (error) throw error
            toast.success("Nível excluído!")
            fetchLevels()
        } catch (err: unknown) {
            console.error(err)
            toast.error("Erro ao excluir", { description: err instanceof Error ? err.message : "Erro desconhecido" })
        }
    }

    if (loadingSettings) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-in-stagger pb-20">
            <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white">Configurações</h1>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Personalize o sistema e gerencie as estruturas base da sua escola.</p>
            </div>

            <Tabs defaultValue="school" className="space-y-6">
                <TabsList className="bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl h-14 border-none shadow-inner">
                    <TabsTrigger value="school" className="rounded-xl px-6 font-bold text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">
                        <Building2 className="mr-2 h-4 w-4" /> Perfil da Escola
                    </TabsTrigger>
                    <TabsTrigger value="branding" className="rounded-xl px-6 font-bold text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">
                        <Palette className="mr-2 h-4 w-4" /> Branding & Layout
                    </TabsTrigger>
                    <TabsTrigger value="courses" className="rounded-xl px-6 font-bold text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">
                        <BookOpen className="mr-2 h-4 w-4" /> Cursos
                    </TabsTrigger>
                    <TabsTrigger value="levels" className="rounded-xl px-6 font-bold text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">
                        <Layers className="mr-2 h-4 w-4" /> Níveis
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="school" className="space-y-6">
                    <Card className="border-none shadow-premium bg-white dark:bg-slate-900 overflow-hidden rounded-[32px]">
                        <CardHeader className="px-8 pt-8 pb-4">
                            <CardTitle className="text-xl font-bold">Informações Gerais</CardTitle>
                        </CardHeader>
                        <CardContent className="px-8 pb-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Nome da Instituição</Label>
                                    <Input
                                        value={settings.name || ""}
                                        onChange={e => setSettings({ ...settings, name: e.target.value })}
                                        className="h-12 rounded-xl bg-slate-50 dark:bg-slate-800 border-none shadow-inner font-medium"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">E-mail de Contato</Label>
                                    <Input
                                        value={settings.email || ""}
                                        onChange={e => setSettings({ ...settings, email: e.target.value })}
                                        className="h-12 rounded-xl bg-slate-50 dark:bg-slate-800 border-none shadow-inner font-medium"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Telefone Fixo</Label>
                                    <Input
                                        value={settings.phone || ""}
                                        onChange={e => setSettings({ ...settings, phone: e.target.value })}
                                        className="h-12 rounded-xl bg-slate-50 dark:bg-slate-800 border-none shadow-inner font-medium"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">WhatsApp Business</Label>
                                    <Input
                                        value={settings.whatsapp || ""}
                                        onChange={e => setSettings({ ...settings, whatsapp: e.target.value })}
                                        className="h-12 rounded-xl bg-slate-50 dark:bg-slate-800 border-none shadow-inner font-medium"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Endereço Completo</Label>
                                <Input
                                    value={settings.address || ""}
                                    onChange={e => setSettings({ ...settings, address: e.target.value })}
                                    className="h-12 rounded-xl bg-slate-50 dark:bg-slate-800 border-none shadow-inner font-medium"
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Horário de Funcionamento</Label>
                                    <Input
                                        value={settings.operating_hours || ""}
                                        onChange={e => setSettings({ ...settings, operating_hours: e.target.value })}
                                        className="h-12 rounded-xl bg-slate-50 dark:bg-slate-800 border-none shadow-inner font-medium"
                                        placeholder="Ex: Seg-Sex 08:00 - 18:00"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Instagram (@)</Label>
                                    <Input
                                        value={settings.instagram || ""}
                                        onChange={e => setSettings({ ...settings, instagram: e.target.value })}
                                        className="h-12 rounded-xl bg-slate-50 dark:bg-slate-800 border-none shadow-inner font-medium"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Facebook</Label>
                                    <Input
                                        value={settings.facebook || ""}
                                        onChange={e => setSettings({ ...settings, facebook: e.target.value })}
                                        className="h-12 rounded-xl bg-slate-50 dark:bg-slate-800 border-none shadow-inner font-medium"
                                    />
                                </div>
                            </div>
                            <div className="pt-4 flex justify-end">
                                <Button onClick={handleSaveSettings} disabled={savingSettings} className="h-12 px-8 font-black uppercase tracking-widest text-[11px] rounded-xl shadow-lg shadow-primary/20">
                                    {savingSettings ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4 stroke-[3]" />}
                                    Salvar Alterações
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="branding" className="space-y-6">
                    <Card className="border-none shadow-premium bg-white dark:bg-slate-900 overflow-hidden rounded-[32px]">
                        <CardHeader className="px-8 pt-8 pb-4">
                            <CardTitle className="text-xl font-bold">Identidade Visual</CardTitle>
                        </CardHeader>
                        <CardContent className="px-8 pb-8 space-y-8">
                            <div className="flex flex-col md:flex-row gap-12">
                                <div className="space-y-4 flex-1">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Cor Primária do Sistema</Label>
                                        <div className="flex gap-4 items-center">
                                            <Input
                                                type="color"
                                                value={settings.primary_color || "#10b981"}
                                                onChange={e => setSettings({ ...settings, primary_color: e.target.value })}
                                                className="h-14 w-14 rounded-2xl cursor-pointer p-1 border-none shadow-lg outline-none"
                                            />
                                            <div className="text-sm font-bold font-mono text-slate-500 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-xl">
                                                {settings.primary_color || "#10b981"}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Logotipo (Quadrado 1:1 formatado)</Label>
                                            <div className="flex gap-2 items-center">
                                                <Input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    id="logo-upload"
                                                    onChange={(e) => {
                                                        if (e.target.files && e.target.files[0]) {
                                                            setLogoFile(e.target.files[0])
                                                            setLogoCropperOpen(true)
                                                        }
                                                        e.target.value = ''
                                                    }}
                                                />
                                                <Button
                                                    variant="outline"
                                                    onClick={() => document.getElementById('logo-upload')?.click()}
                                                    className="h-12 w-full rounded-xl bg-slate-50 dark:bg-slate-800 border-none shadow-inner font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 hover:text-slate-900 justify-start"
                                                    disabled={savingSettings}
                                                >
                                                    Fazer Upload da Logo
                                                </Button>
                                                {settings.logo_url && (
                                                    <div className="flex items-center gap-2 ml-2">
                                                        <div className="h-12 w-12 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden">
                                                            <img src={settings.logo_url} alt="Logo preview" className="max-h-full max-w-full object-contain" />
                                                        </div>
                                                        <Button variant="ghost" className="h-12 px-3 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setSettings({ ...settings, logo_url: "" })}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            </div>
                            <div className="pt-4 flex justify-end">
                                <Button onClick={handleSaveSettings} disabled={savingSettings} className="h-12 px-8 font-black uppercase tracking-widest text-[11px] rounded-xl shadow-lg shadow-primary/20">
                                    {savingSettings ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4 stroke-[3]" />}
                                    Atualizar Estilo
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="courses" className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold px-2">Gerenciar Cursos</h2>
                        <Button onClick={openNewCourse} className="h-10 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-primary/20">
                            <Plus className="mr-2 h-4 w-4 stroke-[3]" /> Novo Curso
                        </Button>
                    </div>
                    {!courses.length ? (
                        <Card className="border-none shadow-premium bg-white dark:bg-slate-900 rounded-[24px]">
                            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                                <BookOpen className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
                                <p className="text-sm font-bold text-slate-500">Nenhum curso cadastrado</p>
                                <p className="text-xs text-slate-400 mt-1">Clique em "Novo Curso" para adicionar o primeiro.</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {courses.map(course => (
                                <Card key={course.id} className="border-none shadow-premium bg-white dark:bg-slate-900 overflow-hidden rounded-[24px] hover:-translate-y-1 transition-all group">
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                                            <BookOpen className="h-5 w-5" />
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight">{course.name}</h3>
                                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-2">{course.description || "Sem descrição"}</p>
                                        <div className="mt-6 flex gap-2">
                                            <Button onClick={() => openEditCourse(course)} variant="secondary" className="flex-1 h-9 rounded-lg text-[10px] font-bold uppercase tracking-widest">
                                                <Pencil className="mr-1 h-3 w-3" /> Editar
                                            </Button>
                                            <Button onClick={() => handleDeleteCourse(course)} variant="ghost" className="h-9 rounded-lg text-[10px] font-bold uppercase tracking-widest text-red-500 hover:bg-red-50 hover:text-red-600">
                                                <Trash2 className="mr-1 h-3 w-3" /> Excluir
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="levels" className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold px-2">Níveis de Aprendizado</h2>
                        <Button onClick={openNewLevel} className="h-10 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-primary/20">
                            <Plus className="mr-2 h-4 w-4 stroke-[3]" /> Novo Nível
                        </Button>
                    </div>
                    {!levels.length ? (
                        <Card className="border-none shadow-premium bg-white dark:bg-slate-900 rounded-[32px]">
                            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                                <Layers className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
                                <p className="text-sm font-bold text-slate-500">Nenhum nível cadastrado</p>
                                <p className="text-xs text-slate-400 mt-1">Clique em "Novo Nível" para adicionar o primeiro.</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="border-none shadow-premium bg-white dark:bg-slate-900 overflow-hidden rounded-[32px]">
                            <CardContent className="p-0">
                                <div className="divide-y divide-slate-50 dark:divide-slate-800">
                                    {levels.map(level => (
                                        <div key={level.id} className="flex items-center justify-between p-6 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center font-black group-hover:bg-primary group-hover:text-white transition-colors">
                                                    {level.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 dark:text-white">{level.name}</p>
                                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{level.description || "Sem descrição"}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button onClick={() => openEditLevel(level)} variant="outline" size="sm" className="h-8 rounded-lg text-[10px] font-bold border-2">
                                                    <Pencil className="mr-1 h-3 w-3" /> Editar
                                                </Button>
                                                <Button onClick={() => handleDeleteLevel(level)} variant="ghost" size="sm" className="h-8 rounded-lg text-[10px] font-bold text-red-500 hover:bg-red-50 hover:text-red-600">
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>

            {/* Dialogs remain the same or slightly adjusted to fit state */}
            <Dialog open={courseDialogOpen} onOpenChange={setCourseDialogOpen}>
                <DialogContent className="max-w-md rounded-[24px] border-none shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black">{editingCourse ? "Editar Curso" : "Novo Curso"}</DialogTitle>
                        <DialogDescription className="text-slate-500 font-medium">
                            {editingCourse ? "Atualize os dados do curso." : "Preencha os dados para criar um novo curso."}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Nome do Curso *</Label>
                            <Input
                                value={courseName || ""}
                                onChange={e => setCourseName(e.target.value)}
                                placeholder="Ex: Inglês, Espanhol..."
                                className="h-12 rounded-xl bg-slate-50 border-none shadow-inner font-medium"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Descrição</Label>
                            <Input
                                value={courseDesc || ""}
                                onChange={e => setCourseDesc(e.target.value)}
                                placeholder="Descrição breve do curso"
                                className="h-12 rounded-xl bg-slate-50 border-none shadow-inner font-medium"
                            />
                        </div>
                        <div className="flex justify-end gap-3 pt-4">
                            <Button variant="outline" onClick={() => setCourseDialogOpen(false)} className="rounded-xl font-bold text-xs text-black">
                                <X className="mr-1 h-3.5 w-3.5" /> Cancelar
                            </Button>
                            <Button onClick={handleSaveCourse} disabled={savingCourse} className="rounded-xl font-bold text-xs shadow-lg shadow-primary/20">
                                {savingCourse ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-1 h-3.5 w-3.5" />}
                                {editingCourse ? "Salvar" : "Criar Curso"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={levelDialogOpen} onOpenChange={setLevelDialogOpen}>
                <DialogContent className="max-w-md rounded-[24px] border-none shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black">{editingLevel ? "Editar Nível" : "Novo Nível"}</DialogTitle>
                        <DialogDescription className="text-slate-500 font-medium">
                            {editingLevel ? "Atualize os dados do nível." : "Preencha os dados para criar um novo nível."}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Nome do Nível *</Label>
                            <Input
                                value={levelName || ""}
                                onChange={e => setLevelName(e.target.value)}
                                placeholder="Ex: Iniciante, Intermediário..."
                                className="h-12 rounded-xl bg-slate-50 border-none shadow-inner font-medium"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Descrição</Label>
                            <Input
                                value={levelDesc || ""}
                                onChange={e => setLevelDesc(e.target.value)}
                                placeholder="Ex: CEFR A1/A2"
                                className="h-12 rounded-xl bg-slate-50 border-none shadow-inner font-medium"
                            />
                        </div>
                        <div className="flex justify-end gap-3 pt-4">
                            <Button variant="outline" onClick={() => setLevelDialogOpen(false)} className="rounded-xl font-bold text-xs text-black">
                                <X className="mr-1 h-3.5 w-3.5" /> Cancelar
                            </Button>
                            <Button onClick={handleSaveLevel} disabled={savingLevel} className="rounded-xl font-bold text-xs shadow-lg shadow-primary/20">
                                {savingLevel ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-1 h-3.5 w-3.5" />}
                                {editingLevel ? "Salvar" : "Criar Nível"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
            <ImageCropper
                open={logoCropperOpen}
                onOpenChange={setLogoCropperOpen}
                imageFile={logoFile}
                onCropComplete={(blob) => handleCropComplete(blob, 'logo')}
            />
        </div>
    )
}
