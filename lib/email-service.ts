
const EMAILJS_SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || ""
const EMAILJS_TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || ""
const EMAILJS_PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || ""
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || ""

interface EmailNotification {
  id: string
  to: string
  subject: string
  body: string
  priority: string
  timestamp: number
}

export class EmailService {
  private static notifications: EmailNotification[] = []
  private static isInitialized = false

  /**
   * Initialize EmailJS
   */
  static async initialize(): Promise<boolean> {
    try {
      // Skip initialization if not in browser or already initialized
      if (typeof window === "undefined" || this.isInitialized) return false

      const emailjs = await import("@emailjs/browser")
      emailjs.init(EMAILJS_PUBLIC_KEY)
      console.log("EmailJS initialized successfully")
      this.isInitialized = true
      return true
    } catch (error) {
      console.error("Failed to initialize EmailJS:", error)
      return false
    }
  }

  /**
   * Determines if an admin should be notified based on event type and severity
   */
  static shouldNotifyAdmin(eventType: string, severity: string): boolean {
    // High severity events always trigger notifications
    if (severity === "HIGH") return true

    // Medium severity security-related events trigger notifications
    if (
      severity === "MEDIUM" &&
      (eventType.includes("INJECTION") ||
        eventType.includes("BRUTE_FORCE") ||
        eventType.includes("UNAUTHORIZED") ||
        eventType.includes("FAILED_"))
    )
      return true

    // Specific event types that should trigger notifications regardless of severity
    const notifiableEvents = [
      "SQL_INJECTION_ATTEMPT",
      "BRUTE_FORCE_ATTEMPT",
      "UNAUTHORIZED_FILE_UPLOAD",
      "MULTIPLE_FAILED_LOGINS",
      "SECURITY_BREACH",
      "SUSPICIOUS_ACTIVITY",
    ]

    return notifiableEvents.some((event) => eventType.includes(event))
  }

  /**
   * Sends an email alert to the admin about a security event
   */
  static async sendAdminAlert(
    eventType: string,
    details: string,
    severity: string,
    userEmail: string,
    blockchainTxHash?: string,
  ): Promise<boolean> {
    try {
      if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY || !ADMIN_EMAIL) {
        console.warn("EmailJS not configured - storing notification locally")
        this.storeNotification(eventType, details, severity, userEmail, blockchainTxHash)
        return false
      }

      const subject = `[${severity}] SecureBlock Security Alert: ${eventType}`

      let emailBody = `🚨 SECURITY ALERT 🚨\n\n`
      emailBody += `Event Type: ${eventType}\n`
      emailBody += `Severity Level: ${severity}\n`
      emailBody += `User Email: ${userEmail}\n`
      emailBody += `Details: ${details}\n\n`

      if (blockchainTxHash) {
        emailBody += `🔗 Blockchain Proof:\n`
        emailBody += `Transaction Hash: ${blockchainTxHash}\n`
        emailBody += `Verify: https://sepolia.etherscan.io/tx/${blockchainTxHash}\n\n`
      }

      emailBody += `⏰ Time: ${new Date().toLocaleString()}\n\n`
      emailBody += `This is an automated security alert from SecureBlock.\n`
      emailBody += `Please review the admin dashboard for more details.`

      // EmailJS template parameters
      const templateParams = {
        to_email: ADMIN_EMAIL,
        subject: subject,
        message: emailBody,
        event_type: eventType,
        severity: severity,
        user_email: userEmail,
        blockchain_hash: blockchainTxHash || "N/A",
        timestamp: new Date().toLocaleString(),
      }

      // Store notification regardless of email success
      this.storeNotification(eventType, details, severity, userEmail, blockchainTxHash)

      // Only try to send email if in browser environment
      if (typeof window !== "undefined") {
        try {
          // Initialize EmailJS if needed
          await this.initialize()

          // Import EmailJS dynamically
          const emailjs = await import("@emailjs/browser")

          // Send email via EmailJS
          const response = await emailjs.send(
            EMAILJS_SERVICE_ID,
            EMAILJS_TEMPLATE_ID,
            templateParams,
            EMAILJS_PUBLIC_KEY,
          )
          console.log("Email sent successfully:", response)
          return true
        } catch (emailError) {
          console.error("Failed to send email:", emailError)
          return false
        }
      } else {
        console.log("Email sending skipped - server environment")
        return false
      }
    } catch (error) {
      console.error("Failed to process email alert:", error)
      // Store notification even if email fails
      this.storeNotification(eventType, details, severity, userEmail, blockchainTxHash)
      return false
    }
  }

  /**
   * Store notification locally for admin dashboard
   */
  private static storeNotification(
    eventType: string,
    details: string,
    severity: string,
    userEmail: string,
    blockchainTxHash?: string,
  ): void {
    const notification: EmailNotification = {
      id: Date.now().toString(),
      to: ADMIN_EMAIL || "admin@secureblock.com",
      subject: `[${severity}] SecureBlock Security Alert: ${eventType}`,
      body: `Event: ${eventType}\nSeverity: ${severity}\nUser: ${userEmail}\nDetails: ${details}\nBlockchain TX: ${blockchainTxHash || "N/A"}\nTime: ${new Date().toLocaleString()}`,
      priority: severity,
      timestamp: Date.now(),
    }

    this.notifications.unshift(notification)

    // Keep only last 50 notifications
    if (this.notifications.length > 50) {
      this.notifications = this.notifications.slice(0, 50)
    }

    // Store in localStorage for persistence
    if (typeof window !== "undefined") {
      localStorage.setItem("secureblock_notifications", JSON.stringify(this.notifications))
    }
  }

  /**
   * Get stored notifications
   */
  static getStoredNotifications(): EmailNotification[] {
    if (typeof window === "undefined") return this.notifications

    try {
      const stored = localStorage.getItem("secureblock_notifications")
      if (stored) {
        this.notifications = JSON.parse(stored)
      }
    } catch (error) {
      console.error("Error loading notifications:", error)
    }

    return this.notifications
  }

  /**
   * Clear all notifications
   */
  static clearNotifications(): void {
    this.notifications = []
    if (typeof window !== "undefined") {
      localStorage.removeItem("secureblock_notifications")
    }
  }

  /**
   * Test email configuration
   */
  static async testEmailSetup(): Promise<boolean> {
    try {
      return await this.sendAdminAlert(
        "EMAIL_TEST",
        "This is a test email to verify EmailJS configuration",
        "LOW",
        "test@example.com",
      )
    } catch (error) {
      console.error("Email test failed:", error)
      return false
    }
  }
}

// For backward compatibility with code that imports RealEmailService
export const RealEmailService = EmailService
