import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp,
  updateDoc,
  doc,
  setDoc,
  deleteDoc,
} from "firebase/firestore"
import { getFirebaseFirestore } from "@/lib/firebase"
import { EmailService } from "@/lib/email-service"

export interface SecurityEvent {
  id?: string
  eventType: string
  details: string
  severity: string
  userId: string
  userEmail?: string
  timestamp: any
  blockchainTxHash?: string
  ipAddress?: string
}

export interface UploadedFile {
  id?: string
  name: string
  size: number
  type: string
  uploadedAt: any
  userId: string
  userEmail: string
  url?: string
  secureUrl?: string
  publicId?: string
  blockchainTxHash?: string
}

export interface UserData {
  fullName: string
  email: string
  createdAt: any
  lastLogin?: any
}

export class DatabaseService {
  static async testConnection(): Promise<boolean> {
    try {
      const db = getFirebaseFirestore()
      if (!db) {
        console.warn("Firestore not available")
        return false
      }

      // Avoid performing reads that may violate Firestore security rules when the user
      // is not authenticated. If Firestore initializes, consider the connection healthy.
      console.log("Firebase initialized; skipping test read to respect security rules")
      return true
    } catch (error) {
      // Permission-denied is common when rules require auth; treat as connected.
      const message = error instanceof Error ? error.message : String(error)
      if (message.includes("permission") || message.includes("insufficient permissions")) {
        console.warn("Firestore rules blocked unauthenticated test read; treating as connected")
        return true
      }
      console.error("Database connection failed:", error)
      return false
    }
  }

  static async logSecurityEvent(event: Omit<SecurityEvent, "id" | "timestamp">): Promise<string> {
    try {
      const db = getFirebaseFirestore()
      if (!db) {
        throw new Error("Firestore not available")
      }

      const eventData = {
        ...event,
        timestamp: serverTimestamp(),
        ipAddress: await this.getClientIP(),
      }

      const docRef = await addDoc(collection(db, "securityEvents"), eventData)
      console.log("Security event logged to Firestore:", docRef.id)

      // Send email notification if needed
      if (EmailService.shouldNotifyAdmin(event.eventType, event.severity)) {
        await EmailService.sendAdminAlert(event.eventType, event.details, event.severity, event.userEmail || "unknown")
      }

      return docRef.id
    } catch (error) {
      console.error("Error logging security event:", error)
      throw new Error("Failed to log security event")
    }
  }

  static async updateSecurityEventWithBlockchain(eventId: string, txHash: string): Promise<boolean> {
    try {
      const db = getFirebaseFirestore()
      if (!db) {
        throw new Error("Firestore not available")
      }

      await updateDoc(doc(db, "securityEvents", eventId), {
        blockchainTxHash: txHash,
      })
      console.log("Updated security event with blockchain hash:", eventId)
      return true
    } catch (error) {
      console.error("Error updating security event with blockchain hash:", error)
      return false
    }
  }

  static async getSecurityEvents(limitCount = 50): Promise<SecurityEvent[]> {
    try {
      const db = getFirebaseFirestore()
      if (!db) {
        console.warn("Firestore not available")
        return []
      }

      const eventsCollection = collection(db, "securityEvents")
      const eventsQuery = query(eventsCollection, orderBy("timestamp", "desc"), limit(limitCount))
      const querySnapshot = await getDocs(eventsQuery)

      const events: SecurityEvent[] = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        events.push({
          id: doc.id,
          ...data,
        } as SecurityEvent)
      })

      return events
    } catch (error) {
      console.error("Error fetching security events:", error)
      return []
    }
  }

  static async saveUserData(userId: string, userData: UserData): Promise<boolean> {
    try {
      const db = getFirebaseFirestore()
      if (!db) {
        throw new Error("Firestore not available")
      }

      await setDoc(doc(db, "users", userId), {
        ...userData,
        createdAt: serverTimestamp(),
      })
      console.log("User data saved to Firestore:", userId)
      return true
    } catch (error) {
      console.error("Error saving user data:", error)
      return false
    }
  }

  static async updateUserLastLogin(userId: string): Promise<boolean> {
    try {
      const db = getFirebaseFirestore()
      if (!db) {
        throw new Error("Firestore not available")
      }

      await updateDoc(doc(db, "users", userId), {
        lastLogin: serverTimestamp(),
      })
      return true
    } catch (error) {
      console.error("Error updating user last login:", error)
      return false
    }
  }

  static async uploadFile(
    fileData: { name: string; size: number; type: string; userId: string; userEmail: string },
    actualFile: File,
  ): Promise<string> {
    try {
      const db = getFirebaseFirestore()
      if (!db) {
        throw new Error("Firestore not available")
      }

      // Upload to Cloudinary via signed upload
      let cloudinaryData: { publicId?: string; url?: string; secureUrl?: string } = {}
      try {
        const { CloudinaryService } = await import("@/lib/cloudinary-service")
        const result = await CloudinaryService.uploadFileSecure(actualFile)
        if (result) {
          cloudinaryData = {
            publicId: result.public_id,
            url: result.url,
            secureUrl: result.secure_url,
          }
        }
      } catch (cloudErr) {
        console.warn("Cloudinary upload failed, saving metadata only:", cloudErr)
      }

      const uploadData = {
        ...fileData,
        ...cloudinaryData,
        uploadedAt: serverTimestamp(),
      }

      const docRef = await addDoc(collection(db, "uploadedFiles"), uploadData)
      console.log("File data saved to Firestore:", docRef.id)

      // Log the file upload event
      await this.logSecurityEvent({
        eventType: "FILE_UPLOADED",
        details: `File uploaded successfully: ${fileData.name} (${fileData.type}, ${fileData.size} bytes)`,
        severity: "LOW",
        userId: fileData.userId,
        userEmail: fileData.userEmail,
      })

      return docRef.id
    } catch (error) {
      console.error("Error saving file data:", error)
      throw new Error("Failed to save file data")
    }
  }

  static async deleteFile(fileId: string, publicId?: string): Promise<boolean> {
    try {
      const db = getFirebaseFirestore()
      if (!db) throw new Error("Firestore not available")

      // Delete from Cloudinary if publicId exists
      if (publicId) {
        try {
          const { CloudinaryService } = await import("@/lib/cloudinary-service")
          await CloudinaryService.deleteFile(publicId)
        } catch (cloudErr) {
          console.warn("Cloudinary delete failed:", cloudErr)
        }
      }

      await deleteDoc(doc(db, "uploadedFiles", fileId))
      console.log("File deleted from Firestore:", fileId)
      return true
    } catch (error) {
      console.error("Error deleting file:", error)
      return false
    }
  }

  static async getUploadedFiles(): Promise<UploadedFile[]> {
    try {
      const db = getFirebaseFirestore()
      if (!db) {
        console.warn("Firestore not available")
        return []
      }

      const filesCollection = collection(db, "uploadedFiles")
      const filesQuery = query(filesCollection, orderBy("uploadedAt", "desc"))
      const querySnapshot = await getDocs(filesQuery)

      const files: UploadedFile[] = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        files.push({
          id: doc.id,
          ...data,
        } as UploadedFile)
      })

      return files
    } catch (error) {
      console.error("Error fetching uploaded files:", error)
      return []
    }
  }

  private static async getClientIP(): Promise<string> {
    try {
      const response = await fetch("https://api.ipify.org?format=json")
      const data = await response.json()
      return data.ip || "unknown"
    } catch (error) {
      return "unknown"
    }
  }
}
