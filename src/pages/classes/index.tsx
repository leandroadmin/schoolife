import { useEffect, useState } from "react"
import { DataTable } from "../students/data-table"
import type { Class } from "@/types"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Plus, ArrowUpDown, MoreHorizontal, Users, Clock, BookOpen, MapPin, Calendar, GraduationCap, User } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { ClassForm } from "./class-form"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import type { ColumnDef } from "@tanstack/react-table"
import { toast } from "sonner"

interface EnrichedClass extends Class {
    teacher_name?: string
    student_count?: number
}

const DAY_MAP: Record<string, string> = {
    Mon: "Seg", Tue: "Ter", Wed: "Qua", Thu: "Qui", Fri: "Sex", Sat: "Sáb", Sun: "Dom"
}

export default function ClassesPage() {
    const [data, setData] = useState<EnrichedClass[]>([])
    const [loading, setLoading] = useState(true)
    const [editingClass, setEditingClass] = useState<EnrichedClass | null>(null)
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [detailClass, setDetailClass] = useState<EnrichedClass | null>(null)

    async function fetchClasses() {
        try {
            const { data: classes, error } = await supabase
                .from('classes')
                .select('*, teachers(full_name)')
                .order('created_at', { ascending: false })

            if (error) {
                console.error('Error fetching classes:', error)
                return
            }

            if (classes) {
                // Count students per class
                const { data: studentCounts } = await supabase
                    .from('students')
                    .select('class_id')

                const countMap: Record<string, number> = {}
                if (studentCounts) {
                    studentCounts.forEach((s: any) => {
                        if (s.class_id) {
                            countMap[s.class_id] = (countMap[s.class_id] || 0) + 1
                        }
                    })
                }

                const enriched: EnrichedClass[] = classes.map((c: any) => ({
                    ...c,
                    teacher_name: c.teachers?.full_name || null,
                    student_count: countMap[c.id] || 0,
                }))
                setData(enriched)
            }
        } catch (error) {
            console.error('Unexpected error:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchClasses()
    }, [])

    const handleClassSaved = () => {
        setIsFormOpen(false)
        setEditingClass(null)
        setDetailClass(null)
        fetchClasses()
    }

    const handleEdit = (cls: EnrichedClass) => {
        setEditingClass(cls)
        setIsFormOpen(true)
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir esta turma?")) return

        try {
            const { error } = await supabase.from('classes').delete().eq('id', id)
            if (error) throw error
            toast.success("Turma excluída com sucesso!")
            fetchClasses()
        } catch (error) {
            console.error("Erro ao excluir:", error)
            toast.error("Erro ao excluir turma.")
        }
    }

    const columnsDefs: ColumnDef<EnrichedClass>[] = [
        {
            accessorKey: "name",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="hover:bg-transparent p-0 font-bold"
                    >
                        Nome da Turma
                        <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const cls = row.original
                return (
                    <div className="flex flex-col">
                        <button
                            onClick={() => setDetailClass(cls)}
                            className="font-bold text-slate-900 dark:text-white leading-tight hover:text-primary transition-colors text-left cursor-pointer"
                        >
                            {cls.name}
                        </button>
                        <span className="text-[10px] text-slate-400 font-mono font-medium">{cls.code}</span>
                    </div>
                )
            }
        },
        {
            accessorKey: "schedule",
            header: "Horário",
            cell: ({ row }) => {
                const cls = row.original
                if (!cls.days || cls.days.length === 0) return <span className="text-xs text-slate-400">—</span>

                return (
                    <div className="flex flex-col gap-1">
                        <div className="flex gap-1">
                            {cls.days.map(d => (
                                <Badge key={d} variant="secondary" className="px-1 py-0 text-[9px] uppercase">{DAY_MAP[d] || d}</Badge>
                            ))}
                        </div>
                        <div className="flex items-center text-[10px] text-slate-500 font-medium">
                            <Clock className="mr-1 h-3 w-3" />
                            {cls.time_start} - {cls.time_end}
                        </div>
                    </div>
                )
            }
        },
        {
            accessorKey: "teacher_name",
            header: "Professor",
            cell: ({ row }) => {
                const name = row.original.teacher_name
                if (!name) return <span className="text-xs text-slate-400">—</span>
                return (
                    <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[10px] font-bold">
                            {name.charAt(0)}
                        </div>
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{name}</span>
                    </div>
                )
            }
        },
        {
            accessorKey: "level",
            header: "Nível",
            cell: ({ row }) => {
                const level = row.getValue("level") as string
                if (!level) return <span className="text-xs text-slate-400">—</span>
                return <Badge variant="outline" className="font-bold text-[10px]">{level}</Badge>
            }
        },
        {
            accessorKey: "period",
            header: "Período",
            cell: ({ row }) => {
                const cls = row.original
                if (!cls.start_date || !cls.end_date) return <span className="text-xs text-slate-400">—</span>
                const start = new Date(cls.start_date + "T00:00:00")
                const end = new Date(cls.end_date + "T00:00:00")
                return (
                    <div className="flex items-center gap-1 text-[10px] font-medium text-slate-500">
                        <Calendar className="mr-1 h-3 w-3" />
                        {start.toLocaleDateString("pt-BR")} - {end.toLocaleDateString("pt-BR")}
                    </div>
                )
            }
        },
        {
            accessorKey: "students",
            header: "Alunos",
            cell: ({ row }) => {
                const cls = row.original
                return (
                    <div className="flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
                        <Users className="h-3 w-3" />
                        <span>{cls.student_count || 0}/{cls.max_students}</span>
                    </div>
                )
            }
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => {
                const status = row.getValue("status") as string
                const variants: Record<string, string> = {
                    active: "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
                    paused: "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
                    finished: "bg-slate-50 text-slate-500 border-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
                    full: "bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20"
                }

                const labels: Record<string, string> = {
                    active: "Ativa",
                    paused: "Pausada",
                    finished: "Finalizada",
                    full: "Lotada"
                }

                return (
                    <Badge variant="outline" className={`rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${variants[status] || variants.finished}`}>
                        {labels[status] || status}
                    </Badge>
                )
            }
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const cls = row.original
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl border-none shadow-2xl">
                            <DropdownMenuLabel className="font-bold text-[10px] uppercase tracking-widest text-slate-400">Ações</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => setDetailClass(cls)} className="rounded-lg text-xs font-medium cursor-pointer">Ver detalhes</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(cls)} className="rounded-lg text-xs font-medium cursor-pointer">Editar</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(cls.id)} className="text-destructive rounded-lg text-xs font-medium cursor-pointer">Excluir</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )
            },
        },
    ]

    if (loading) {
        return <div>Carregando...</div>
    }

    return (
        <div className="space-y-8 animate-in-stagger">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white">Turmas</h1>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Gerencie as turmas, horários e matrículas.</p>
                </div>

                <Dialog open={isFormOpen} onOpenChange={(open) => {
                    setIsFormOpen(open)
                    if (!open) setEditingClass(null)
                }}>
                    <DialogTrigger asChild>
                        <Button onClick={() => { setEditingClass(null); setIsFormOpen(true) }} className="font-bold tracking-widest uppercase text-[11px] shadow-lg shadow-primary/20">
                            <Plus className="mr-2 h-4 w-4 stroke-[3]" /> Nova Turma
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-[32px] border-none shadow-2xl">
                        <DialogHeader className="pb-8 border-b border-slate-100 dark:border-slate-800">
                            <DialogTitle className="text-2xl font-black tracking-tight">
                                {editingClass ? "Editar Turma" : "Criar Nova Turma"}
                            </DialogTitle>
                            <DialogDescription className="text-slate-500 dark:text-slate-400 font-medium">
                                {editingClass
                                    ? "Atualize os dados da turma abaixo."
                                    : "Preencha os dados da turma abaixo. As aulas serão geradas automaticamente."}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-8">
                            <ClassForm onSuccess={handleClassSaved} initialData={editingClass} />
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Class Detail Modal */}
            {detailClass && (
                <ClassDetailModal
                    classData={detailClass}
                    open={!!detailClass}
                    onOpenChange={(open) => { if (!open) setDetailClass(null) }}
                    onEdit={() => {
                        const cls = detailClass
                        setDetailClass(null)
                        handleEdit(cls)
                    }}
                />
            )}

            <Card className="border-none shadow-premium bg-white dark:bg-slate-900 overflow-hidden rounded-[24px]">
                <CardContent className="p-0">
                    <DataTable columns={columnsDefs} data={data} searchKey="name" />
                </CardContent>
            </Card>
        </div>
    )
}

