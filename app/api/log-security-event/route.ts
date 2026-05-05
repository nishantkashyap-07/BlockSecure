import { NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"
import { logToBlockchain } from "@/lib/blockchain"

export async function POST(request: Request) {
  try {
    const data = await request.json()
    const { eventType, details, severity, userId = "anonymous", userEmail } = data

    if (!eventType || !details || !severity) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    console.log("Logging security event:", { eventType, details, severity, userId, userEmail })

    // Test database connection first
    await DatabaseService.testConnection()

    // Log to Firestore first
    const eventId = await DatabaseService.logSecurityEvent({
      eventType,
      details,
      severity,
      userId,
      userEmail: userEmail || "unknown",
    })

    console.log("Event logged to Firestore with ID:", eventId)

    // Log to blockchain - don't throw errors if it fails
    let blockchainTxHash = null
    try {
      blockchainTxHash = await logToBlockchain(eventType, details, severity, userId)
      console.log("Blockchain transaction hash:", blockchainTxHash)
    } catch (blockchainError) {
      console.error("Error logging to blockchain:", blockchainError)
      blockchainTxHash = `0xerror${Date.now().toString(16)}`
    }

    // Update Firestore document with blockchain transaction hash
    try {
      await DatabaseService.updateSecurityEventWithBlockchain(eventId, blockchainTxHash)
      console.log("Updated Firestore with blockchain TX hash")
    } catch (updateError) {
      console.error("Error updating Firestore with blockchain hash:", updateError)
    }

    return NextResponse.json({
      success: true,
      eventId,
      blockchainTxHash,
      userId,
      userEmail: userEmail || "unknown",
    })
  } catch (error) {
    console.error("Error in log-security-event API:", error)
    return NextResponse.json(
      {
        error: "Failed to log security event",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
