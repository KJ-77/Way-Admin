import { Navigate } from "react-router-dom"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: string[]
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading, user } = useAuth()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && user && !user.groups.some((g) => allowedRoles.includes(g))) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

export default ProtectedRoute
