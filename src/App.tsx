import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { ThemeProvider } from "@/components/theme-provider"
import { SettingsProvider } from "@/components/settings-provider"
import { MainLayout } from "@/components/layout/main-layout"
import { Dashboard } from "@/pages/dashboard"
import StudentsPage from "@/pages/students"
import TeachersPage from "@/pages/teachers"
import ClassesPage from "@/pages/classes"
import AttendancePage from "@/pages/attendance"
import FinancialPage from "@/pages/financial"
import SettingsPage from "@/pages/settings"
import LoginPage from "@/pages/login"
import CalendarPage from "@/pages/calendar"
import EvaluationsPage from "@/pages/evaluations"
import ContractsPage from "@/pages/contracts"
import AnnouncementsPage from "@/pages/announcements"
import LeadsCRMPage from "@/pages/leads"

import StudentLoginPage from "@/pages/student-portal/login"
import StudentDashboardPage from "@/pages/student-portal/dashboard"
import StudentCalendarPage from "@/pages/student-portal/calendar"
import { StudentLayout } from "@/components/layout/student-layout"

import TeacherLoginPage from "@/pages/teacher-portal/login"
import TeacherDashboardPage from "@/pages/teacher-portal/dashboard"
import { TeacherLayout } from "@/components/layout/teacher-layout"

import { SaasLayout } from "@/components/layout/saas-layout"
import SaasDashboardPage from "@/pages/saas-admin/dashboard"
import SaasSchoolsPage from "@/pages/saas-admin/schools"

import { Toaster } from "@/components/ui/sonner"

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <SettingsProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<Navigate to="/login" replace />} />


            <Route element={<MainLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/students" element={<StudentsPage />} />
              <Route path="/teachers" element={<TeachersPage />} />
              <Route path="/classes" element={<ClassesPage />} />
              <Route path="/attendance" element={<AttendancePage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/evaluations" element={<EvaluationsPage />} />
              <Route path="/financial" element={<FinancialPage />} />
              <Route path="/contracts" element={<ContractsPage />} />
              <Route path="/announcements" element={<AnnouncementsPage />} />
              <Route path="/leads" element={<LeadsCRMPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>

            <Route path="/student/login" element={<StudentLoginPage />} />
            <Route element={<StudentLayout />}>
              <Route path="/student/dashboard" element={<StudentDashboardPage />} />
              <Route path="/student/calendar" element={<StudentCalendarPage />} />
            </Route>

            <Route path="/teacher/login" element={<TeacherLoginPage />} />
            <Route element={<TeacherLayout />}>
              <Route path="/teacher/dashboard" element={<TeacherDashboardPage />} />
              <Route path="/teacher/attendance" element={<AttendancePage />} />
              <Route path="/teacher/evaluations" element={<EvaluationsPage />} />
              <Route path="/teacher/announcements" element={<AnnouncementsPage />} />
              <Route path="/teacher/calendar" element={<CalendarPage />} />
            </Route>

            {/* MASTER SAAS ROUTES */}
            <Route element={<SaasLayout />}>
              <Route path="/saas-admin/dashboard" element={<SaasDashboardPage />} />
              <Route path="/saas-admin/schools" element={<SaasSchoolsPage />} />
            </Route>

            <Route path="/login" element={<LoginPage />} />
          </Routes>
          <Toaster position="top-right" richColors />
        </Router>
      </SettingsProvider>
    </ThemeProvider>
  )
}

export default App
