import { Outlet } from "react-router-dom"
import { SaasSidebar } from "./saas-sidebar"
import { SaasHeader } from "./saas-header"

export function SaasLayout() {
    return (
        <div className="min-h-screen bg-slate-950 text-white dark">
            <SaasSidebar />
            <div className="lg:pl-72 transition-all duration-300">
                <SaasHeader />
                <main className="px-8 pb-12">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
