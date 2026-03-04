import type { ColumnDef } from "@tanstack/react-table"
import type { Student } from "@/types"
import { Button } from "@/components/ui/button"
import { ArrowUpDown, MoreHorizontal } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

export const columns: ColumnDef<Student>[] = [
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
                <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                        <AvatarImage src={student.avatar_url || ""} />
                        <AvatarFallback className="bg-slate-50 text-[10px] font-black text-slate-400">
                            {student.full_name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                        <span className="font-bold text-slate-900 dark:text-white leading-tight">{student.full_name}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{student.email || "Sem e-mail"}</span>
                    </div>
                </div>
            )
        }
    },
    {
        accessorKey: "phone",
        header: "Contato",
        cell: ({ row }) => <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{row.getValue("phone") || "—"}</span>
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
                            onClick={() => navigator.clipboard.writeText(student.id)}
                            className="rounded-lg text-xs font-medium"
                        >
                            Copiar ID
                        </DropdownMenuItem>
                        <DropdownMenuItem className="rounded-lg text-xs font-medium">Ver detalhes</DropdownMenuItem>
                        <DropdownMenuItem className="rounded-lg text-xs font-medium">Editar</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive rounded-lg text-xs font-medium">Excluir</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )
        },
    },
]