// --- Class Detail Modal ---
interface ClassDetailModalProps {
    classData: EnrichedClass
    open: boolean
    onOpenChange: (open: boolean) => void
    onEdit: () => void
}

function ClassDetailModal({ classData, open, onOpenChange, onEdit }: ClassDetailModalProps) {
    const [students, setStudents] = useState<{ id: string, full_name: string }[]>([])
    const [loadingStudents, setLoadingStudents] = useState(false)

    useEffect(() => {
        if (open && classData.id) {
            const fetchStudents = async () => {
                setLoadingStudents(true)
                try {
                    const { data, error } = await supabase
                        .from('students')
                        .select('id, full_name')
                        .eq('class_id', classData.id)

                    if (error) throw error
                    if (data) setStudents(data)
                } catch (error) {
                    console.error("Erro ao carregar alunos da turma:", error)
                } finally {
                    setLoadingStudents(false)
                }
            }
            fetchStudents()
        }
    }, [open, classData.id])

    const statusLabels: Record<string, string> = {
        active: "Ativa", paused: "Pausada", finished: "Finalizada", full: "Lotada"
    }
    const statusColors: Record<string, string> = {
        active: "bg-emerald-500", paused: "bg-amber-500", finished: "bg-slate-500", full: "bg-rose-500"
    }
    const typeLabels: Record<string, string> = {
        regular: "Regular", intensive: "Intensivo", conversation: "Conversação", private: "Particular"
    }
    const modeLabels: Record<string, string> = {
        "in-person": "Presencial", online: "Online"
    }

    const formatDate = (d?: string | null) => {
        if (!d) return "—"
        const date = new Date(d + "T00:00:00")
        return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl rounded-[28px] border-none shadow-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
                {/* Header with gradient */}
                <div className="relative bg-gradient-to-br from-emerald-500 to-teal-600 p-8 text-white flex-shrink-0">
                    <div className="flex items-start justify-between">
                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                    <BookOpen className="h-7 w-7 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black tracking-tight">{classData.name}</h2>
                                    <p className="text-emerald-100 font-mono text-sm font-bold">{classData.code}</p>
                                </div>
                            </div>
                        </div>
                        <Badge className={`${statusColors[classData.status] || "bg-slate-500"} text-white border-none font-bold text-[10px] uppercase tracking-widest px-3 py-1`}>
                            {statusLabels[classData.status] || classData.status}
                        </Badge>
                    </div>
                    {/* Quick stats */}
                    <div className="flex gap-6 mt-6">
                        <div className="flex items-center gap-2 text-emerald-100">
                            <Users className="h-4 w-4" />
                            <span className="text-sm font-bold">{classData.student_count || 0}/{classData.max_students} alunos</span>
                        </div>
                        <div className="flex items-center gap-2 text-emerald-100">
                            <Clock className="h-4 w-4" />
                            <span className="text-sm font-bold">{classData.duration_minutes} min</span>
                        </div>
                        <div className="flex items-center gap-2 text-emerald-100">
                            <MapPin className="h-4 w-4" />
                            <span className="text-sm font-bold">{(classData.mode && modeLabels[classData.mode]) || classData.mode}</span>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-8 space-y-6 overflow-y-auto flex-1">
                    {/* Alunos section */}
                    <div className="space-y-3">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <Users className="h-3 w-3" /> Alunos Matriculados
                        </h3>
                        {loadingStudents ? (
                            <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
                                <span className="animate-spin text-primary">◌</span> Carregando alunos...
                            </div>
                        ) : students.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {students.map(student => (
                                    <div key={student.id} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                        <div className="h-6 w-6 rounded bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                                            {student.full_name.charAt(0)}
                                        </div>
                                        <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">
                                            {student.full_name}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-slate-400 italic py-2">Nenhum aluno matriculado nesta turma.</p>
                        )}
                    </div>

                    {/* Schedule section */}
                    <div className="space-y-3">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Horário e Dias</h3>
                        <div className="flex items-center gap-4">
                            <div className="flex gap-1.5">
                                {(classData.days || []).map(d => (
                                    <span key={d} className="h-9 w-9 rounded-xl bg-primary/10 text-primary text-[11px] font-black flex items-center justify-center">
                                        {DAY_MAP[d] || d}
                                    </span>
                                ))}
                            </div>
                            <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                {classData.time_start} — {classData.time_end}
                            </div>
                        </div>
                    </div>

                    {/* Info grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tipo</p>
                            <p className="text-sm font-bold text-slate-800 dark:text-white">{(classData.type && typeLabels[classData.type]) || classData.type}</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Nível</p>
                            <p className="text-sm font-bold text-slate-800 dark:text-white">{classData.level || "—"}</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1"><User className="h-3 w-3" /> Professor</p>
                            <p className="text-sm font-bold text-slate-800 dark:text-white">{classData.teacher_name || "Não atribuído"}</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1"><GraduationCap className="h-3 w-3" /> Capacidade</p>
                            <p className="text-sm font-bold text-slate-800 dark:text-white">{classData.student_count || 0} de {classData.max_students} vagas</p>
                        </div>
                    </div>

                    {/* Dates */}
                    <div className="space-y-3">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Vigência</h3>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                                <Calendar className="h-4 w-4 text-primary" />
                                {formatDate(classData.start_date)} → {formatDate(classData.end_date)}
                            </div>
                        </div>
                    </div>

                    {classData.description && (
                        <div className="space-y-2">
                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Descrição</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400">{classData.description}</p>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 flex-shrink-0">
                        <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl font-bold text-xs">
                            Fechar
                        </Button>
                        <Button onClick={onEdit} className="rounded-xl font-bold text-xs shadow-lg shadow-primary/20">
                            Editar Turma
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

