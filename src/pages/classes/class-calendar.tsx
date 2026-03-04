import type { Class, ClassLesson } from "@/types"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Calendar as CalendarIcon, Clock, AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"

interface ClassCalendarProps {
    classData: Class
}

export function ClassCalendar({ classData }: ClassCalendarProps) {
    const [lessons, setLessons] = useState<ClassLesson[]>([])

    async function fetchLessons() {
        // Placeholder for when we have the lessons table populated
        // For now, we simulate or fetch empty
        setLessons([])
    }

    useEffect(() => {
        fetchLessons()
    }, [classData.id])

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold">Calendário de Aulas</h3>
                </div>
                <Button variant="outline" size="sm" className="font-bold uppercase text-[10px] tracking-widest">
                    <CalendarIcon className="mr-2 h-4 w-4" /> Gerar Calendário
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-2 border-none shadow-sm bg-white dark:bg-slate-800">
                    <CardHeader>
                        <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-500">Próximas Aulas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {lessons.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-center">
                                <CalendarIcon className="h-12 w-12 mb-4 opacity-20" />
                                <p className="font-medium">Nenhuma aula agendada.</p>
                                <p className="text-xs mt-2 max-w-[250px]">O calendário é gerado automaticamente com base nos dias e datas da turma.</p>
                            </div>
                        ) : (
                            <ScrollArea className="h-[400px]">
                                <div className="space-y-4">
                                    {lessons.map((lesson) => (
                                        <div key={lesson.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                                            <div className="flex items-center gap-4">
                                                <div className="text-center bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm w-14 border border-slate-100 dark:border-slate-700">
                                                    <span className="block text-[10px] uppercase font-bold text-slate-400">{format(parseISO(lesson.date), 'MMM', { locale: ptBR })}</span>
                                                    <span className="block text-xl font-black text-slate-900 dark:text-white">{format(parseISO(lesson.date), 'dd')}</span>
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">Aula Regular</h4>
                                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                                        <Clock className="h-3 w-3" />
                                                        <span>{classData.time_start} - {classData.time_end}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <Badge variant="secondary" className="uppercase text-[10px]">Agendada</Badge>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-slate-50 dark:bg-slate-900">
                    <CardHeader>
                        <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-500">Resumo</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
                            <span className="text-xs font-medium text-slate-500">Total de Aulas</span>
                            <span className="text-lg font-black">{lessons.length}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
                            <span className="text-xs font-medium text-slate-500">Aulas Realizadas</span>
                            <span className="text-lg font-black text-emerald-600">0</span>
                        </div>
                        <div className="p-4 rounded-xl bg-blue-100/50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 flex gap-3 items-start">
                            <AlertCircle className="h-5 w-5 shrink-0" />
                            <p className="text-xs leading-relaxed">
                                Dias de aula: <span className="font-bold">{classData.days?.join(", ")}</span><br />
                                Horário: <span className="font-bold">{classData.time_start}</span>
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
