"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, Database, Shield, Mail } from "lucide-react"
import { testBlockchainConnection } from "@/lib/blockchain"
import { DatabaseService } from "@/lib/database"
import { isFirebaseConfigured } from "@/lib/firebase"

export function SystemStatus() {
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState({
    firebase: false,
    blockchain: false,
    email: false,
    blockchainNetwork: "",
    error: null as string | null,
    missingEnvVars: [] as string[],
  })

  useEffect(() => {
    checkStatus()
  }, [])

  const checkStatus = async () => {
    setLoading(true)
    try {
      // Check for missing environment variables
      const missingVars = []
      if (!process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL) missingVars.push("NEXT_PUBLIC_ETHEREUM_RPC_URL")
      if (!process.env.NEXT_PUBLIC_CONTRACT_ADDRESS) missingVars.push("NEXT_PUBLIC_CONTRACT_ADDRESS")
      if (!process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID) missingVars.push("NEXT_PUBLIC_EMAILJS_SERVICE_ID")
      if (!process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID) missingVars.push("NEXT_PUBLIC_EMAILJS_TEMPLATE_ID")
      if (!process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY) missingVars.push("NEXT_PUBLIC_EMAILJS_PUBLIC_KEY")
      if (!process.env.NEXT_PUBLIC_ADMIN_EMAIL) missingVars.push("NEXT_PUBLIC_ADMIN_EMAIL")

      // Check Firebase
      let firebaseConnected = false
      try {
        firebaseConnected = isFirebaseConfigured()
        if (firebaseConnected) {
          await DatabaseService.testConnection()
        }
      } catch (error) {
        console.error("Firebase check failed:", error)
        firebaseConnected = false
      }

      // Check Blockchain - only if environment variables are set
      let blockchainResult = { connected: false, network: "", error: "Environment variables missing" }
      if (process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL && process.env.NEXT_PUBLIC_CONTRACT_ADDRESS) {
        try {
          blockchainResult = await testBlockchainConnection()
        } catch (error) {
          console.error("Blockchain check failed:", error)
          blockchainResult = { connected: false, network: "", error: "Connection failed" }
        }
      }

      // Check Email (basic environment variable check)
      const emailConfigured = !!(
        process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID &&
        process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID &&
        process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY &&
        process.env.NEXT_PUBLIC_ADMIN_EMAIL
      )

      setStatus({
        firebase: firebaseConnected,
        blockchain: blockchainResult.connected,
        email: emailConfigured,
        blockchainNetwork: blockchainResult.network || "",
        error: null,
        missingEnvVars: missingVars,
      })
    } catch (error) {
      console.error("Error checking system status:", error)
      setStatus((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "System check failed",
      }))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>System Status</CardTitle>
        <Button variant="outline" size="sm" onClick={checkStatus} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {status.error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">Error: {status.error}</p>
          </div>
        )}

        {status.missingEnvVars.length > 0 && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
            <p className="text-sm font-medium text-amber-800">Missing Environment Variables:</p>
            <ul className="list-disc pl-5 mt-1 text-sm text-amber-700">
              {status.missingEnvVars.map((variable) => (
                <li key={variable}>{variable}</li>
              ))}
            </ul>
            <p className="text-xs mt-2 text-amber-600">
              Please add these variables to your .env.local file or deployment environment.
            </p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center">
              <Database className="h-5 w-5 mr-2 text-blue-600" />
              <span>Firebase</span>
            </div>
            <Badge
              variant={status.firebase ? "success" : "destructive"}
              className={status.firebase ? "bg-green-100 text-green-800" : ""}
            >
              {status.firebase ? "Connected" : "Offline"}
            </Badge>
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center">
              <Shield className="h-5 w-5 mr-2 text-green-600" />
              <span>Blockchain</span>
            </div>
            <Badge
              variant={status.blockchain ? "success" : "destructive"}
              className={status.blockchain ? "bg-green-100 text-green-800" : ""}
            >
              {status.blockchain ? status.blockchainNetwork || "Connected" : "Offline"}
            </Badge>
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center">
              <Mail className="h-5 w-5 mr-2 text-purple-600" />
              <span>Email</span>
            </div>
            <Badge
              variant={status.email ? "success" : "destructive"}
              className={status.email ? "bg-green-100 text-green-800" : ""}
            >
              {status.email ? "Configured" : "Not Setup"}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
