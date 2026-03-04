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
    ShieldCheck,
    Calendar,
    Mail,
    Phone,
    Briefcase,
    DollarSign
} from "lucide-react"
import { toast } from "sonner"
import type { Teacher } from "@/types"
import { uploadAvatar } from "@/lib/upload-avatar"

const teacherSchema = z.object({
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
    specialties: z.string().optional(),
    hourly_rate: z.string().optional(),
    username: z.string().min(4, "Usuário deve ter pelo menos 4 caracteres"),
    password: z.string().optional(),
})

type TeacherFormValues = z.infer<typeof teacherSchema>

interface TeacherFormProps {
    onSuccess: () => void
    initialData?: Teacher | null
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

export function TeacherForm({ onSuccess, initialData }: TeacherFormProps) {
    const [loading, setLoading] = useState(false)
    const [ufs, setUfs] = useState<IBGEUF[]>([])
    const [cities, setCities] = useState<IBGECity[]>([])
    const [previewUrl, setPreviewUrl] = useState<string | null>(initialData?.avatar_url || null)
    const [avatarFile, setAvatarFile] = useState<File | null>(null)

    const form = useForm<TeacherFormValues>({
        resolver: zodResolver(teacherSchema),
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
            specialties: initialData?.specialties?.join(", ") || "",
            hourly_rate: initialData?.hourly_rate?.toString() || "",
            username: initialData?.username || "",
            password: "",
        },
    })

    // Reset form when initialData changes
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
                specialties: initialData.specialties?.join(", ") || "",
                hourly_rate: initialData.hourly_rate?.toString() || "",
                username: initialData.username || "",
                password: "",
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
                specialties: "",
                hourly_rate: "",
                username: "",
                password: "",
            })
            setPreviewUrl(null)
            setCities([])
        }
    }, [initialData, form])

    useEffect(() => {
        async function loadUFs() {
            try {
                const response = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome')
                const data = await response.json()
                setUfs(data)

                if (initialData?.state) {
                    handleStateChange(initialData.state)
                }
            } catch (err) {
                console.error("Erro ao carregar UFs:", err)
            }
        }
        loadUFs()
    }, [initialData])

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

    async function onSubmit(data: TeacherFormValues) {
        setLoading(true)
        try {
            // Upload avatar if a new file was selected
            let avatarUrl = data.avatar_url || null
            if (avatarFile) {
                const uploadedUrl = await uploadAvatar(avatarFile, "teachers")
                if (uploadedUrl) avatarUrl = uploadedUrl
            }

            const specialtiesArray = data.specialties ? data.specialties.split(",").map(s => s.trim()) : []
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
                specialties: specialtiesArray,
                hourly_rate: data.hourly_rate ? parseFloat(data.hourly_rate) : null,
                username: data.username,
                status: "active",
            }

            // Only include password if provided
            if (data.password && data.password.length > 0) {
                payload.password = data.password
            } else if (!initialData) {
                payload.password = null
            }

            let error

            if (initialData?.id) {
                const { error: updateError } = await supabase
                    .from("teachers")
                    .update(payload)
                    .eq("id", initialData.id)
                error = updateError
            } else {
                const { error: insertError } = await supabase
                    .from("teachers")
                    .insert([payload])
                error = insertError
            }

            if (error) throw error

            toast.success(initialData?.id ? "Professor atualizado!" : "Professor cadastrado!", {
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
                            <Input placeholder="Ex: Prof. Marcos Santos" {...form.register("full_name")} className="rounded-xl h-11 bg-slate-50 border-none shadow-inner" />
                            {form.formState.errors.full_name && <p className="text-[10px] text-destructive font-bold">{form.formState.errors.full_name.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">E-mail</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                                <Input placeholder="marcos@escola.com" {...form.register("email")} className="rounded-xl h-11 bg-slate-50 border-none shadow-inner pl-10" />
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

            {/* SEÇÃO 2: PROFISSIONAL */}
            <div className="space-y-6">
                <div className="flex items-center gap-2 text-primary">
                    <Briefcase className="h-5 w-5 stroke-[2.5]" />
                    <h3 className="font-black uppercase tracking-widest text-xs">Informações Profissionais</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Especialidades (separadas por vírgula)</Label>
                        <Input placeholder="Inglês Avançado, Gramática, TOEFL" {...form.register("specialties")} className="rounded-xl h-11 bg-slate-50 border-none shadow-inner" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Valor Hora/Aula (R$)</Label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                            <Input type="number" step="0.01" placeholder="50.00" {...form.register("hourly_rate")} className="rounded-xl h-11 bg-slate-50 border-none shadow-inner pl-10" />
                        </div>
                    </div>
                </div>
            </div>

            {/* SEÇÃO 3: LOCALIZAÇÃO & PESSOAL */}
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
                            <Select onValueChange={(v) => form.setValue("rg_uf", v)} value={form.watch("rg_uf")}>
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

            {/* SEÇÃO 4: ACESSO */}
            <div className="space-y-6">
                <div className="flex items-center gap-2 text-primary">
                    <ShieldCheck className="h-5 w-5 stroke-[2.5]" />
                    <h3 className="font-black uppercase tracking-widest text-xs">Acesso ao Sistema</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Nome de Usuário (Login) *</Label>
                        <Input placeholder="marcos.santos" {...form.register("username")} className="rounded-xl h-11 bg-slate-50 border-none shadow-inner font-bold" />
                        {form.formState.errors.username && <p className="text-[10px] text-destructive font-bold">{form.formState.errors.username.message}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Senha de Acesso *</Label>
                        <Input type="password" placeholder="••••••••" {...form.register("password")} className="rounded-xl h-11 bg-slate-50 border-none shadow-inner font-bold" />
                        {form.formState.errors.password && <p className="text-[10px] text-destructive font-bold">{form.formState.errors.password.message}</p>}
                    </div>
                </div>
                <p className="text-[11px] text-slate-400 italic">* As credenciais permitirão que o professor acesse o portal do docente.</p>
            </div>

            <div className="flex justify-end pt-8">
                <Button type="submit" disabled={loading} className="h-14 px-12 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/30 active:scale-95 transition-all">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-5 w-5" />}
                    {initialData ? "Salvar Alterações" : "Cadastrar Professor"}
                </Button>
            </div>
        </form>
    )
}
