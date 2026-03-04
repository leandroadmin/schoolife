import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FinancialDashboardTab } from "./dashboard-tab"
import { SuppliersTab } from "./suppliers-tab"
import { PayablesTab } from "./payables-tab"
import { ReceivablesTab } from "./receivables-tab"
import { DefaultersTab } from "./defaulters-tab"

export default function FinancialPage() {
    return (
        <div className="space-y-8 animate-in-stagger max-w-7xl mx-auto p-4 sm:p-8">
            <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white">Financeiro</h1>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Controle de receitas, despesas e saúde financeira da escola.</p>
            </div>

            <Tabs defaultValue="dashboard" className="space-y-6">
                <TabsList className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-1 h-auto rounded-2xl flex-wrap justify-start">
                    <TabsTrigger value="dashboard" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-600 data-[state=active]:dark:bg-emerald-500/10 data-[state=active]:dark:text-emerald-400 font-bold transition-all">Dashboard</TabsTrigger>
                    <TabsTrigger value="payables" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-rose-50 data-[state=active]:text-rose-600 data-[state=active]:dark:bg-rose-500/10 data-[state=active]:dark:text-rose-400 font-bold transition-all">Contas a Pagar (Fornecedores)</TabsTrigger>
                    <TabsTrigger value="receivables" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600 data-[state=active]:dark:bg-indigo-500/10 data-[state=active]:dark:text-indigo-400 font-bold transition-all">Contas a Receber (Alunos)</TabsTrigger>
                    <TabsTrigger value="defaulters" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-amber-50 data-[state=active]:text-amber-600 data-[state=active]:dark:bg-amber-500/10 data-[state=active]:dark:text-amber-400 font-bold transition-all">Inadimplência</TabsTrigger>
                    <TabsTrigger value="suppliers" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-800 data-[state=active]:dark:bg-slate-800 data-[state=active]:dark:text-white font-bold transition-all">Gestão de Fornecedores</TabsTrigger>
                </TabsList>

                <TabsContent value="dashboard" className="pt-4 focus-visible:outline-none">
                    <FinancialDashboardTab />
                </TabsContent>

                <TabsContent value="payables" className="pt-4 focus-visible:outline-none">
                    <PayablesTab />
                </TabsContent>

                <TabsContent value="receivables" className="pt-4 focus-visible:outline-none">
                    <ReceivablesTab />
                </TabsContent>

                <TabsContent value="defaulters" className="pt-4 focus-visible:outline-none">
                    <DefaultersTab />
                </TabsContent>

                <TabsContent value="suppliers" className="pt-4 focus-visible:outline-none">
                    <SuppliersTab />
                </TabsContent>
            </Tabs>
        </div>
    )
}
