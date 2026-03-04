import type { ColumnDef } from "@tanstack/react-table"
import type { Transaction } from "@/types"
import { Button } from "@/components/ui/button"
import { ArrowUpDown, MoreHorizontal } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export const columns: ColumnDef<Transaction>[] = [
    {
        accessorKey: "description",
        header: "Descrição",
    },
    {
        accessorKey: "category",
        header: "Categoria",
    },
    {
        accessorKey: "type",
        header: "Tipo",
        cell: ({ row }) => {
            const type = row.getValue("type") as string
            return (
                <span className={type === 'income' ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>
                    {type === 'income' ? 'Entrada' : 'Saída'}
                </span>
            )
        }
    },
    {
        accessorKey: "amount",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Valor
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            )
        },
        cell: ({ row }) => {
            const amount = parseFloat(row.getValue("amount"))
            const formatted = new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
            }).format(amount)

            return <div className="font-medium">{formatted}</div>
        },
    },
    {
        accessorKey: "date",
        header: "Data",
        cell: ({ row }) => {
            const date = new Date(row.getValue("date"))
            return date.toLocaleDateString("pt-BR")
        }
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
            const status = row.getValue("status") as string
            let colorClass = ""

            switch (status) {
                case 'paid': colorClass = "bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs"; break;
                case 'pending': colorClass = "bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs"; break;
                case 'overdue': colorClass = "bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs"; break;
                default: colorClass = "bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs";
            }

            const label = status === 'paid' ? 'Pago' : status === 'pending' ? 'Pendente' : 'Vencido'

            return (
                <span className={colorClass}>
                    {label}
                </span>
            )
        }
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const transaction = row.original

            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                        <DropdownMenuItem
                            onClick={() => navigator.clipboard.writeText(transaction.id)}
                        >
                            Copiar ID
                        </DropdownMenuItem>
                        <DropdownMenuItem>Editar</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">Excluir</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )
        },
    },
]
