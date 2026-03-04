import { useEffect, useState } from "react"
import { DataTable } from "../students/data-table"
import type { Teacher } from "@/types"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Plus, ArrowUpDown, MoreHorizontal } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { TeacherForm } from "./teacher-form"
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

export default function TeachersPage() {
    const [data, setData] = useState<Teacher[]>([])
    const [loading, setLoading] = useState(true)
    const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null)
    const [isSheetOpen, setIsSheetOpen] = useState(false)

    async function fetchTeachers() {
        try {
            const { data: teachers, error } = await supabase
                .from('teachers')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) {
                console.error('Error fetching teachers:', error)
                return
            }

            if (teachers) {
                setData(teachers)
            }
        } catch (error) {
            console.error('Unexpected error:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchTeachers()
    }, [])

    const handleTeacherSaved = () => {
        setIsSheetOpen(false)
        setEditingTeacher(null)
        fetchTeachers()
    }

    const handleEdit = (teacher: Teacher) => {
        setEditingTeacher(teacher)
        setIsSheetOpen(true)
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir este professor?")) return

        try {
            const { error } = await supabase.from('teachers').delete().eq('id', id)
            if (error) throw error
            toast.success("Professor excluído com sucesso!")
            fetchTeachers()
        } catch (error) {
            console.error("Erro ao excluir:", error)
            toast.error("Erro ao excluir professor.")
        }
    }

    const columnsDefs: ColumnDef<Teacher>[] = [
        {
            accessorKey: "full_name",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="hover:bg-transparent p-0 font-bold"
                    >
                        Professor
                        <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const teacher = row.original
                return (
                    <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                            <AvatarImage src={teacher.avatar_url || ""} />
                            <AvatarFallback className="bg-slate-50 text-[10px] font-black text-slate-400">
                                {teacher.full_name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                            <span className="font-bold text-slate-900 dark:text-white leading-tight">{teacher.full_name}</span>
                            <span className="text-[10px] text-slate-400 font-medium">{teacher.email || "Sem e-mail"}</span>
                        </div>
                    </div>
                )
            }
        },
        {
            accessorKey: "specialties",
            header: "Especialidades",
            cell: ({ row }) => {
                const specialties = row.getValue("specialties") as string[]
                return (
                    <div className="flex flex-wrap gap-1">
                        {specialties?.slice(0, 2).map((s, i) => (
                            <Badge key={i} variant="secondary" className="px-1.5 py-0 text-[9px] font-medium">{s}</Badge>
                        ))}
                        {specialties?.length > 2 && <span className="text-[9px] text-slate-400">+{specialties.length - 2}</span>}
                        {(!specialties || specialties.length === 0) && <span className="text-xs text-slate-400">—</span>}
                    </div>
                )
            }
        },
        {
            accessorKey: "hourly_rate",
            header: "Valor Hora",
            cell: ({ row }) => {
                const rate = row.getValue("hourly_rate") as number
                if (!rate) return <span className="text-xs text-slate-400">—</span>
                const formatted = new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                }).format(rate)
                return <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{formatted}</span>
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
                const teacher = row.original
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
                                onClick={() => navigator.clipboard.writeText(teacher.id)}
                                className="rounded-lg text-xs font-medium cursor-pointer"
                            >
                                Copiar ID
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(teacher)} className="rounded-lg text-xs font-medium cursor-pointer">Editar</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(teacher.id)} className="text-destructive rounded-lg text-xs font-medium cursor-pointer">Excluir</DropdownMenuItem>
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
                    <h1 className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white">Professores</h1>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Gerencie o corpo docente e suas especialidades.</p>
                </div>

                <Dialog open={isSheetOpen} onOpenChange={(open) => {
                    setIsSheetOpen(open)
                    if (!open) setEditingTeacher(null)
                }}>
                    <DialogTrigger asChild>
                        <Button onClick={() => setEditingTeacher(null)} className="font-bold tracking-widest uppercase text-[11px] shadow-lg shadow-primary/20">
                            <Plus className="mr-2 h-4 w-4 stroke-[3]" /> Novo Professor
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-[32px] border-none shadow-2xl">
                        <DialogHeader className="pb-8 border-b border-slate-100 dark:border-slate-800">
                            <DialogTitle className="text-2xl font-black tracking-tight">{editingTeacher ? 'Editar Professor' : 'Cadastrar Novo Professor'}</DialogTitle>
                            <DialogDescription className="text-slate-500 dark:text-slate-400 font-medium">
                                {editingTeacher ? 'Atualize os dados do professor abaixo.' : 'Preencha os dados do professor abaixo. Os campos com * são obrigatórios.'}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-8">
                            <TeacherForm onSuccess={handleTeacherSaved} initialData={editingTeacher} />
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="border-none shadow-premium bg-white dark:bg-slate-900 overflow-hidden rounded-[24px]">
                <CardContent className="p-0">
                    <DataTable columns={columnsDefs} data={data} searchKey="full_name" />
                </CardContent>
            </Card>
        </div>
    )
}
