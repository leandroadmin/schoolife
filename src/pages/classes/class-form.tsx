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
import { supabase } from "@/lib/supabase"
import { useState, useEffect } from "react"
import {
    Loader2,
    Calendar as CalendarIcon,
    Users,
    Clock,
    BookOpen,
    CheckCircle2
} from "lucide-react"
import { toast } from "sonner"
import type { Class, Teacher, CourseLevel } from "@/types"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { format, eachDayOfInterval, parseISO, getDay } from "date-fns"
const classSchema = z.object({
    name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
    code: z.string().min(2, "Código obrigatório"),
    level: z.string().min(1, "Nível obrigatório"),
    type: z.enum(["regular", "intensive", "conversation", "private"]),
    status: z.enum(["active", "paused", "finished", "full"]),
    teacher_id: z.string().optional(),
    days: z.array(z.string()).min(1, "Selecione pelo menos um dia"),
    time_start: z.string().min(1, "Horário de início obrigatório"),
    duration_minutes: z.string().min(1, "Duração obrigatória"),
    mode: z.enum(["in-person", "online"]),
    start_date: z.string().min(1, "Data de início obrigatória"),
    end_date: z.string().min(1, "Data de término obrigatória"),
    max_students: z.string().min(1, "Capacidade obrigatória"),
    description: z.string().optional(),
})

type ClassFormValues = z.infer<typeof classSchema>

interface ClassFormProps {
    onSuccess: () => void
    initialData?: Class | null
}

const WEEKDAYS = [
    { value: "Mon", label: "Seg" },
    { value: "Tue", label: "Ter" },
    { value: "Wed", label: "Qua" },
    { value: "Thu", label: "Qui" },
    { value: "Fri", label: "Sex" },
    { value: "Sat", label: "Sáb" },
    { value: "Sun", label: "Dom" },
]

