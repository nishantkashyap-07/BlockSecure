"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield, AlertTriangle, Clock } from "lucide-react"
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth"
import { detectSqlInjection } from "@/lib/security"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BruteForceProtection } from "@/lib/brute-force-protection"
import { DatabaseService } from "@/lib/database"
import { getFirebaseAuth } from "@/lib/firebase"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [lockoutStatus, setLockoutStatus] = useState({ locked: false, timeRemaining: 0 })
  const [attempts, setAttempts] = useState(0)
  const [dbConnected, setDbConnected] = useState(false)
  const [resetEmail, setResetEmail] = useState("")
  const [resetMessage, setResetMessage] = useState("")
  const [resetLoading, setResetLoading] = useState(false)
  const router = useRouter()

  // For attack demonstration
  const [attackInput, setAttackInput] = useState("")
  const [attackResult, setAttackResult] = useState<{ detected: boolean; message: string } | null>(null)

  // Test database connection on component mount
  useEffect(() => {
    const testConnection = async () => {
      try {
        const connected = await DatabaseService.testConnection()
        setDbConnected(connected)
        if (!connected) {
          console.warn("Database connection failed - some features may not work")
        }
      } catch (error) {
        console.error("Error testing database connection:", error)
        setDbConnected(false)
      }
    }

    testConnection()
  }, [])

  // Check lockout status when email changes
  useEffect(() => {
    if (email && typeof BruteForceProtection !== "undefined") {
      try {
        const status = BruteForceProtection.isLockedOut(email)
        setLockoutStatus(status)
        const attemptData = BruteForceProtection.getAttempts(email)
        setAttempts(attemptData.attempts)
      } catch (error) {
        console.error("Error checking lockout status:", error)
        setLockoutStatus({ locked: false, timeRemaining: 0 })
        setAttempts(0)
      }
    } else {
      setLockoutStatus({ locked: false, timeRemaining: 0 })
      setAttempts(0)
    }
  }, [email])

  // Update countdown timer
  useEffect(() => {
    if (
      lockoutStatus.locked &&
      lockoutStatus.timeRemaining > 0 &&
      email &&
      typeof BruteForceProtection !== "undefined"
    ) {
      const timer = setInterval(() => {
        try {
          const status = BruteForceProtection.isLockedOut(email)
          setLockoutStatus(status)

          if (!status.locked) {
            setAttempts(0)
            setError("")
          }
        } catch (error) {
          console.error("Error in timer:", error)
          setLockoutStatus({ locked: false, timeRemaining: 0 })
          setAttempts(0)
        }
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [lockoutStatus.locked, lockoutStatus.timeRemaining, email])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    // Validate email format
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address")
      setLoading(false)
      return
    }

    // Check if email is locked out
    if (typeof BruteForceProtection !== "undefined") {
      const currentLockoutStatus = BruteForceProtection.isLockedOut(email)
      if (currentLockoutStatus.locked) {
        setError(
          `This email is locked due to multiple failed attempts. Please wait ${BruteForceProtection.formatTime(currentLockoutStatus.timeRemaining)} before trying again.`,
        )
        setLockoutStatus(currentLockoutStatus)
        setLoading(false)
        return
      }
    }

    // Check for SQL injection
    if (detectSqlInjection(email) || detectSqlInjection(password)) {
      setError("Potential SQL injection detected. Login blocked.")

      // Log this suspicious activity (only if database is connected)
      if (dbConnected) {
        try {
          await DatabaseService.logSecurityEvent({
            eventType: "SQL_INJECTION_ATTEMPT",
            details: `SQL injection attempt during login from email: ${email}`,
            severity: "HIGH",
            userId: "anonymous",
            userEmail: email,
          })
        } catch (error) {
          console.error("Error logging to database:", error)
        }
      }

      // Also log to blockchain via API
      try {
        await fetch("/api/log-security-event", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            eventType: "SQL_INJECTION_ATTEMPT",
            details: `SQL injection attempt during login from email: ${email}`,
            severity: "HIGH",
            userId: "anonymous",
            userEmail: email,
          }),
        })
      } catch (error) {
        console.error("Error logging to blockchain:", error)
      }

      setLoading(false)
      return
    }

    try {
      const userCredential = await signInWithEmailAndPassword(getFirebaseAuth()!, email, password)

      // Clear login attempts on successful login
      if (typeof BruteForceProtection !== "undefined") {
        BruteForceProtection.clearAttempts(email)
      }
      setAttempts(0)
      setLockoutStatus({ locked: false, timeRemaining: 0 })

      // Update user's last login time (only if database is connected)
      if (dbConnected) {
        try {
          await DatabaseService.updateUserLastLogin(userCredential.user.uid)
        } catch (error) {
          console.error("Error updating last login:", error)
        }
      }

      // Log successful login (only if database is connected)
      if (dbConnected) {
        try {
          await DatabaseService.logSecurityEvent({
            eventType: "SUCCESSFUL_LOGIN",
            details: `User successfully logged in: ${email}`,
            severity: "LOW",
            userId: userCredential.user.uid,
            userEmail: email,
          })
        } catch (error) {
          console.error("Error logging successful login:", error)
        }
      }

      // Redirect to dashboard
      router.push("/dashboard")
    } catch (error: any) {
      // Record failed attempt for this specific email
      let attemptData = { attempts: 1, lockoutTime: null, email: email.toLowerCase(), lastAttempt: Date.now() }
      let newLockoutStatus = { locked: false, timeRemaining: 0 }

      if (typeof BruteForceProtection !== "undefined") {
        try {
          attemptData = BruteForceProtection.recordFailedAttempt(email)
          setAttempts(attemptData.attempts)

          // Check if user is now locked out
          newLockoutStatus = BruteForceProtection.isLockedOut(email)
          setLockoutStatus(newLockoutStatus)
        } catch (bfError) {
          console.error("Error with brute force protection:", bfError)
        }
      }

      if (newLockoutStatus.locked) {
        setError(`Too many failed login attempts for ${email}. Account locked for 5 minutes.`)

        // Log brute force attempt (only if database is connected)
        if (dbConnected) {
          try {
            await DatabaseService.logSecurityEvent({
              eventType: "BRUTE_FORCE_ATTEMPT",
              details: `Multiple failed login attempts for email: ${email} - account locked for 5 minutes`,
              severity: "HIGH",
              userId: "anonymous",
              userEmail: email,
            })
          } catch (error) {
            console.error("Error logging brute force attempt:", error)
          }
        }

        // Also log to blockchain
        try {
          await fetch("/api/log-security-event", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              eventType: "BRUTE_FORCE_ATTEMPT",
              details: `Multiple failed login attempts for email: ${email} - account locked for 5 minutes`,
              severity: "HIGH",
              userId: "anonymous",
              userEmail: email,
            }),
          })
        } catch (error) {
          console.error("Error logging to blockchain:", error)
        }
      } else {
        // Show specific error messages
        const remainingAttempts = Math.max(0, 5 - attemptData.attempts)

        if (error.code === "auth/user-not-found") {
          setError(`No account found with email: ${email}`)
        } else if (error.code === "auth/wrong-password") {
          setError(`Invalid password for ${email}. ${remainingAttempts} attempts remaining before lockout.`)
        } else if (error.code === "auth/invalid-email") {
          setError("Please enter a valid email address.")
        } else if (error.code === "auth/too-many-requests") {
          setError("Too many requests. Please try again later.")
        } else {
          setError(`Login failed for ${email}. ${remainingAttempts} attempts remaining before lockout.`)
        }

        // Log failed login attempt (only if database is connected)
        if (dbConnected) {
          try {
            await DatabaseService.logSecurityEvent({
              eventType: "FAILED_LOGIN_ATTEMPT",
              details: `Failed login attempt for email: ${email} (${attemptData.attempts}/5 attempts)`,
              severity: "MEDIUM",
              userId: "anonymous",
              userEmail: email,
            })
          } catch (error) {
            console.error("Error logging failed attempt:", error)
          }
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetMessage("")
    setResetLoading(true)
    try {
      const auth = getFirebaseAuth()
      if (!auth) throw new Error("Auth unavailable")
      await sendPasswordResetEmail(auth, resetEmail)
      setResetMessage("Password reset email sent. Check your inbox.")
    } catch (err: any) {
      if (err.code === "auth/user-not-found") {
        setResetMessage("No account found with that email.")
      } else {
        setResetMessage("Failed to send reset email. Please try again.")
      }
    } finally {
      setResetLoading(false)
    }
  }

  const testAttack = async () => {
    setAttackResult(null)

    if (!attackInput) {
      setAttackResult({
        detected: false,
        message: "Please enter an input to test",
      })
      return
    }

    const isInjection = detectSqlInjection(attackInput)

    setAttackResult({
      detected: isInjection,
      message: isInjection
        ? "SQL Injection detected! This input would be blocked in a real login."
        : "No SQL injection detected. This input would be allowed.",
    })

    // Log the test attempt (only if database is connected)
    if (dbConnected) {
      try {
        await DatabaseService.logSecurityEvent({
          eventType: "SQL_INJECTION_TEST",
          details: `SQL injection test from login page: "${attackInput}"`,
          severity: "LOW",
          userId: "anonymous",
          userEmail: email || "unknown",
        })
      } catch (error) {
        console.error("Error logging test attempt:", error)
      }
    }

    // Also log to blockchain
    try {
      await fetch("/api/log-security-event", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventType: "SQL_INJECTION_TEST",
          details: `SQL injection test from login page: "${attackInput}"`,
          severity: "LOW",
          userId: "anonymous",
          userEmail: email || "unknown",
        }),
      })
    } catch (error) {
      console.error("Error logging to blockchain:", error)
    }
  }

  const isEmailLocked = lockoutStatus.locked && email
  const showWarning = attempts > 0 && attempts < 5 && !isEmailLocked

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center">
            <Shield className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-center">Login</CardTitle>
          <CardDescription className="text-center">
            Enter your email and password to login to your account
          </CardDescription>
        </CardHeader>

        {!dbConnected && (
          <div className="px-6 pb-2">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Database offline - Login still works but some security features may be limited
              </AlertDescription>
            </Alert>
          </div>
        )}

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="reset">Reset Password</TabsTrigger>
            <TabsTrigger value="attack">Try Attack</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleLogin}>
              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {isEmailLocked && typeof BruteForceProtection !== "undefined" && (
                  <Alert variant="destructive">
                    <Clock className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-medium">Email Locked: {email}</div>
                      <div>Time remaining: {BruteForceProtection.formatTime(lockoutStatus.timeRemaining)}</div>
                      <div className="text-xs mt-1">
                        This email is temporarily locked due to multiple failed login attempts.
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {showWarning && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-medium">Warning for {email}</div>
                      <div>
                        {attempts} failed attempt(s). {5 - attempts} attempts remaining before 5-minute lockout.
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    placeholder="m@example.com"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className={isEmailLocked ? "border-red-300 bg-red-50" : ""}
                  />
                  {email && isEmailLocked && <p className="text-xs text-red-600">This email is currently locked</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading || isEmailLocked}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-4">
                <Button className="w-full" type="submit" disabled={loading || isEmailLocked}>
                  {loading
                    ? "Logging in..."
                    : isEmailLocked && typeof BruteForceProtection !== "undefined"
                      ? `Locked (${BruteForceProtection.formatTime(lockoutStatus.timeRemaining)})`
                      : "Login"}
                </Button>
                <div className="text-center text-sm">
                  Don&apos;t have an account?{" "}
                  <Link href="/register" className="underline">
                    Register
                  </Link>
                </div>
                <div className="text-center text-sm">
                  <Link href="/" className="underline text-gray-600 hover:text-gray-800">
                    ← Back to Home
                  </Link>
                </div>
              </CardFooter>
            </form>
          </TabsContent>

          <TabsContent value="reset">
            <form onSubmit={handlePasswordReset}>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">Enter your email address and we'll send you a link to reset your password.</p>
                {resetMessage && (
                  <Alert className={resetMessage.includes("sent") ? "bg-green-50 text-green-800 border-green-200" : "bg-red-50 text-red-800 border-red-200"}>
                    <AlertDescription>{resetMessage}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="m@example.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    disabled={resetLoading}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" type="submit" disabled={resetLoading}>
                  {resetLoading ? "Sending..." : "Send Reset Email"}
                </Button>
              </CardFooter>
            </form>
          </TabsContent>

          <TabsContent value="attack">
            <CardContent className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-800">
                  This section allows you to test SQL injection detection. Try entering malicious SQL patterns like
                  <code className="mx-1 px-1 py-0.5 bg-amber-100 rounded text-amber-900">' OR 1=1 --</code>
                  to see how they're detected.
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="attack-input">Test Input</Label>
                <Input
                  id="attack-input"
                  placeholder="Enter text to test for SQL injection"
                  value={attackInput}
                  onChange={(e) => setAttackInput(e.target.value)}
                />
              </div>

              <Button onClick={testAttack} variant="outline" className="w-full">
                Test for SQL Injection
              </Button>

              {attackResult && (
                <Alert
                  variant={attackResult.detected ? "destructive" : "default"}
                  className={attackResult.detected ? "" : "bg-green-50 text-green-800 border-green-200"}
                >
                  <AlertDescription>{attackResult.message}</AlertDescription>
                </Alert>
              )}

              <div className="text-sm text-gray-500 mt-2">
                <p className="font-medium">Common SQL injection patterns to try:</p>
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  <li>
                    <code className="px-1 py-0.5 bg-gray-100 rounded">' OR 1=1 --</code>
                  </li>
                  <li>
                    <code className="px-1 py-0.5 bg-gray-100 rounded">admin' --</code>
                  </li>
                  <li>
                    <code className="px-1 py-0.5 bg-gray-100 rounded">'; DROP TABLE users; --</code>
                  </li>
                  <li>
                    <code className="px-1 py-0.5 bg-gray-100 rounded">' UNION SELECT * FROM users --</code>
                  </li>
                </ul>
              </div>
            </CardContent>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  )
}
