"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield, AlertTriangle, CheckCircle } from "lucide-react"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { getFirebaseAuth } from "@/lib/firebase"
import { detectSqlInjection } from "@/lib/security"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DatabaseService } from "@/lib/database"

export default function RegisterPage() {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState("")
  const router = useRouter()

  // For attack demonstration
  const [attackInput, setAttackInput] = useState("")
  const [attackResult, setAttackResult] = useState<{ detected: boolean; message: string } | null>(null)

  const validateForm = () => {
    if (!fullName.trim()) {
      setError("Full name is required")
      return false
    }

    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address")
      return false
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long")
      return false
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return false
    }

    return true
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setLoading(true)

    // Validate form
    if (!validateForm()) {
      setLoading(false)
      return
    }

    // Check for SQL injection
    if (detectSqlInjection(email) || detectSqlInjection(password) || detectSqlInjection(fullName)) {
      setError("Potential SQL injection detected. Registration blocked.")

      // Log this suspicious activity
      await DatabaseService.logSecurityEvent({
        eventType: "SQL_INJECTION_ATTEMPT",
        details: `SQL injection attempt during registration from email: ${email}`,
        severity: "HIGH",
        userId: "anonymous",
        userEmail: email,
      })

      // Also log to blockchain via API
      try {
        await fetch("/api/log-security-event", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            eventType: "SQL_INJECTION_ATTEMPT",
            details: `SQL injection attempt during registration from email: ${email}`,
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
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(getFirebaseAuth()!, email, password)

      // Store additional user data in Firestore
      const userDataSaved = await DatabaseService.saveUserData(userCredential.user.uid, {
        fullName: fullName.trim(),
        email: email.toLowerCase().trim(),
        createdAt: new Date(),
      })

      if (!userDataSaved) {
        console.warn("Failed to save user data to Firestore, but user account created")
      }

      // Log successful registration
      await DatabaseService.logSecurityEvent({
        eventType: "USER_REGISTRATION",
        details: `New user registered: ${email}`,
        severity: "LOW",
        userId: userCredential.user.uid,
        userEmail: email,
      })

      setSuccess("Registration successful! Redirecting to login page...")

      // Sign out the user immediately after registration
      await getFirebaseAuth()!.signOut()

      // Redirect to login page after a short delay
      setTimeout(() => {
        router.push("/login")
      }, 2000)
    } catch (error: any) {
      console.error("Registration error:", error)

      // Log failed registration attempt
      await DatabaseService.logSecurityEvent({
        eventType: "FAILED_REGISTRATION",
        details: `Failed registration attempt for email: ${email} - ${error.code || error.message}`,
        severity: "MEDIUM",
        userId: "anonymous",
        userEmail: email,
      })

      if (error.code === "auth/email-already-in-use") {
        setError("This email is already registered. Please use a different email or login.")
      } else if (error.code === "auth/weak-password") {
        setError("Password should be at least 6 characters long.")
      } else if (error.code === "auth/invalid-email") {
        setError("Please enter a valid email address.")
      } else if (error.code === "auth/operation-not-allowed") {
        setError("Email/password accounts are not enabled. Please contact support.")
      } else {
        setError(error.message || "Failed to register. Please try again.")
      }
    } finally {
      setLoading(false)
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
        ? "SQL Injection detected! This input would be blocked in a real registration."
        : "No SQL injection detected. This input would be allowed.",
    })

    // Log the test attempt
    await DatabaseService.logSecurityEvent({
      eventType: "SQL_INJECTION_TEST",
      details: `SQL injection test from registration page: "${attackInput}"`,
      severity: "HIGH",
      userId: "anonymous",
      userEmail: email || "unknown",
    })

    // Also log to blockchain
    try {
      await fetch("/api/log-security-event", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventType: "SQL_INJECTION_TEST",
          details: `SQL injection test from registration page: "${attackInput}"`,
          severity: "HIGH",
          userId: "anonymous",
          userEmail: email || "unknown",
        }),
      })
    } catch (error) {
      console.error("Error logging to blockchain:", error)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center">
            <Shield className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-center">Create an account</CardTitle>
          <CardDescription className="text-center">Enter your details to register</CardDescription>
        </CardHeader>

        <Tabs defaultValue="register" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="register">Register</TabsTrigger>
            <TabsTrigger value="attack">Try Attack</TabsTrigger>
          </TabsList>

          <TabsContent value="register">
            <form onSubmit={handleRegister}>
              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert className="bg-green-50 text-green-800 border-green-200">
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>{success}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    placeholder="Enter Full Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    placeholder="@example.com"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter a strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-500">Password must be at least 6 characters long</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-4">
                <Button className="w-full" type="submit" disabled={loading}>
                  {loading ? "Registering..." : "Register"}
                </Button>
                <div className="text-center text-sm">
                  Already have an account?{" "}
                  <Link href="/login" className="underline">
                    Login
                  </Link>
                </div>
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