export function ClassForm({ onSuccess, initialData }: ClassFormProps) {
    const [loading, setLoading] = useState(false)
    const [teachers, setTeachers] = useState<Teacher[]>([])
    const [levels, setLevels] = useState<CourseLevel[]>([])

    const form = useForm<ClassFormValues>({
        resolver: zodResolver(classSchema),
        defaultValues: {
            name: "",
            code: "",
            level: "",
            type: "regular",
            status: "active",
            teacher_id: "",
            days: [],
            time_start: "19:00",
            duration_minutes: "60",
            mode: "in-person",
            start_date: "",
            end_date: "",
            max_students: "15",
            description: "",
        },
    })

    // Reset form when initialData changes (edit mode)
    useEffect(() => {
        if (initialData) {
            form.reset({
                name: initialData.name || "",
                code: initialData.code || "",
                level: initialData.level || "",
                type: initialData.type || "regular",
                status: initialData.status || "active",
                teacher_id: initialData.teacher_id || "",
                days: initialData.days || [],
                time_start: initialData.time_start || "19:00",
                duration_minutes: initialData.duration_minutes ? String(initialData.duration_minutes) : "60",
                mode: initialData.mode || "in-person",
                start_date: initialData.start_date || "",
                end_date: initialData.end_date || "",
                max_students: initialData.max_students?.toString() || "15",
                description: (initialData as any)?.description || "",
            })
        } else {
            form.reset({
                name: "",
                code: "",
                level: "",
                type: "regular",
                status: "active",
                teacher_id: "",
                days: [],
                time_start: "19:00",
                duration_minutes: "60",
                mode: "in-person",
                start_date: "",
                end_date: "",
                max_students: "15",
                description: "",
            })
        }
    }, [initialData, form])

    useEffect(() => {
        async function loadData() {
            try {
                const [{ data: teachersList }, { data: levelsList }] = await Promise.all([
                    supabase.from('teachers').select('id, full_name'),
                    supabase.from('course_levels').select('id, name') // Assuming this table/column exists
                ])
                if (teachersList) setTeachers(teachersList as any)
                if (levelsList) setLevels(levelsList as any)
            } catch (err) {
                console.error("Erro ao carregar dados:", err)
            }
        }
        loadData()
    }, [])

    async function onSubmit(data: ClassFormValues) {
        setLoading(true)
        try {
            const payload = {
                name: data.name,
                code: data.code,
                level: data.level,
                type: data.type,
                status: data.status,
                teacher_id: data.teacher_id || null,
                days: data.days,
                time_start: data.time_start,
                time_end: calculateEndTime(data.time_start, parseInt(data.duration_minutes)),
                duration_minutes: parseInt(data.duration_minutes),
                mode: data.mode,
                start_date: data.start_date,
                end_date: data.end_date,
                max_students: parseInt(data.max_students),
                description: data.description || null
            }

            let classId = initialData?.id

            if (initialData?.id) {
                const { error } = await supabase
                    .from("classes")
                    .update(payload)
                    .eq("id", initialData.id)
                if (error) throw error
            } else {
                const { data: newClass, error } = await supabase
                    .from("classes")
                    .insert([payload])
                    .select()
                    .single()
                if (error) throw error
                classId = newClass.id
            }

            // Generate Lessons if date range is provided
            if (classId && data.start_date && data.end_date && data.days.length > 0) {
                await generateLessons(classId, data.start_date, data.end_date, data.days, data.time_start)
            }

            toast.success(initialData?.id ? "Turma atualizada!" : "Turma criada com sucesso!")
            onSuccess()
        } catch (error: any) {
            console.error(error)
            toast.error("Erro ao salvar", {
                description: error.message
            })
        } finally {
            setLoading(false)
        }
    }

    const calculateEndTime = (start: string, duration: number) => {
        const [hours, minutes] = start.split(':').map(Number)
        const date = new Date()
        date.setHours(hours, minutes + duration)
        return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    }

    const generateLessons = async (classId: string, start: string, end: string, days: string[], time: string) => {
        try {
            const startDate = parseISO(start)
            const endDate = parseISO(end)

            const dayMap: Record<string, number> = {
                'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
            }
            const selectedDays = days.map(d => dayMap[d])

            const allDays = eachDayOfInterval({ start: startDate, end: endDate })
            const lessonDates = allDays.filter(d => selectedDays.includes(getDay(d)))

            if (lessonDates.length === 0) return

            const lessonsPayload = lessonDates.map(date => ({
                class_id: classId,
                date: format(date, 'yyyy-MM-dd'),
                status: 'scheduled',
                description: `Aula regular`
            }))

            const duration = parseInt(form.getValues('duration_minutes')) || 60

            const eventsPayload = lessonDates.map(date => {
                const [hours, minutes] = time.split(':').map(Number)
                const startTime = new Date(date)
                startTime.setHours(hours, minutes, 0, 0)

                const endTime = new Date(date)
                endTime.setHours(hours, minutes + duration, 0, 0)

                return {
                    title: `Aula: ${form.getValues('name') || "Nova Turma"}`,
                    description: `Aula regular da turma`,
                    start_time: startTime.toISOString(),
                    end_time: endTime.toISOString(),
                    class_id: classId,
                    event_type: 'class',
                    color: '#10b981'
                }
            })

            await supabase.from('class_lessons').insert(lessonsPayload)
            await supabase.from('calendar_events').insert(eventsPayload)

        } catch (error) {
            console.error("Error generating lessons:", error)
        }
    }

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 pb-4">
            {/* 1. Identificação */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-primary">
                    <BookOpen className="h-5 w-5 stroke-[2.5]" />
                    <h3 className="font-black uppercase tracking-widest text-xs">Identificação da Turma</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Nome da Turma *</Label>
                        <Input placeholder="Ex: Inglês A2 - Noite" {...form.register("name")} className="rounded-xl h-11 bg-slate-50 border-none shadow-inner" />
                        {form.formState.errors.name && <p className="text-[10px] text-destructive font-bold">{form.formState.errors.name.message}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Código (ID) *</Label>
                        <Input placeholder="Ex: A2N-2026-01" {...form.register("code")} className="rounded-xl h-11 bg-slate-50 border-none shadow-inner uppercase font-mono" />
                        {form.formState.errors.code && <p className="text-[10px] text-destructive font-bold">{form.formState.errors.code.message}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Nível</Label>
                        <Select onValueChange={(v) => form.setValue("level", v)} value={form.watch("level")}>
                            <SelectTrigger className="rounded-xl h-11 bg-slate-50 border-none shadow-inner">
                                <SelectValue placeholder="Selecione o Nível" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-none shadow-2xl">
                                {levels.length > 0 ? (
                                    levels.map(l => <SelectItem key={l.id} value={l.name}>{l.name}</SelectItem>)
                                ) : (
                                    <SelectItem value="padrão">Nível Padrão</SelectItem>
                                )}
                                {/* Fallback para não ficar em branco caso o nível antigo tenha sido apagado */}
                                {initialData?.level && !levels.find(l => l.name === initialData.level) && (
                                    <SelectItem value={initialData.level}>{initialData.level}</SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                        {form.formState.errors.level && <p className="text-[10px] text-destructive font-bold">{form.formState.errors.level.message}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Tipo</Label>
                        <Select onValueChange={(v: any) => form.setValue("type", v)} value={form.watch("type")}>
                            <SelectTrigger className="rounded-xl h-11 bg-slate-50 border-none shadow-inner">
                                <SelectValue placeholder="Tipo" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-none shadow-2xl">
                                <SelectItem value="regular">Regular</SelectItem>
                                <SelectItem value="intensive">Intensivo</SelectItem>
                                <SelectItem value="conversation">Conversação</SelectItem>
                                <SelectItem value="private">Particular</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* 2. Horários e Dias */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-primary">
                    <Clock className="h-5 w-5 stroke-[2.5]" />
                    <h3 className="font-black uppercase tracking-widest text-xs">Horários e Dias</h3>
                </div>

                <div className="space-y-3">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Dias da Semana</Label>
                    <ToggleGroup type="multiple" value={form.watch("days")} onValueChange={(v) => form.setValue("days", v)} className="justify-start gap-2">
                        {WEEKDAYS.map((day) => (
                            <ToggleGroupItem key={day.value} value={day.value} className="h-10 w-10 p-0 rounded-xl data-[state=on]:bg-primary data-[state=on]:text-white shadow-sm border border-slate-100">
                                {day.label}
                            </ToggleGroupItem>
                        ))}
                    </ToggleGroup>
                    {form.formState.errors.days && <p className="text-[10px] text-destructive font-bold">{form.formState.errors.days.message}</p>}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Início</Label>
                        <Input type="time" {...form.register("time_start")} className="rounded-xl h-11 bg-slate-50 border-none shadow-inner" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Duração (min)</Label>
                        <Select onValueChange={(v) => form.setValue("duration_minutes", v)} value={form.watch("duration_minutes")}>
                            <SelectTrigger className="rounded-xl h-11 bg-slate-50 border-none shadow-inner">
                                <SelectValue placeholder="Duração" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-none shadow-2xl">
                                <SelectItem value="30">30 min</SelectItem>
                                <SelectItem value="45">45 min</SelectItem>
                                <SelectItem value="60">60 min</SelectItem>
                                <SelectItem value="90">90 min</SelectItem>
                                <SelectItem value="120">120 min</SelectItem>
                                {/* Fallback se tiver outro valor salvo no BD */}
                                {initialData?.duration_minutes && !["30", "45", "60", "90", "120"].includes(String(initialData.duration_minutes)) && (
                                    <SelectItem value={String(initialData.duration_minutes)}>{initialData.duration_minutes} min</SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Modalidade</Label>
                        <Select onValueChange={(v: any) => form.setValue("mode", v)} value={form.watch("mode")}>
                            <SelectTrigger className="rounded-xl h-11 bg-slate-50 border-none shadow-inner">
                                <SelectValue placeholder="Modalidade" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-none shadow-2xl">
                                <SelectItem value="in-person">Presencial</SelectItem>
                                <SelectItem value="online">Online</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* 3. Datas e Vigência */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-primary">
                    <CalendarIcon className="h-5 w-5 stroke-[2.5]" />
                    <h3 className="font-black uppercase tracking-widest text-xs">Datas e Vigência</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Data Início</Label>
                        <Input type="date" {...form.register("start_date")} className="rounded-xl h-11 bg-slate-50 border-none shadow-inner" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Data Término</Label>
                        <Input type="date" {...form.register("end_date")} className="rounded-xl h-11 bg-slate-50 border-none shadow-inner" />
                    </div>
                </div>
                <div className="flex items-center gap-2 bg-blue-50 text-blue-700 p-3 rounded-xl text-xs font-medium dark:bg-blue-900/20 dark:text-blue-300">
                    <CheckCircle2 className="h-4 w-4" />
                    O calendário de aulas será gerado automaticamente com base nessas datas.
                </div>
            </div>

            {/* 4. Capacidade e Responsável */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-primary">
                    <Users className="h-5 w-5 stroke-[2.5]" />
                    <h3 className="font-black uppercase tracking-widest text-xs">Capacidade e Responsável</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Capacidade Máxima</Label>
                        <Input type="number" {...form.register("max_students")} className="rounded-xl h-11 bg-slate-50 border-none shadow-inner" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Professor Responsável</Label>
                        <Select onValueChange={(v) => form.setValue("teacher_id", v)} value={form.watch("teacher_id")}>
                            <SelectTrigger className="rounded-xl h-11 bg-slate-50 border-none shadow-inner">
                                <SelectValue placeholder="Selecione o Professor" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-none shadow-2xl">
                                {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}
                                {/* Fallback caso o professor não conste mais ou esteja carregando */}
                                {initialData?.teacher_id && !teachers.find(t => t.id === initialData.teacher_id) && (
                                    <SelectItem value={initialData.teacher_id}>Professor (ID mantido)</SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Status da Turma</Label>
                    <Select onValueChange={(v: any) => form.setValue("status", v)} value={form.watch("status")}>
                        <SelectTrigger className="rounded-xl h-11 bg-slate-50 border-none shadow-inner">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-none shadow-2xl">
                            <SelectItem value="active">Ativa</SelectItem>
                            <SelectItem value="paused">Pausada</SelectItem>
                            <SelectItem value="finished">Finalizada</SelectItem>
                            <SelectItem value="full">Lotada</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>


            <div className="flex justify-end pt-4">
                <Button type="submit" disabled={loading} className="h-14 px-12 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/30 active:scale-95 transition-all">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
                    {initialData ? "Salvar Alterações" : "Criar Turma"}
                </Button>
            </div>
        </form>
    )
}
