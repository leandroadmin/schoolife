import { useEffect, useState } from "react"
import { DataTable } from "./data-table"
import type { Student } from "@/types"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, ArrowUpDown, MoreHorizontal, Phone, Eye } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { StudentForm } from "./student-form"
import { StudentProfile } from "./student-profile"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import type { ColumnDef } from "@tanstack/react-table"
import { toast } from "sonner"

interface EnrichedStudent extends Student {
    class_name?: string
    level_name?: string
    teacher_name?: string
}

export default function StudentsPage() {
    const [data, setData] = useState<EnrichedStudent[]>([])
    const [loading, setLoading] = useState(true)
    const [editingStudent, setEditingStudent] = useState<Student | null>(null)
    const [isSheetOpen, setIsSheetOpen] = useState(false)
    const [viewingStudent, setViewingStudent] = useState<EnrichedStudent | null>(null)
    const [isProfileOpen, setIsProfileOpen] = useState(false)

    async function fetchStudents() {
        try {
            // Fetch students with related data
            const { data: students, error } = await supabase
                .from('students')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) {
                console.error('Error fetching students:', error)
                return
            }

            if (!students) return

            // Fetch lookup tables in parallel
            const [
                { data: classesList },
                { data: levelsList },
                { data: teachersList }
            ] = await Promise.all([
                supabase.from('classes').select('id, name'),
                supabase.from('course_levels').select('id, name'),
                supabase.from('teachers').select('id, full_name'),
            ])

            const classesMap = new Map((classesList || []).map(c => [c.id, c.name]))
            const levelsMap = new Map((levelsList || []).map(l => [l.id, l.name]))
            const teachersMap = new Map((teachersList || []).map(t => [t.id, t.full_name]))

            const enriched: EnrichedStudent[] = students.map(s => ({
                ...s,
                class_name: s.class_id ? classesMap.get(s.class_id) || undefined : undefined,
                level_name: s.level_id ? levelsMap.get(s.level_id) || undefined : undefined,
                teacher_name: s.teacher_id ? teachersMap.get(s.teacher_id) || undefined : undefined,
            }))

            setData(enriched)
        } catch (error) {
            console.error('Unexpected error:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchStudents()
    }, [])

    const handleStudentCreated = () => {
        setIsSheetOpen(false)
        setEditingStudent(null)
        fetchStudents()
    }

    const handleEdit = (student: Student) => {
        setEditingStudent(student)
        setIsSheetOpen(true)
    }

    const handleViewProfile = (student: EnrichedStudent) => {
        setViewingStudent(student)
        setIsProfileOpen(true)
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir este aluno?")) return

        try {
            const { error } = await supabase.from('students').delete().eq('id', id)
            if (error) throw error
            toast.success("Aluno excluído com sucesso!")
            fetchStudents()
        } catch (error) {
            console.error("Erro ao excluir:", error)
            toast.error("Erro ao excluir aluno.")
        }
    }

    const formatWhatsAppLink = (phone: string) => {
        const digits = phone.replace(/\D/g, "")
        return `https://wa.me/55${digits}`
    }

    const columnsDefs: ColumnDef<EnrichedStudent>[] = [
        {
            accessorKey: "full_name",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="hover:bg-transparent p-0 font-bold"
                    >
                        Aluno
                        <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const student = row.original
                return (
                    <button
                        onClick={() => handleViewProfile(student)}
                        className="flex items-center gap-3 hover:opacity-80 transition-opacity text-left group cursor-pointer"
                    >
                        <Avatar className="h-9 w-9 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                            <AvatarImage src={student.avatar_url || ""} />
                            <AvatarFallback className="bg-slate-50 text-[10px] font-black text-slate-400">
                                {student.full_name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                            <span className="font-bold text-slate-900 dark:text-white leading-tight group-hover:text-primary transition-colors">{student.full_name}</span>
                            <span className="text-[10px] text-slate-400 font-medium">{student.email || "Sem e-mail"}</span>
                        </div>
                    </button>
                )
            }
        },
        {
            accessorKey: "phone",
            header: "Contato",
            cell: ({ row }) => {
                const phone = row.getValue("phone") as string
                if (!phone) return <span className="text-xs text-slate-400">—</span>
                return (
                    <a
                        href={formatWhatsAppLink(phone)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 transition-colors"
                    >
                        <Phone className="h-3.5 w-3.5" />
                        {phone}
                    </a>
                )
            }
        },
        {
            accessorKey: "class_name",
            header: "Turma",
            cell: ({ row }) => {
                const name = row.original.class_name
                if (!name) return <span className="text-xs text-slate-400">—</span>
                return <Badge variant="secondary" className="rounded-lg px-2 py-0.5 text-[10px] font-bold">{name}</Badge>
            }
        },
        {
            accessorKey: "level_name",
            header: "Nível",
            cell: ({ row }) => {
                const name = row.original.level_name
                if (!name) return <span className="text-xs text-slate-400">—</span>
                return <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{name}</span>
            }
        },
        {
            accessorKey: "teacher_name",
            header: "Professor",
            cell: ({ row }) => {
                const name = row.original.teacher_name
                if (!name) return <span className="text-xs text-slate-400">—</span>
                return <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{name}</span>
            }
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => {
                const status = row.getValue("status") as string
                const variants: Record<string, string> = {
                    active: "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
                    inactive: "bg-slate-50 text-slate-500 border-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
                    suspended: "bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20"
                }
                return (
                    <Badge variant="outline" className={`rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${variants[status] || variants.inactive}`}>
                        {status === 'active' ? 'Ativo' : status === 'inactive' ? 'Inativo' : 'Suspenso'}
                    </Badge>
                )
            }
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const student = row.original
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
                            <DropdownMenuItem
                                onClick={() => handleViewProfile(student)}
                                className="rounded-lg text-xs font-medium cursor-pointer"
                            >
                                <Eye className="mr-2 h-3.5 w-3.5" />
                                Ver detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(student)} className="rounded-lg text-xs font-medium cursor-pointer">Editar</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(student.id)} className="text-destructive rounded-lg text-xs font-medium cursor-pointer">Excluir</DropdownMenuItem>
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
                    <h1 className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white">Alunos</h1>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Gerencie a base de alunos e suas matrículas ativas.</p>
                </div>

                <Dialog open={isSheetOpen} onOpenChange={(open) => {
                    setIsSheetOpen(open)
                    if (!open) setEditingStudent(null)
                }}>
                    <DialogTrigger asChild>
                        <Button onClick={() => setEditingStudent(null)} className="font-bold tracking-widest uppercase text-[11px] shadow-lg shadow-primary/20">
                            <Plus className="mr-2 h-4 w-4 stroke-[3]" /> Novo Aluno
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-[32px] border-none shadow-2xl">
                        <DialogHeader className="pb-8 border-b border-slate-100 dark:border-slate-800">
                            <DialogTitle className="text-2xl font-black tracking-tight">{editingStudent ? 'Editar Aluno' : 'Adicionar Novo Aluno'}</DialogTitle>
                            <DialogDescription className="text-slate-500 dark:text-slate-400 font-medium">
                                {editingStudent ? 'Atualize os dados do aluno abaixo.' : 'Preencha os dados do aluno abaixo. Os campos com * são obrigatórios.'}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-8">
                            <StudentForm onSuccess={handleStudentCreated} initialData={editingStudent} />
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="border-none shadow-premium bg-white dark:bg-slate-900 overflow-hidden rounded-[24px]">
                <CardContent className="p-0">
                    <DataTable columns={columnsDefs} data={data} searchKey="full_name" />
                </CardContent>
            </Card>

            {/* Student Profile Modal */}
            <StudentProfile
                student={viewingStudent}
                open={isProfileOpen}
                onOpenChange={setIsProfileOpen}
                className={viewingStudent?.class_name}
                levelName={viewingStudent?.level_name}
                teacherName={viewingStudent?.teacher_name}
            />
        </div>
    )
}
