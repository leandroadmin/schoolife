import { Outlet } from "react-router-dom"
import { Sidebar } from "./sidebar"
import { Header } from "./header"

export function MainLayout() {
    return (
        <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950">
            <Sidebar />
            <div className="lg:pl-72 transition-all duration-300">
                <Header />
                <main className="px-8 pb-12">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
