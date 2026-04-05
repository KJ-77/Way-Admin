import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AuthProvider } from "@/contexts/auth-context"
import ProtectedRoute from "@/components/auth/protected-route"
import AppLayout from "@/components/layout/app-layout"
import LoginPage from "@/pages/login"
import Dashboard from "@/pages/dashboard"
import UsersPage from "@/pages/users"
import SessionsPage from "@/pages/sessions"
import PackagesPage from "@/pages/packages"
import SubscriptionsPage from "@/pages/subscriptions"
import TutorsPage from "@/pages/tutors"
import SchedulePage from "@/pages/schedule"
import ItemsPage from "@/pages/items"
import AccountsPage from "@/pages/accounts"
import UserDetailPage from "@/pages/user-detail"
import NotFound from "@/pages/not-found"

const App = () => {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="way-admin-theme">
      <TooltipProvider>
        <AuthProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/users" element={<UsersPage />} />
                        <Route path="/users/:id" element={<UserDetailPage />} />
                        <Route path="/sessions" element={<SessionsPage />} />
                        <Route path="/packages" element={<PackagesPage />} />
                        <Route path="/subscriptions" element={<SubscriptionsPage />} />
                        <Route path="/tutors" element={<TutorsPage />} />
                        <Route path="/schedule" element={<SchedulePage />} />
                        <Route path="/items" element={<ItemsPage />} />
                        <Route
                          path="/accounts"
                          element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                              <AccountsPage />
                            </ProtectedRoute>
                          }
                        />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Router>
        </AuthProvider>
      </TooltipProvider>
      <Toaster />
    </ThemeProvider>
  )
}

export default App
