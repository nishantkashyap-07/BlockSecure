"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ExternalLink, Download } from "lucide-react"

interface FileViewerProps {
  file: {
    id: string
    name: string
    size: number
    type: string
    url?: string
    secureUrl?: string
    publicId?: string
    userId: string
    userEmail: string
    uploadedAt: Date
  }
  children: React.ReactNode
}

export function FileViewer({ file, children }: FileViewerProps) {
  const [isOpen, setIsOpen] = useState(false)

  const isImage = file.type.startsWith("image/")
  const isPdf = file.type === "application/pdf"
  const isText = file.type.startsWith("text/") || file.type === "application/json"

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const handleDownload = () => {
    if (file.url || file.secureUrl) {
      const link = document.createElement("a")
      link.href = file.secureUrl || file.url || ""
      link.download = file.name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{file.name}</span>
            <div className="flex gap-2">
              {(file.url || file.secureUrl) && (
                <>
                  <Button variant="outline" size="sm" onClick={handleDownload}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href={file.secureUrl || file.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open
                    </a>
                  </Button>
                </>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Info */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <strong>Size:</strong> {formatFileSize(file.size)}
            </div>
            <div>
              <strong>Type:</strong> {file.type}
            </div>
            <div>
              <strong>Uploaded by:</strong> {file.userEmail}
            </div>
            <div>
              <strong>Upload date:</strong> {file.uploadedAt.toLocaleString()}
            </div>
          </div>

          {/* File Preview */}
          <div className="border rounded-lg p-4">
            {isImage && (file.url || file.secureUrl) ? (
              <img
                src={file.secureUrl || file.url}
                alt={file.name}
                className="max-w-full h-auto rounded"
                style={{ maxHeight: "500px" }}
              />
            ) : isPdf && (file.url || file.secureUrl) ? (
              <iframe src={file.secureUrl || file.url} className="w-full h-96 border rounded" title={file.name} />
            ) : isText && (file.url || file.secureUrl) ? (
              <div className="bg-gray-100 p-4 rounded font-mono text-sm">
                <p>Text file preview not available. Click "Open" to view the file.</p>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>Preview not available for this file type.</p>
                <p>Click "Download" or "Open" to access the file.</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
