import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { supabase } from "@/lib/supabase"
import { useState, useEffect } from "react"
import {
    Loader2,
    Camera,
    User,
    MapPin,
    GraduationCap,
    ShieldCheck,
    Calendar,
    Mail,
    Phone
} from "lucide-react"
import { toast } from "sonner"
import type { Student, Teacher, Class, CourseLevel, CourseType } from "@/types"
import { uploadAvatar } from "@/lib/upload-avatar"

const studentSchema = z.object({
    full_name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
    email: z.string().email("Email inválido").optional().or(z.literal("")),
    phone: z.string().optional(),
    rg: z.string().optional(),
    rg_uf: z.string().optional(),
    cpf: z.string().optional(),
    birth_date: z.string().optional(),
    age: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    avatar_url: z.string().optional(),
    class_id: z.string().optional(),
    level_id: z.string().optional(),
    teacher_id: z.string().optional(),
    course_type_id: z.string().optional(),
    username: z.string().min(4, "Usuário deve ter pelo menos 4 caracteres"),
    password: z.string().optional(),
})

type StudentFormValues = z.infer<typeof studentSchema>

interface StudentFormProps {
    onSuccess: () => void
    initialData?: Student | null
}

interface IBGEUF {
    id: number
    sigla: string
    nome: string
}

interface IBGECity {
    id: number
    nome: string
}

