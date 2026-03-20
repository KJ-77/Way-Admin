import { userPool } from "@/lib/cognito"
import type { CognitoUserSession } from "amazon-cognito-identity-js"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

const getToken = (): Promise<string | null> => {
  return new Promise((resolve) => {
    const cognitoUser = userPool.getCurrentUser()
    if (!cognitoUser) return resolve(null)

    cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session?.isValid()) return resolve(null)
      resolve(session.getIdToken().getJwtToken())
    })
  })
}

export const apiFetch = async (path: string, options: RequestInit = {}): Promise<Response> => {
  const token = await getToken()

  const headers = new Headers(options.headers)
  headers.set("Content-Type", "application/json")
  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })
}
