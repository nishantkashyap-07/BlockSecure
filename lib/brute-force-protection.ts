interface LoginAttempt {
  email: string
  attempts: number
  lockoutTime: number | null
  lastAttempt: number
}

const LOCKOUT_DURATION = 5 * 60 * 1000 // 5 minutes in milliseconds
const MAX_ATTEMPTS = 5

export class BruteForceProtection {
  private static getStorageKey(email: string): string {
    return `login_attempts_${email.toLowerCase()}`
  }

  private static getLockoutKey(email: string): string {
    return `lockout_time_${email.toLowerCase()}`
  }

  static getAttempts(email: string): LoginAttempt {
    if (typeof window === "undefined") {
      return {
        email: email.toLowerCase(),
        attempts: 0,
        lockoutTime: null,
        lastAttempt: Date.now(),
      }
    }

    const storageKey = this.getStorageKey(email)
    const lockoutKey = this.getLockoutKey(email)

    const stored = localStorage.getItem(storageKey)
    const lockoutTime = localStorage.getItem(lockoutKey)

    const attempts = stored ? Number.parseInt(stored) : 0
    const lockout = lockoutTime ? Number.parseInt(lockoutTime) : null

    return {
      email: email.toLowerCase(),
      attempts,
      lockoutTime: lockout,
      lastAttempt: Date.now(),
    }
  }

  static isLockedOut(email: string): { locked: boolean; timeRemaining: number } {
    const attempt = this.getAttempts(email)

    if (!attempt.lockoutTime || attempt.attempts < MAX_ATTEMPTS) {
      return { locked: false, timeRemaining: 0 }
    }

    const now = Date.now()
    const timeRemaining = Math.max(0, LOCKOUT_DURATION - (now - attempt.lockoutTime))

    if (timeRemaining <= 0) {
      // Lockout period has expired, clear the data
      this.clearAttempts(email)
      return { locked: false, timeRemaining: 0 }
    }

    return { locked: true, timeRemaining: Math.ceil(timeRemaining / 1000) }
  }

  static recordFailedAttempt(email: string): LoginAttempt {
    if (typeof window === "undefined") {
      return {
        email: email.toLowerCase(),
        attempts: 1,
        lockoutTime: null,
        lastAttempt: Date.now(),
      }
    }

    const attempt = this.getAttempts(email)
    const newAttempts = attempt.attempts + 1

    localStorage.setItem(this.getStorageKey(email), newAttempts.toString())

    if (newAttempts >= MAX_ATTEMPTS) {
      const lockoutTime = Date.now()
      localStorage.setItem(this.getLockoutKey(email), lockoutTime.toString())
      return {
        email: email.toLowerCase(),
        attempts: newAttempts,
        lockoutTime,
        lastAttempt: Date.now(),
      }
    }

    return {
      email: email.toLowerCase(),
      attempts: newAttempts,
      lockoutTime: null,
      lastAttempt: Date.now(),
    }
  }

  static clearAttempts(email: string): void {
    if (typeof window === "undefined") return

    localStorage.removeItem(this.getStorageKey(email))
    localStorage.removeItem(this.getLockoutKey(email))
  }

  static formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  static getAllLockedEmails(): string[] {
    if (typeof window === "undefined") return []

    const lockedEmails: string[] = []

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith("lockout_time_")) {
        const email = key.replace("lockout_time_", "")
        const lockoutStatus = this.isLockedOut(email)
        if (lockoutStatus.locked) {
          lockedEmails.push(email)
        }
      }
    }

    return lockedEmails
  }
}

export default BruteForceProtection