export function StudentForm({ onSuccess, initialData }: StudentFormProps) {
    const [loading, setLoading] = useState(false)
    const [teachers, setTeachers] = useState<Teacher[]>([])
    const [classes, setClasses] = useState<Class[]>([])
    const [levels, setLevels] = useState<CourseLevel[]>([])
    const [courseTypes, setCourseTypes] = useState<CourseType[]>([])
    const [ufs, setUfs] = useState<IBGEUF[]>([])
    const [cities, setCities] = useState<IBGECity[]>([])
    const [previewUrl, setPreviewUrl] = useState<string | null>(initialData?.avatar_url || null)
    const [avatarFile, setAvatarFile] = useState<File | null>(null)

    const form = useForm<StudentFormValues>({
        resolver: zodResolver(studentSchema),
        defaultValues: {
            full_name: initialData?.full_name || "",
            email: initialData?.email || "",
            phone: initialData?.phone || "",
            rg: initialData?.rg || "",
            rg_uf: initialData?.rg_uf || "",
            cpf: initialData?.cpf || "",
            birth_date: initialData?.birth_date || "",
            age: initialData?.age?.toString() || "",
            address: initialData?.address || "",
            city: initialData?.city || "",
            state: initialData?.state || "",
            username: initialData?.username || "",
            password: "",
            avatar_url: initialData?.avatar_url || "",
            class_id: initialData?.class_id || "",
            level_id: initialData?.level_id || "",
            teacher_id: initialData?.teacher_id || "",
            course_type_id: (initialData as any)?.course_type_id || "",
        },
    })

    // Reset form when initialData changes (e.g. when editing different students)
    useEffect(() => {
        if (initialData) {
            form.reset({
                full_name: initialData.full_name || "",
                email: initialData.email || "",
                phone: initialData.phone || "",
                rg: initialData.rg || "",
                rg_uf: initialData.rg_uf || "",
                cpf: initialData.cpf || "",
                birth_date: initialData.birth_date || "",
                age: initialData.age?.toString() || "",
                address: initialData.address || "",
                city: initialData.city || "",
                state: initialData.state || "",
                username: initialData.username || "",
                password: "", // Keep password empty for security if not changing
                avatar_url: initialData.avatar_url || "",
                class_id: initialData.class_id || "",
                level_id: initialData.level_id || "",
                teacher_id: initialData.teacher_id || "",
                course_type_id: (initialData as any)?.course_type_id || "",
            })
            setPreviewUrl(initialData.avatar_url || null)

            if (initialData.state) {
                handleStateChange(initialData.state)
            }
        } else {
            form.reset({
                full_name: "",
                email: "",
                phone: "",
                rg: "",
                rg_uf: "",
                cpf: "",
                birth_date: "",
                age: "",
                address: "",
                city: "",
                state: "",
                username: "",
                password: "",
                avatar_url: "",
                class_id: "",
                level_id: "",
                teacher_id: "",
                course_type_id: "",
            })
            setPreviewUrl(null)
            setCities([])
        }
    }, [initialData, form])

    useEffect(() => {
        async function loadFormData() {
            try {
                const [
                    { data: teachersList },
                    { data: classesList },
                    { data: levelsList },
                    { data: courseTypesList }
                ] = await Promise.all([
                    supabase.from('teachers').select('id, full_name'),
                    supabase.from('classes').select('id, name'),
                    supabase.from('course_levels').select('id, name'),
                    supabase.from('course_types').select('id, name')
                ])

                if (teachersList) setTeachers(teachersList as any)
                if (classesList) setClasses(classesList as any)
                if (levelsList) setLevels(levelsList as any)
                if (courseTypesList) setCourseTypes(courseTypesList as any)

                // Load UFs
                const response = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome')
                const data = await response.json()
                setUfs(data)
            } catch (err) {
                console.error("Erro ao carregar dados do formulário:", err)
            }
        }
        loadFormData()
    }, [])

    const handleStateChange = async (uf: string) => {
        form.setValue("state", uf)
        if (uf) {
            try {
                const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`)
                const data = await response.json()
                setCities(data)
            } catch (error) {
                console.error("Erro ao carregar cidades:", error)
            }
        } else {
            setCities([])
        }
    }

    const calculateAge = (birthDate: string) => {
        if (!birthDate) return ""
        const today = new Date()
        const birth = new Date(birthDate)
        let age = today.getFullYear() - birth.getFullYear()
        const m = today.getMonth() - birth.getMonth()
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
            age--
        }
        return age.toString()
    }

    const onBirthDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        form.setValue("birth_date", value)
        const age = calculateAge(value)
        form.setValue("age", age)
    }

    async function onSubmit(data: StudentFormValues) {
        setLoading(true)
        try {
            // Upload avatar if a new file was selected
            let avatarUrl = data.avatar_url || null
            if (avatarFile) {
                const uploadedUrl = await uploadAvatar(avatarFile, "students")
                if (uploadedUrl) avatarUrl = uploadedUrl
            }

            const payload: Record<string, any> = {
                full_name: data.full_name,
                email: data.email || null,
                phone: data.phone || null,
                rg: data.rg || null,
                rg_uf: data.rg_uf || null,
                cpf: data.cpf || null,
                birth_date: data.birth_date || null,
                age: data.age ? parseInt(data.age) : null,
                address: data.address || null,
                city: data.city || null,
                state: data.state || null,
                avatar_url: avatarUrl,
                class_id: data.class_id || null,
                level_id: data.level_id || null,
                teacher_id: data.teacher_id || null,
                course_type_id: data.course_type_id || null,
                username: data.username,
                status: "active",
            }

            // Only include password if provided (avoids overwriting on edit)
            if (data.password && data.password.length > 0) {
                payload.password = data.password
            } else if (!initialData) {
                // New student — send null if no password
                payload.password = null
            }

            let error

            if (initialData?.id) {
                // Update existing student
                const { error: updateError } = await supabase
                    .from("students")
                    .update(payload)
                    .eq("id", initialData.id)
                error = updateError
            } else {
                // Insert new student
                const { error: insertError } = await supabase
                    .from("students")
                    .insert([payload])
                error = insertError
            }

            if (error) throw error

            toast.success(initialData?.id ? "Aluno atualizado!" : "Aluno cadastrado!", {
                description: `${data.full_name} foi ${initialData?.id ? "atualizado" : "adicionado"} no sistema.`
            })
            onSuccess()
        } catch (error: any) {
            console.error(error)
            toast.error("Erro ao salvar", {
                description: error.message || "Verifique os dados e tente novamente."
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10 pb-10">
            {/* SEÇÃO 1: PERFIL & FOTO */}
            <div className="space-y-6">
                <div className="flex items-center gap-2 text-primary">
                    <User className="h-5 w-5 stroke-[2.5]" />
                    <h3 className="font-black uppercase tracking-widest text-xs">Dados de Perfil {initialData && "(Edição)"}</h3>
                </div>

                <div className="flex flex-col md:flex-row gap-8 items-start">
                    <div className="relative group">
                        <Avatar className="h-24 w-24 rounded-3xl border-4 border-white dark:border-slate-800 shadow-premium">
                            <AvatarImage src={previewUrl || ""} />
                            <AvatarFallback className="bg-slate-100 dark:bg-slate-800 text-slate-400">
                                <User className="h-8 w-8" />
                            </AvatarFallback>
                        </Avatar>
                        <label className="absolute -bottom-2 -right-2 h-10 w-10 bg-primary text-white rounded-xl shadow-lg shadow-primary/30 flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-all">
                            <Camera className="h-5 w-5" />
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) {
                                    setPreviewUrl(URL.createObjectURL(file))
                                    setAvatarFile(file)
                                }
                            }} />
                        </label>
                    </div>

                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Nome Completo *</Label>
                            <Input placeholder="Ex: João Silva" {...form.register("full_name")} className="rounded-xl h-11 bg-slate-50 border-none shadow-inner" />
                            {form.formState.errors.full_name && <p className="text-[10px] text-destructive font-bold">{form.formState.errors.full_name.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">E-mail</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                                <Input placeholder="joao@email.com" {...form.register("email")} className="rounded-xl h-11 bg-slate-50 border-none shadow-inner pl-10" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Celular / WhatsApp</Label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                                <Input placeholder="(11) 99999-9999" {...form.register("phone")} className="rounded-xl h-11 bg-slate-50 border-none shadow-inner pl-10" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* SEÇÃO 2: LOCALIZAÇÃO & PESSOAL */}
            <div className="space-y-6">
                <div className="flex items-center gap-2 text-primary">
                    <MapPin className="h-5 w-5 stroke-[2.5]" />
                    <h3 className="font-black uppercase tracking-widest text-xs">Informações Pessoais</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">RG</Label>
                        <div className="flex gap-2">
                            <Input placeholder="00.000.000-0" {...form.register("rg")} className="rounded-xl h-11 bg-slate-50 border-none shadow-inner" />
                            <Select onValueChange={(v) => form.setValue("rg_uf", v)}>
                                <SelectTrigger className="w-20 rounded-xl h-11 bg-slate-50 border-none shadow-inner">
                                    <SelectValue placeholder="UF" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-none shadow-2xl h-60">
                                    {ufs.map(uf => <SelectItem key={uf.id} value={uf.sigla}>{uf.sigla}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">CPF</Label>
                        <Input placeholder="000.000.000-00" {...form.register("cpf")} className="rounded-xl h-11 bg-slate-50 border-none shadow-inner" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Data de Nascimento</Label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                            <Input type="date" {...form.register("birth_date")} onChange={onBirthDateChange} className="rounded-xl h-11 bg-slate-50 border-none shadow-inner pl-10" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Idade</Label>
                        <Input readOnly placeholder="0" {...form.register("age")} className="rounded-xl h-11 bg-slate-100 border-none font-bold text-center" />
                    </div>

                    <div className="md:col-span-2 space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Endereço Completo</Label>
                        <Input placeholder="Rua, Número, Bairro" {...form.register("address")} className="rounded-xl h-11 bg-slate-50 border-none shadow-inner" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Estado</Label>
                        <Select onValueChange={handleStateChange} value={form.watch("state")}>
                            <SelectTrigger className="rounded-xl h-11 bg-slate-50 border-none shadow-inner">
                                <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-none shadow-2xl h-60">
                                {ufs.map(uf => <SelectItem key={uf.id} value={uf.sigla}>{uf.nome}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Cidade</Label>
                        <Select onValueChange={(v) => form.setValue("city", v)} disabled={cities.length === 0} value={form.watch("city")}>
                            <SelectTrigger className="rounded-xl h-11 bg-slate-50 border-none shadow-inner">
                                <SelectValue placeholder={cities.length === 0 ? "Selecione o Estado" : "Selecione a Cidade"} />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-none shadow-2xl h-60">
                                {cities.map(city => <SelectItem key={city.id} value={city.nome}>{city.nome}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* SEÇÃO 3: ACADÊMICO */}
            <div className="space-y-6">
                <div className="flex items-center gap-2 text-primary">
                    <GraduationCap className="h-5 w-5 stroke-[2.5]" />
                    <h3 className="font-black uppercase tracking-widest text-xs">Vínculo Acadêmico</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Turma</Label>
                        <Select onValueChange={(v: string) => form.setValue("class_id", v)} value={form.watch("class_id")}>
                            <SelectTrigger className="rounded-xl h-11 bg-slate-50 border-none shadow-inner">
                                <SelectValue placeholder="Selecionar Turma" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-none shadow-2xl">
                                {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                {classes.length === 0 && <SelectItem value="none" disabled>Nenhuma turma encontrada</SelectItem>}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Nível</Label>
                        <Select onValueChange={(v: string) => form.setValue("level_id", v)} value={form.watch("level_id")}>
                            <SelectTrigger className="rounded-xl h-11 bg-slate-50 border-none shadow-inner">
                                <SelectValue placeholder="Selecionar Nível" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-none shadow-2xl">
                                {levels.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                                {levels.length === 0 && <SelectItem value="none" disabled>Nenhum nível cadastrado</SelectItem>}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Professor Responsável</Label>
                        <Select onValueChange={(v: string) => form.setValue("teacher_id", v)} value={form.watch("teacher_id")}>
                            <SelectTrigger className="rounded-xl h-11 bg-slate-50 border-none shadow-inner">
                                <SelectValue placeholder="Selecionar Professor" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-none shadow-2xl">
                                {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}
                                {teachers.length === 0 && <SelectItem value="none" disabled>Nenhum professor encontrado</SelectItem>}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Curso</Label>
                        <Select onValueChange={(v: string) => form.setValue("course_type_id", v)} value={form.watch("course_type_id")}>
                            <SelectTrigger className="rounded-xl h-11 bg-slate-50 border-none shadow-inner">
                                <SelectValue placeholder="Selecionar Curso" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-none shadow-2xl">
                                {courseTypes.map(ct => <SelectItem key={ct.id} value={ct.id}>{ct.name}</SelectItem>)}
                                {courseTypes.length === 0 && <SelectItem value="none" disabled>Nenhum curso cadastrado</SelectItem>}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* SEÇÃO 4: ACESSO */}
            <div className="space-y-6">
                <div className="flex items-center gap-2 text-primary">
                    <ShieldCheck className="h-5 w-5 stroke-[2.5]" />
                    <h3 className="font-black uppercase tracking-widest text-xs">Acesso ao Sistema</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Nome de Usuário (Login) *</Label>
                        <Input placeholder="joao.silva" {...form.register("username")} className="rounded-xl h-11 bg-slate-50 border-none shadow-inner font-bold" />
                        {form.formState.errors.username && <p className="text-[10px] text-destructive font-bold">{form.formState.errors.username.message}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Senha de Acesso *</Label>
                        <Input type="password" placeholder="••••••••" {...form.register("password")} className="rounded-xl h-11 bg-slate-50 border-none shadow-inner font-bold" />
                        {form.formState.errors.password && <p className="text-[10px] text-destructive font-bold">{form.formState.errors.password.message}</p>}
                    </div>
                </div>
                <p className="text-[11px] text-slate-400 italic">* As credenciais permitirão que o aluno acesse o portal do aluno futuramente.</p>
            </div>

            <div className="flex justify-end pt-8">
                <Button type="submit" disabled={loading} className="h-14 px-12 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/30 active:scale-95 transition-all">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-5 w-5" />}
                    {initialData ? "Salvar Alterações" : "Finalizar Matrícula"}
                </Button>
            </div>
        </form>
    )
}
