/**
 * Cloudinary Service for file uploads and management
 */

export interface CloudinaryUploadResult {
  public_id: string
  secure_url: string
  url: string
  format: string
  resource_type: string
  bytes: number
}

export class CloudinaryService {
  private static cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  private static uploadPreset = "secureblock_uploads" // You need to create this in Cloudinary

  /**
   * Upload file to Cloudinary using unsigned upload
   */
  static async uploadFile(file: File): Promise<CloudinaryUploadResult | null> {
    try {
      if (!this.cloudName) {
        console.error("Cloudinary cloud name not configured")
        return null
      }

      console.log("Uploading file to Cloudinary:", file.name)

      const formData = new FormData()
      formData.append("file", file)
      formData.append("upload_preset", this.uploadPreset)
      formData.append("folder", "secureblock") // Optional: organize files in folders

      const response = await fetch(`https://api.cloudinary.com/v1_1/${this.cloudName}/upload`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Cloudinary upload failed:", response.status, errorText)
        throw new Error(`Upload failed: ${response.status} ${errorText}`)
      }

      const result = await response.json()
      console.log("Cloudinary upload successful:", result.public_id)

      return {
        public_id: result.public_id,
        secure_url: result.secure_url,
        url: result.url,
        format: result.format,
        resource_type: result.resource_type,
        bytes: result.bytes,
      }
    } catch (error) {
      console.error("Cloudinary upload error:", error)
      throw error
    }
  }

  /**
   * Upload file with signed upload (server-side) - More secure
   */
  static async uploadFileSecure(file: File): Promise<CloudinaryUploadResult | null> {
    try {
      if (!this.cloudName) {
        console.error("Cloudinary cloud name not configured")
        return null
      }

      console.log("Uploading file to Cloudinary (secure):", file.name)

      // First, get a signature from your API route
      const signatureResponse = await fetch("/api/cloudinary-signature", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          timestamp: Math.round(new Date().getTime() / 1000),
          folder: "secureblock",
        }),
      })

      if (!signatureResponse.ok) {
        throw new Error("Failed to get upload signature")
      }

      const { signature, timestamp, api_key } = await signatureResponse.json()

      // Upload to Cloudinary with signature
      const formData = new FormData()
      formData.append("file", file)
      formData.append("signature", signature)
      formData.append("timestamp", timestamp.toString())
      formData.append("api_key", api_key)
      formData.append("folder", "secureblock")

      const response = await fetch(`https://api.cloudinary.com/v1_1/${this.cloudName}/upload`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Cloudinary secure upload failed:", response.status, errorText)
        throw new Error(`Secure upload failed: ${response.status} ${errorText}`)
      }

      const result = await response.json()
      console.log("Cloudinary secure upload successful:", result.public_id)

      return {
        public_id: result.public_id,
        secure_url: result.secure_url,
        url: result.url,
        format: result.format,
        resource_type: result.resource_type,
        bytes: result.bytes,
      }
    } catch (error) {
      console.error("Cloudinary secure upload error:", error)
      return null
    }
  }

  /**
   * Delete file from Cloudinary
   */
  static async deleteFile(publicId: string): Promise<boolean> {
    try {
      const response = await fetch("/api/cloudinary-delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ publicId }),
      })

      return response.ok
    } catch (error) {
      console.error("Cloudinary delete error:", error)
      return false
    }
  }

  /**
   * Get file icon based on MIME type
   */
  static getFileIcon(mimeType: string): string {
    if (mimeType.startsWith("image/")) return "🖼️"
    if (mimeType.startsWith("video/")) return "🎥"
    if (mimeType.startsWith("audio/")) return "🎵"
    if (mimeType === "application/pdf") return "📄"
    if (mimeType.includes("document") || mimeType.includes("word")) return "📝"
    if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return "📊"
    if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return "📈"
    if (mimeType.startsWith("text/")) return "📄"
    if (mimeType.includes("zip") || mimeType.includes("archive")) return "📦"
    return "📁"
  }

  /**
   * Check if file type is supported
   */
  static isSupportedFileType(mimeType: string): boolean {
    const supportedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "text/plain",
      "text/csv",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ]

    return supportedTypes.includes(mimeType)
  }

  /**
   * Generate optimized image URL
   */
  static getOptimizedImageUrl(
    publicId: string,
    options: {
      width?: number
      height?: number
      quality?: string
      format?: string
    } = {},
  ): string {
    if (!this.cloudName) return ""

    const { width, height, quality = "auto", format = "auto" } = options

    let transformations = `q_${quality},f_${format}`

    if (width) transformations += `,w_${width}`
    if (height) transformations += `,h_${height}`

    return `https://res.cloudinary.com/${this.cloudName}/image/upload/${transformations}/${publicId}`
  }

  /**
   * Check if Cloudinary is configured
   */
  static isConfigured(): boolean {
    return !!this.cloudName && this.cloudName !== "your_cloud_name"
  }
}
