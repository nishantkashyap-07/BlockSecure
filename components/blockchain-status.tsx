"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { testBlockchainConnection } from "@/lib/blockchain"

export function BlockchainStatus() {
  const [status, setStatus] = useState<"connected" | "disconnected" | "checking">("checking")
  const [network, setNetwork] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const result = await testBlockchainConnection()

        if (result.connected) {
          setStatus("connected")
          setNetwork(result.network || "unknown")
          setError(null)
        } else {
          setStatus("disconnected")
          setError(result.error || "Connection failed")
        }
      } catch (error) {
        console.error("Error checking blockchain connection:", error)
        setStatus("disconnected")
        setError("Connection test failed")
      }
    }

    checkConnection()
  }, [])

  const getStatusText = () => {
    switch (status) {
      case "connected":
        return `Blockchain: ${network}`
      case "disconnected":
        return "Blockchain: Offline"
      case "checking":
        return "Checking..."
      default:
        return "Unknown"
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Badge
        variant={status === "connected" ? "success" : status === "disconnected" ? "destructive" : "secondary"}
        className={status === "checking" ? "animate-pulse" : ""}
        title={error || undefined}
      >
        {getStatusText()}
      </Badge>
    </div>
  )
}
