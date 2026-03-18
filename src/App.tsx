import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import AppLayout from "@/components/layout/app-layout"
import Dashboard from "@/pages/dashboard"
import UsersPage from "@/pages/users"
import SessionsPage from "@/pages/sessions"
import PackagesPage from "@/pages/packages"
import TutorsPage from "@/pages/tutors"
import SchedulePage from "@/pages/schedule"
import AccountsPage from "@/pages/accounts"
import SettingsPage from "@/pages/settings"
import NotFound from "@/pages/not-found"

const App = () => {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="way-admin-theme">
      <TooltipProvider>
        <Router>
          <AppLayout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/sessions" element={<SessionsPage />} />
              <Route path="/packages" element={<PackagesPage />} />
              <Route path="/tutors" element={<TutorsPage />} />
              <Route path="/schedule" element={<SchedulePage />} />
              <Route path="/accounts" element={<AccountsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppLayout>
        </Router>
      </TooltipProvider>
      <Toaster />
    </ThemeProvider>
  )
}

export default App
