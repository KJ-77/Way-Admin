import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Loader2, Palette, Eye, EyeOff } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/auth-context"

const LoginForm = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { login, completeNewPassword, needsNewPassword } = useAuth()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsSubmitting(true)

    const result = await login(email, password)

    if (result.status === "success") {
      navigate("/", { replace: true })
    } else if (result.status === "error") {
      setError(result.message)
    }
    // "new_password_required" is handled by needsNewPassword state

    setIsSubmitting(false)
  }

  const handleNewPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (newPassword !== confirmPassword) {
      setError(t("auth.passwordMismatch"))
      return
    }

    setIsSubmitting(true)
    try {
      await completeNewPassword(newPassword)
      navigate("/", { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set new password")
    }
    setIsSubmitting(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border/40 bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Palette className="h-6 w-6" />
          </div>
          <div>
            <CardTitle className="text-xl">
              {needsNewPassword ? t("auth.newPasswordTitle") : t("auth.loginTitle")}
            </CardTitle>
            <CardDescription>
              {needsNewPassword ? t("auth.newPasswordDescription") : t("auth.loginDescription")}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {needsNewPassword ? (
            <form onSubmit={handleNewPassword} className="space-y-4">
              <div className="space-y-2">
                <Label>{t("auth.newPassword")}</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    autoFocus
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute end-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("auth.confirmPassword")}</Label>
                <Input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? t("auth.changingPassword") : t("auth.changePassword")}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label>{t("auth.email")}</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label>{t("auth.password")}</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute end-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? t("auth.signingIn") : t("auth.signIn")}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default LoginForm
