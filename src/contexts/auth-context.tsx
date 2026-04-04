import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react"
import {
  CognitoUser,
  AuthenticationDetails,
  type CognitoUserSession,
  type IAuthenticationCallback,
} from "amazon-cognito-identity-js"
import { userPool } from "@/lib/cognito"

interface AuthUser {
  sub: string
  email: string
  name: string
  groups: string[]
}

type LoginResult =
  | { status: "success" }
  | { status: "new_password_required" }
  | { status: "error"; message: string }

interface AuthContextType {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  needsNewPassword: boolean
  login: (email: string, password: string) => Promise<LoginResult>
  completeNewPassword: (newPassword: string) => Promise<void>
  forgotPassword: (email: string) => Promise<void>
  confirmForgotPassword: (email: string, code: string, newPassword: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

const parseUserFromSession = (session: CognitoUserSession): AuthUser => {
  const idToken = session.getIdToken()
  const payload = idToken.decodePayload()

  let groups: string[] = []
  const rawGroups = payload["cognito:groups"]
  if (Array.isArray(rawGroups)) {
    groups = rawGroups
  } else if (typeof rawGroups === "string") {
    groups = [rawGroups]
  }

  return {
    sub: payload.sub,
    email: payload.email || "",
    name: payload.name || "",
    groups,
  }
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [needsNewPassword, setNeedsNewPassword] = useState(false)
  const cognitoUserRef = useRef<CognitoUser | null>(null)
  const userAttrsRef = useRef<any>(null)

  // Check for existing session on mount
  useEffect(() => {
    const currentUser = userPool.getCurrentUser()
    if (!currentUser) {
      setIsLoading(false)
      return
    }

    currentUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session?.isValid()) {
        setIsLoading(false)
        return
      }
      setUser(parseUserFromSession(session))
      setIsLoading(false)
    })
  }, [])

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    return new Promise((resolve) => {
      const cognitoUser = new CognitoUser({
        Username: email,
        Pool: userPool,
      })
      cognitoUserRef.current = cognitoUser

      const authDetails = new AuthenticationDetails({
        Username: email,
        Password: password,
      })

      cognitoUser.authenticateUser(authDetails, {
        onSuccess: (session) => {
          setUser(parseUserFromSession(session))
          setNeedsNewPassword(false)
          resolve({ status: "success" })
        },
        onFailure: (err) => {
          resolve({ status: "error", message: err.message || "Authentication failed" })
        },
        newPasswordRequired: (userAttributes) => {
          userAttrsRef.current = userAttributes
          setNeedsNewPassword(true)
          resolve({ status: "new_password_required" })
        },
      })
    })
  }, [])

  const completeNewPassword = useCallback(async (newPassword: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const cognitoUser = cognitoUserRef.current
      if (!cognitoUser) return reject(new Error("No active auth session"))

      // Remove read-only and already-set attributes that Cognito doesn't allow in this challenge
      const attrs = { ...userAttrsRef.current }
      delete attrs.email_verified
      delete attrs.phone_number_verified
      delete attrs.sub
      delete attrs.email
      delete attrs.phone_number

      cognitoUser.completeNewPasswordChallenge(newPassword, attrs, {
        onSuccess: (session) => {
          setUser(parseUserFromSession(session))
          setNeedsNewPassword(false)
          resolve()
        },
        onFailure: (err) => {
          reject(new Error(err.message || "Failed to set new password"))
        },
      })
    })
  }, [])

  // Initiates forgot password flow — Cognito sends a 6-digit verification code to the user's email
  const forgotPassword = useCallback(async (email: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const cognitoUser = new CognitoUser({ Username: email, Pool: userPool })
      cognitoUser.forgotPassword({
        onSuccess: () => resolve(),
        onFailure: (err) => reject(new Error(err.message || "Failed to initiate password reset")),
      } as IAuthenticationCallback)
    })
  }, [])

  // Completes the forgot password flow — verifies the code and sets the new password
  const confirmForgotPassword = useCallback(async (email: string, code: string, newPassword: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const cognitoUser = new CognitoUser({ Username: email, Pool: userPool })
      cognitoUser.confirmPassword(code, newPassword, {
        onSuccess: () => resolve(),
        onFailure: (err) => reject(new Error(err.message || "Failed to reset password")),
      })
    })
  }, [])

  const logout = useCallback(() => {
    const currentUser = userPool.getCurrentUser()
    if (currentUser) {
      currentUser.signOut()
    }
    setUser(null)
    setNeedsNewPassword(false)
    cognitoUserRef.current = null
    userAttrsRef.current = null
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        needsNewPassword,
        login,
        completeNewPassword,
        forgotPassword,
        confirmForgotPassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within an AuthProvider")
  return context
}
