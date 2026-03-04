import { useState } from "react"
import type { Class } from "@/types"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ClassForm } from "./class-form"
import { ClassStudents } from "./class-students"
import { ClassCalendar } from "./class-calendar"
import { Users, Calendar, Settings } from "lucide-react"

interface ClassDetailsProps {
    classData: Class
    open: boolean
    onOpenChange: (open: boolean) => void
    onUpdate: () => void
}

export function ClassDetails({ classData, open, onOpenChange, onUpdate }: ClassDetailsProps) {
    const [activeTab, setActiveTab] = useState("overview")

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-[32px] border-none shadow-2xl bg-slate-50 dark:bg-slate-950">
                <div className="p-6 pb-2 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                    <DialogHeader className="mb-4">
                        <div className="flex items-start justify-between">
                            <div className="space-y-1">
                                <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-3">
                                    {classData.name}
                                    <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-widest">{classData.code}</Badge>
                                </DialogTitle>
                                <DialogDescription className="font-medium text-slate-500">
                                    {classData.days?.join(' / ')} • {classData.time_start} - {classData.time_end} • {classData.mode === 'online' ? 'Online' : 'Presencial'}
                                </DialogDescription>
                            </div>
                            <Badge
                                variant={classData.status === 'active' ? 'default' : 'secondary'}
                                className={`text-xs font-bold uppercase tracking-widest px-3 py-1 ${classData.status === 'active' ? 'bg-emerald-500 hover:bg-emerald-600' : ''
                                    }`}
                            >
                                {classData.status}
                            </Badge>
                        </div>
                    </DialogHeader>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="bg-transparent p-0 gap-6 border-b border-transparent w-full justify-start h-auto">
                            <TabsTrigger
                                value="overview"
                                className="rounded-none border-b-2 border-transparent px-2 data-[state=active]:border-primary data-[state=active]:text-primary font-bold uppercase tracking-widest text-[11px] pb-3"
                            >
                                <Settings className="mr-2 h-4 w-4" /> Detalhes & Edição
                            </TabsTrigger>
                            <TabsTrigger
                                value="students"
                                className="rounded-none border-b-2 border-transparent px-2 data-[state=active]:border-primary data-[state=active]:text-primary font-bold uppercase tracking-widest text-[11px] pb-3"
                            >
                                <Users className="mr-2 h-4 w-4" /> Alunos ({classData.max_students} vagas)
                            </TabsTrigger>
                            <TabsTrigger
                                value="calendar"
                                className="rounded-none border-b-2 border-transparent px-2 data-[state=active]:border-primary data-[state=active]:text-primary font-bold uppercase tracking-widest text-[11px] pb-3"
                            >
                                <Calendar className="mr-2 h-4 w-4" /> Calendário & Aulas
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50/50 dark:bg-slate-950/50">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
                        <TabsContent value="overview" className="mt-0 h-full">
                            <div className="max-w-3xl">
                                <ClassForm
                                    initialData={classData}
                                    onSuccess={() => {
                                        onUpdate()
                                        // Optional: keep open or close
                                    }}
                                />
                            </div>
                        </TabsContent>

                        <TabsContent value="students" className="mt-0 h-full">
                            <div className="max-w-4xl">
                                <ClassStudents classData={classData} />
                            </div>
                        </TabsContent>

                        <TabsContent value="calendar" className="mt-0 h-full">
                            <div className="max-w-4xl">
                                <ClassCalendar classData={classData} />
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </DialogContent>
        </Dialog>
    )
}
