import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Loader2, Palette, Eye, EyeOff, ArrowLeft, CheckCircle2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/auth-context"

// Tracks which screen the login form is showing
type LoginView = "login" | "forgot-email" | "forgot-code" | "forgot-success"

const LoginForm = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { login, completeNewPassword, forgotPassword, confirmForgotPassword, needsNewPassword } = useAuth()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Forgot password flow state
  const [view, setView] = useState<LoginView>("login")
  const [forgotEmail, setForgotEmail] = useState("")
  const [verificationCode, setVerificationCode] = useState("")
  const [forgotNewPassword, setForgotNewPassword] = useState("")
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("")

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

  // Step 1: Send verification code to the user's email
  const handleForgotSubmitEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsSubmitting(true)
    try {
      await forgotPassword(forgotEmail)
      setView("forgot-code")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send verification code")
    }
    setIsSubmitting(false)
  }

  // Step 2: Verify code and set new password
  const handleForgotConfirm = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (forgotNewPassword !== forgotConfirmPassword) {
      setError(t("auth.passwordMismatch"))
      return
    }

    setIsSubmitting(true)
    try {
      await confirmForgotPassword(forgotEmail, verificationCode, forgotNewPassword)
      setView("forgot-success")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password")
    }
    setIsSubmitting(false)
  }

  // Reset forgot password flow and go back to login
  const backToLogin = () => {
    setView("login")
    setError("")
    setForgotEmail("")
    setVerificationCode("")
    setForgotNewPassword("")
    setForgotConfirmPassword("")
  }

  // Figure out title/description based on current view
  const getTitle = () => {
    if (needsNewPassword) return t("auth.newPasswordTitle")
    switch (view) {
      case "forgot-email": return t("auth.forgotPasswordTitle")
      case "forgot-code": return t("auth.resetPasswordTitle")
      case "forgot-success": return t("auth.passwordResetSuccessTitle")
      default: return t("auth.loginTitle")
    }
  }

  const getDescription = () => {
    if (needsNewPassword) return t("auth.newPasswordDescription")
    switch (view) {
      case "forgot-email": return t("auth.forgotPasswordDescription")
      case "forgot-code": return t("auth.resetPasswordDescription")
      case "forgot-success": return t("auth.passwordResetSuccessDescription")
      default: return t("auth.loginDescription")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border/40 bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Palette className="h-6 w-6" />
          </div>
          <div>
            <CardTitle className="text-xl">{getTitle()}</CardTitle>
            <CardDescription>{getDescription()}</CardDescription>
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
          ) : view === "forgot-email" ? (
            /* Step 1: Enter email to receive verification code */
            <form onSubmit={handleForgotSubmitEmail} className="space-y-4">
              <div className="space-y-2">
                <Label>{t("auth.email")}</Label>
                <Input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? t("auth.sendingCode") : t("auth.sendCode")}
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={backToLogin}>
                <ArrowLeft className="me-2 h-4 w-4" />
                {t("auth.backToLogin")}
              </Button>
            </form>
          ) : view === "forgot-code" ? (
            /* Step 2: Enter verification code + new password */
            <form onSubmit={handleForgotConfirm} className="space-y-4">
              <div className="space-y-2">
                <Label>{t("auth.verificationCode")}</Label>
                <Input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="123456"
                  required
                  autoFocus
                  inputMode="numeric"
                  maxLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("auth.newPassword")}</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={forgotNewPassword}
                    onChange={(e) => setForgotNewPassword(e.target.value)}
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
              <div className="space-y-2">
                <Label>{t("auth.confirmPassword")}</Label>
                <Input
                  type={showPassword ? "text" : "password"}
                  value={forgotConfirmPassword}
                  onChange={(e) => setForgotConfirmPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? t("auth.resettingPassword") : t("auth.resetPassword")}
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={backToLogin}>
                <ArrowLeft className="me-2 h-4 w-4" />
                {t("auth.backToLogin")}
              </Button>
            </form>
          ) : view === "forgot-success" ? (
            /* Success — password has been reset */
            <div className="space-y-4 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
              <p className="text-sm text-muted-foreground">{t("auth.passwordResetSuccessMessage")}</p>
              <Button className="w-full" onClick={backToLogin}>
                {t("auth.backToLogin")}
              </Button>
            </div>
          ) : (
            /* Default login form */
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
                <div className="flex items-center justify-between">
                  <Label>{t("auth.password")}</Label>
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-xs text-muted-foreground"
                    onClick={() => { setError(""); setView("forgot-email") }}
                  >
                    {t("auth.forgotPassword")}
                  </Button>
                </div>
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
