"use client"

import { useState, useEffect } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle } from "lucide-react"

export function EnvStatus() {
  const [missingVars, setMissingVars] = useState<string[]>([])

  useEffect(() => {
    const checkEnvVars = () => {
      const missing: string[] = []

      // Check for environment variables
      if (!process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL) {
        missing.push("NEXT_PUBLIC_ETHEREUM_RPC_URL")
      }

      // We can't check PRIVATE_KEY directly in client code
      // But we can check if the blockchain integration is working

      setMissingVars(missing)
    }

    checkEnvVars()
  }, [])

  if (missingVars.length === 0) return null

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>
        <div className="font-medium">Missing environment variables:</div>
        <ul className="list-disc pl-5 mt-1">
          {missingVars.map((variable) => (
            <li key={variable}>{variable}</li>
          ))}
        </ul>
        <div className="mt-2 text-sm">Please add these environment variables to your project.</div>
      </AlertDescription>
    </Alert>
  )
}
