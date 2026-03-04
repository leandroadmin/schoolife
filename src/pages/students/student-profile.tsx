import type { Student } from "@/types"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    User,
    Mail,
    Phone,
    MapPin,
    Calendar,
    GraduationCap,
    BookOpen,
    ShieldCheck,
    IdCard,
} from "lucide-react"

interface StudentProfileProps {
    student: Student | null
    open: boolean
    onOpenChange: (open: boolean) => void
    className?: string
    levelName?: string
    teacherName?: string
}

export function StudentProfile({ student, open, onOpenChange, className, levelName, teacherName }: StudentProfileProps) {
    if (!student) return null

    const whatsappLink = student.phone
        ? `https://wa.me/55${student.phone.replace(/\D/g, "")}`
        : null

    const statusLabel: Record<string, string> = {
        active: "Ativo",
        inactive: "Inativo",
        suspended: "Suspenso",
    }

    const statusStyle: Record<string, string> = {
        active: "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
        inactive: "bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
        suspended: "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20",
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg rounded-[32px] border-none shadow-2xl p-0 overflow-hidden">
                {/* Header with gradient + avatar */}
                <div className="relative bg-gradient-to-br from-primary/90 via-primary to-primary/80 px-8 pt-10 pb-16">
                    <DialogHeader>
                        <DialogTitle className="text-white/80 text-xs font-bold uppercase tracking-widest">Perfil do Aluno</DialogTitle>
                    </DialogHeader>
                    <div className="absolute -bottom-12 left-8">
                        <Avatar className="h-24 w-24 rounded-3xl border-4 border-white dark:border-slate-900 shadow-xl">
                            <AvatarImage src={student.avatar_url || ""} />
                            <AvatarFallback className="bg-white text-primary text-xl font-black">
                                {student.full_name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                    </div>
                </div>

                {/* Body */}
                <div className="px-8 pt-16 pb-8 space-y-6">
                    {/* Name & Status */}
                    <div className="flex items-start justify-between">
                        <div>
                            <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">{student.full_name}</h2>
                            <p className="text-xs text-slate-400 font-medium mt-0.5">@{student.username || "sem-usuario"}</p>
                        </div>
                        <Badge variant="outline" className={`rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border ${statusStyle[student.status] || statusStyle.inactive}`}>
                            {statusLabel[student.status] || student.status}
                        </Badge>
                    </div>

                    {/* Contact */}
                    <div className="space-y-3">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5" /> Contato
                        </h3>
                        <div className="grid grid-cols-1 gap-2">
                            {student.email && (
                                <a href={`mailto:${student.email}`} className="flex items-center gap-2.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-primary transition-colors">
                                    <Mail className="h-4 w-4 text-slate-400" />
                                    {student.email}
                                </a>
                            )}
                            {student.phone && (
                                <a href={whatsappLink || "#"} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 transition-colors">
                                    <Phone className="h-4 w-4" />
                                    {student.phone}
                                    <Badge className="text-[8px] px-1.5 py-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border-none">WhatsApp</Badge>
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Academic */}
                    <div className="space-y-3">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                            <GraduationCap className="h-3.5 w-3.5" /> Acadêmico
                        </h3>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3 text-center">
                                <BookOpen className="h-4 w-4 text-primary mx-auto mb-1" />
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Turma</p>
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-0.5">{className || "—"}</p>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3 text-center">
                                <GraduationCap className="h-4 w-4 text-primary mx-auto mb-1" />
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Nível</p>
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-0.5">{levelName || "—"}</p>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3 text-center">
                                <User className="h-4 w-4 text-primary mx-auto mb-1" />
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Professor</p>
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-0.5">{teacherName || "—"}</p>
                            </div>
                        </div>
                    </div>

                    {/* Personal */}
                    <div className="space-y-3">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                            <IdCard className="h-3.5 w-3.5" /> Dados Pessoais
                        </h3>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                            {student.cpf && (
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-400">CPF:</span>
                                    <span className="font-medium text-slate-700 dark:text-slate-300">{student.cpf}</span>
                                </div>
                            )}
                            {student.rg && (
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-400">RG:</span>
                                    <span className="font-medium text-slate-700 dark:text-slate-300">{student.rg} {student.rg_uf && `(${student.rg_uf})`}</span>
                                </div>
                            )}
                            {student.birth_date && (
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                    <span className="font-medium text-slate-700 dark:text-slate-300">
                                        {new Date(student.birth_date + "T00:00:00").toLocaleDateString("pt-BR")}
                                        {student.age && ` (${student.age} anos)`}
                                    </span>
                                </div>
                            )}
                            {student.address && (
                                <div className="flex items-center gap-2 col-span-2">
                                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                    <span className="font-medium text-slate-700 dark:text-slate-300">{student.address}{student.city && `, ${student.city}`}{student.state && ` - ${student.state}`}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Login info */}
                    <div className="space-y-3">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                            <ShieldCheck className="h-3.5 w-3.5" /> Acesso
                        </h3>
                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl px-4 py-3 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">Login</p>
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{student.username || "—"}</p>
                            </div>
                            <Badge variant="outline" className="text-[9px] rounded-lg border-primary/20 text-primary">Portal do Aluno</Badge>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
