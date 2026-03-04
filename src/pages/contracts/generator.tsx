import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import {
    FileText,
    User,
    ArrowRight,
    ArrowLeft,
    Download,
    Loader2,
    Eye,
    MessageSquare,
    Mail,
    Save
} from "lucide-react"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { jsPDF } from "jspdf"
import html2canvas from "html2canvas"
import { Badge } from "@/components/ui/badge"

interface ContractGeneratorProps {
    onBack: () => void
}

export default function ContractGenerator({ onBack }: ContractGeneratorProps) {
    const [step, setStep] = useState(1)
    const [students, setStudents] = useState<any[]>([])
    const [templates, setTemplates] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [schoolSettings, setSchoolSettings] = useState<any>(null)

    const [selectedStudentId, setSelectedStudentId] = useState("")
    const [selectedTemplateId, setSelectedTemplateId] = useState("")
    const [processedContent, setProcessedContent] = useState("")
    const [isGenerating, setIsGenerating] = useState(false)

    useEffect(() => {
        fetchInitialData()
    }, [])

    async function fetchInitialData() {
        try {
            setLoading(true)
            const [studentsRes, templatesRes, settingsRes] = await Promise.all([
                supabase.from('students').select('id, full_name, cpf, address, birth_date, email, phone, class_id, classes(name)'),
                supabase.from('contract_templates').select('*').eq('is_active', true),
                supabase.from('school_settings').select('*').single()
            ])

            setStudents(studentsRes.data || [])
            setTemplates(templatesRes.data || [])
            setSchoolSettings(settingsRes.data)
        } catch (error) {
            console.error('Error fetching data:', error)
            toast.error("Erro ao carregar dados")
        } finally {
            setLoading(false)
        }
    }

    const selectedStudent = students.find(s => s.id === selectedStudentId)
    const selectedTemplate = templates.find(t => t.id === selectedTemplateId)

    function processTemplate() {
        if (!selectedStudent || !selectedTemplate) return

        let content = selectedTemplate.content

        // Define replacement map
        const replacements: Record<string, string> = {
            '{{nome_aluno}}': selectedStudent.full_name || "---",
            '{{cpf_aluno}}': selectedStudent.cpf || "---",
            '{{data_nascimento}}': selectedStudent.birth_date ? new Date(selectedStudent.birth_date).toLocaleDateString() : "---",
            '{{endereco_aluno}}': selectedStudent.address || "---",
            '{{nome_turma}}': selectedStudent.classes?.name || "---",
            '{{valor_mensalidade}}': "R$ 0,00", // Would need billing data
            '{{data_atual}}': new Date().toLocaleDateString(),
            '{{logo_escola}}': schoolSettings?.logo_url ? `<img src="${schoolSettings.logo_url}" style="height: 60px; display: block; margin-bottom: 20px;" />` : '',
            '{{assinatura_escola}}': schoolSettings?.school_signature_url ? `<img src="${schoolSettings.school_signature_url}" style="height: 80px; display: block; margin-top: 40px;" />` : '',
        }

        Object.entries(replacements).forEach(([tag, value]) => {
            content = content.replaceAll(tag, tag.includes('{{logo') || tag.includes('{{assinatura') ? value : `<strong>${value}</strong>`)
        })

        setProcessedContent(content)
        setStep(3)
    }

    async function handleGenerate() {
        try {
            setIsGenerating(true)
            const { error } = await supabase
                .from('generated_contracts')
                .insert({
                    template_id: selectedTemplateId,
                    student_id: selectedStudentId,
                    title: selectedTemplate?.title,
                    final_content: processedContent,
                    status: 'generated'
                })
                .select()
                .single()

            if (error) throw error
            toast.success("Contrato gerado com sucesso!")
            setStep(4)
        } catch (error) {
            console.error('Error generating contract:', error)
            toast.error("Erro ao salvar contrato")
        } finally {
            setIsGenerating(false)
        }
    }

    const downloadPDF = async () => {
        const element = document.getElementById('contract-preview')
        if (!element) return

        try {
            toast.loading("Gerando PDF...")
            const canvas = await html2canvas(element, { scale: 2 })
            const imgData = canvas.toDataURL('image/png')
            const pdf = new jsPDF('p', 'mm', 'a4')
            const imgProps = pdf.getImageProperties(imgData)
            const pdfWidth = pdf.internal.pageSize.getWidth()
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
            pdf.save(`Contrato_${selectedStudent?.full_name}.pdf`)
            toast.dismiss()
            toast.success("PDF baixado!")
        } catch (error) {
            toast.dismiss()
            toast.error("Erro ao gerar PDF")
        }
    }

    function shareWhatsApp() {
        if (!selectedStudent) return

        const phone = selectedStudent.phone?.replace(/\D/g, '')
        if (!phone) {
            toast.error("Aluno não possui telefone cadastrado")
            return
        }

        const message = encodeURIComponent(`Olá ${selectedStudent.full_name}, seu contrato (${selectedTemplate?.title}) está pronto para assinatura. Entre em contato para mais detalhes.`)
        window.open(`https://wa.me/55${phone}?text=${message}`, '_blank')
    }

    function sendEmail() {
        if (!selectedStudent) return

        const email = selectedStudent.email
        if (!email) {
            toast.error("Aluno não possui e-mail cadastrado")
            return
        }

        const subject = encodeURIComponent(`Contrato Disponível - ${selectedTemplate?.title}`)
        const body = encodeURIComponent(`Olá ${selectedStudent.full_name},\n\nSeu contrato está pronto. Por favor, entre em contato para finalizarmos a assinatura.\n\nAtenciosamente,\n${schoolSettings?.name || 'A Direção'}`)
        window.location.href = `mailto:${email}?subject=${subject}&body=${body}`
    }

    if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin" /></div>

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => step > 1 && step < 4 ? setStep(step - 1) : onBack()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 dark:text-white">Gerar Novo Contrato</h1>
                        <p className="text-slate-500 text-sm">Passo {step} de 3</p>
                    </div>
                </div>
            </div>

            <div className="relative">
                {/* Progress Bar */}
                <div className="absolute top-0 left-0 w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-blue-600 transition-all duration-500"
                        style={{ width: `${(step / 3) * 100}%` }}
                    />
                </div>

                <div className="pt-6">
                    {step === 1 && (
                        <Card className="rounded-3xl border-none shadow-premium">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <User className="text-blue-500" />
                                    Selecione o Aluno
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label>Aluno</Label>
                                    <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                                        <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none px-4">
                                            <SelectValue placeholder="Escolher aluno..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {students.map(s => (
                                                <SelectItem key={s.id} value={s.id}>{s.full_name} ({s.classes?.name})</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button
                                    disabled={!selectedStudentId}
                                    onClick={() => setStep(2)}
                                    className="w-full h-12 bg-blue-600 rounded-xl font-bold"
                                >
                                    Próximo Passo <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {step === 2 && (
                        <Card className="rounded-3xl border-none shadow-premium">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="text-blue-500" />
                                    Selecione o Modelo de Contrato
                                </CardTitle>
                                <p className="text-sm text-slate-500">Para {selectedStudent?.full_name}</p>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {templates.map(t => (
                                        <button
                                            key={t.id}
                                            onClick={() => setSelectedTemplateId(t.id)}
                                            className={`p-4 rounded-2xl border-2 text-left transition-all ${selectedTemplateId === t.id
                                                ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                                                : 'border-slate-100 dark:border-slate-800 hover:border-slate-300'
                                                }`}
                                        >
                                            <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center mb-3">
                                                <FileText className="w-5 h-5" />
                                            </div>
                                            <div className="font-bold text-slate-800 dark:text-white">{t.title}</div>
                                        </button>
                                    ))}
                                </div>
                                <Button
                                    disabled={!selectedTemplateId}
                                    onClick={processTemplate}
                                    className="w-full h-12 bg-blue-600 rounded-xl font-bold"
                                >
                                    Revisar e Gerar <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {step === 3 && (
                        <div className="space-y-6">
                            <Card className="rounded-3xl border-none shadow-premium overflow-hidden">
                                <CardHeader className="bg-slate-50 dark:bg-slate-800/50 p-6 border-b border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg font-black flex items-center gap-2">
                                            <Eye className="w-5 h-5 text-blue-500" />
                                            Prévia do Documento
                                        </CardTitle>
                                        <Badge variant="outline" className="bg-amber-100 text-amber-700 border-none font-bold italic">Rascunho</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0 bg-slate-100 dark:bg-slate-950 flex justify-center py-10">
                                    <div
                                        id="contract-preview"
                                        className="w-[210mm] min-h-[297mm] bg-white text-black p-[20mm] shadow-2xl prose prose-slate max-w-none"
                                        dangerouslySetInnerHTML={{ __html: processedContent }}
                                    />
                                </CardContent>
                            </Card>
                            <div className="flex gap-4">
                                <Button
                                    variant="outline"
                                    onClick={() => setStep(2)}
                                    className="flex-1 h-12 rounded-xl font-bold"
                                >
                                    Voltar
                                </Button>
                                <Button
                                    onClick={handleGenerate}
                                    disabled={isGenerating}
                                    className="flex-1 h-12 bg-blue-600 rounded-xl font-bold shadow-premium"
                                >
                                    {isGenerating ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4" />}
                                    Finalizar e Salvar
                                </Button>
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <Card className="rounded-3xl border-none shadow-premium text-center p-12 space-y-6">
                            <div className="h-20 w-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FileText className="w-10 h-10" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-black text-slate-800 dark:text-white">Contrato Gerado!</h2>
                                <p className="text-slate-500">O documento para <strong>{selectedStudent?.full_name}</strong> está pronto.</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-sm mx-auto">
                                <Button variant="outline" onClick={downloadPDF} className="h-12 rounded-xl font-bold border-slate-200">
                                    <Download className="mr-2 h-4 w-4" /> Baixar PDF
                                </Button>
                                <Button variant="outline" onClick={shareWhatsApp} className="h-12 rounded-xl font-bold border-slate-200">
                                    <MessageSquare className="mr-2 h-4 w-4" /> WhatsApp
                                </Button>
                                <Button variant="outline" onClick={sendEmail} className="h-12 rounded-xl font-bold border-slate-200">
                                    <Mail className="mr-2 h-4 w-4" /> Enviar Email
                                </Button>
                                <Button onClick={onBack} className="h-12 rounded-xl font-bold bg-slate-800">
                                    Sair
                                </Button>
                            </div>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    )
}
