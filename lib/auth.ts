interface LoginCredentials {
  email: string
  password: string
}

interface AuthResponse {
  success: boolean
  token?: string
  user?: {
    id: string
    name: string
    email: string
    role: string
  }
  error?: string
}

export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  // Mock authentication - replace with real auth logic
  if (credentials.email && credentials.password) {
    const token = btoa(credentials.email)
    localStorage.setItem("authToken", token)
    localStorage.setItem("userRole", "admin")

    return {
      success: true,
      token,
      user: {
        id: "1",
        name: "John Doe",
        email: credentials.email,
        role: "admin",
      },
    }
  }
  return { success: false, error: "Invalid credentials" }
}

export function logout(): void {
  localStorage.removeItem("authToken")
  localStorage.removeItem("userRole")
}

export function getAuthToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("authToken")
  }
  return null
}

export function isAuthenticated(): boolean {
  return getAuthToken() !== null
}

export function getUserRole(): string {
  if (typeof window !== "undefined") {
    return localStorage.getItem("userRole") || "employee"
  }
  return "employee"
}
