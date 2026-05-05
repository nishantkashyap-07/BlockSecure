"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { onAuthStateChanged, signOut } from "firebase/auth"
import { getFirebaseAuth } from "@/lib/firebase"
import { detectSqlInjection, isFileTypeAllowed } from "@/lib/security"
import { BlockchainStatus } from "@/components/blockchain-status"
import { DatabaseService, type UploadedFile } from "@/lib/database"
import { BruteForceProtection } from "@/lib/brute-force-protection"
import { FileViewer } from "@/components/file-viewer"
import { EyeIcon } from "@/components/icons"
import { CloudinaryService } from "@/lib/cloudinary-service"
import { Trash2 } from "lucide-react"

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sqlQuery, setSqlQuery] = useState("")
  const [queryResult, setQueryResult] = useState("")
  const [queryError, setQueryError] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState("")
  const [uploadSuccess, setUploadSuccess] = useState("")
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [dbConnected, setDbConnected] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getFirebaseAuth()!, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser)
        setLoading(false)

        // Test database connection
        const connected = await DatabaseService.testConnection()
        setDbConnected(connected)

        if (connected) {
          await fetchUploadedFiles()
        } else {
          console.warn("Database not connected - some features may not work")
        }
      } else {
        // User is not authenticated, redirect to login
        router.push("/login")
      }
    })

    return () => unsubscribe()
  }, [router])

  const fetchUploadedFiles = async () => {
    try {
      const files = await DatabaseService.getUploadedFiles()
      setUploadedFiles(files)
    } catch (error) {
      console.error("Error fetching uploaded files:", error)
    }
  }

  const handleDeleteFile = async (fileId: string, publicId?: string) => {
    if (!confirm("Are you sure you want to delete this file?")) return
    try {
      const success = await DatabaseService.deleteFile(fileId, publicId)
      if (success) {
        setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId))
      }
    } catch (error) {
      console.error("Error deleting file:", error)
    }
  }

  const handleLogout = async () => {
    try {
      await signOut(getFirebaseAuth()!)
      // Clear any stored login attempts on logout
      if (user?.email) {
        BruteForceProtection.clearAttempts(user.email)
      }
      router.push("/login")
    } catch (error) {
      console.error("Error logging out:", error)
    }
  }

  const handleSqlQuery = async () => {
    setQueryError("")
    setQueryResult("")

    if (!sqlQuery.trim()) {
      setQueryError("Please enter a query")
      return
    }

    // Check for SQL injection
    if (detectSqlInjection(sqlQuery)) {
      setQueryError("Potential SQL injection detected. Query blocked.")

      // Log this suspicious activity
      if (dbConnected) {
        await DatabaseService.logSecurityEvent({
          eventType: "SQL_INJECTION_ATTEMPT",
          details: `SQL injection attempt in query execution: "${sqlQuery}"`,
          severity: "MEDIUM",
          userId: user?.uid || "unknown",
          userEmail: user?.email || "unknown",
        })
      }

      // Also log to blockchain via API
      try {
        await fetch("/api/log-security-event", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            eventType: "SQL_INJECTION_ATTEMPT",
            details: `SQL injection attempt in query execution: "${sqlQuery}"`,
            severity: "MEDIUM",
            userId: user?.uid || "unknown",
            userEmail: user?.email || "unknown",
          }),
        })
      } catch (error) {
        console.error("Error logging security event:", error)
      }

      return
    }
    try {
      // Simulate query execution with data
      const sampleResults = [
        { id: 1, name: "Nishant Kashyap", email: "kashyapnishant144@gmail.com", role: "user" },
        { id: 2, name: "Kevin Kashung", email: "itskevin@gmail.com", role: "user" },
        { id: 3, name: "Rishan", email: "rishanwonka@gmail.com", role: "user" },
      ]

      setQueryResult(
        `Query executed successfully: "${sqlQuery}"\n\nSample Results:\n${JSON.stringify(sampleResults, null, 2)}`,
      )

      // Log successful query execution
      if (dbConnected) {
        await DatabaseService.logSecurityEvent({
          eventType: "SQL_QUERY_EXECUTED",
          details: `Safe SQL query executed: "${sqlQuery}"`,
          severity: "LOW",
          userId: user?.uid || "unknown",
          userEmail: user?.email || "unknown",
        })
      }
    } catch (error: any) {
      setQueryError(error.message || "Error executing query")
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0]
      setFile(selectedFile)
      setFileError("")
      setUploadSuccess("")
    }
  }

  const handleFileUpload = async () => {
    setFileError("")
    setUploadSuccess("")

    if (!file) {
      setFileError("Please select a file to upload")
      return
    }

    // Check if file type is allowed
    if (!isFileTypeAllowed(file.name)) {
      setFileError("This file type is not allowed for security reasons")

      // Log this suspicious activity
      if (dbConnected) {
        await DatabaseService.logSecurityEvent({
          eventType: "UNAUTHORIZED_FILE_UPLOAD",
          details: `Attempted to upload unauthorized file: ${file.name}`,
          severity: "HIGH",
          userId: user?.uid || "unknown",
          userEmail: user?.email || "unknown",
        })
      }

      return
    }

    try {
      // Upload file with actual file data
      let fileId = null
      if (dbConnected) {
        fileId = await DatabaseService.uploadFile(
          {
            name: file.name,
            size: file.size,
            type: file.type,
            userId: user?.uid || "unknown",
            userEmail: user?.email || "unknown",
          },
          file,
        )
      }

      if (fileId || !dbConnected) {
        setUploadSuccess(`File "${file.name}" uploaded successfully${!dbConnected ? " (database offline)" : ""}`)
        setFile(null)

        // Reset file input
        const fileInput = document.getElementById("file-upload") as HTMLInputElement
        if (fileInput) {
          fileInput.value = ""
        }

        // Refresh the files list if database is connected
        if (dbConnected) {
          await fetchUploadedFiles()
        }
      } else {
        setFileError("Error uploading file to database")
      }
    } catch (error) {
      console.error("Error uploading file:", error)
      setFileError("Error uploading file")
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>
  }

  // If no user, the useEffect will redirect to login
  if (!user) {
    return <div className="flex min-h-screen items-center justify-center">Redirecting to login...</div>
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-4 lg:px-6 h-14 flex items-center border-b">
        <div className="flex items-center justify-center">
          <span className="text-lg font-bold">SecureBlock User Dashboard</span>
        </div>
        <div className="ml-4 flex items-center gap-2">
          <BlockchainStatus />
          {!dbConnected && (
            <Alert className="p-2 h-8 text-xs">
              <AlertDescription>DB Offline</AlertDescription>
            </Alert>
          )}
        </div>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Button variant="ghost" onClick={handleLogout}>
            Logout
          </Button>
        </nav>
      </header>
      <main className="flex-1 p-4 md:p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="col-span-1 md:col-span-2 lg:col-span-3">
            <CardHeader>
              <CardTitle>Welcome to the User Dashboard</CardTitle>
              <CardDescription>
                You are logged in as {user?.email}. You can execute SQL queries and upload files securely.
                {!dbConnected && " (Database offline - some features may not work)"}
              </CardDescription>
            </CardHeader>
          </Card>

          <Tabs defaultValue="sql" className="col-span-1 md:col-span-2 lg:col-span-3">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="sql">SQL Query</TabsTrigger>
              <TabsTrigger value="upload">File Upload</TabsTrigger>
              <TabsTrigger value="files">Uploaded Files</TabsTrigger>
            </TabsList>
            <TabsContent value="sql">
              <Card>
                <CardHeader>
                  <CardTitle>SQL Query Execution</CardTitle>
                  <CardDescription>Enter SQL-like queries to be safely executed</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="sql-query">SQL Query</Label>
                    <Textarea
                      id="sql-query"
                      placeholder="SELECT * FROM users WHERE id = 1"
                      value={sqlQuery}
                      onChange={(e) => setSqlQuery(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleSqlQuery}>Execute Query</Button>

                  {queryError && (
                    <Alert variant="destructive">
                      <AlertDescription>{queryError}</AlertDescription>
                    </Alert>
                  )}

                  {queryResult && (
                    <div className="p-4 border rounded-md bg-gray-50 dark:bg-gray-800">
                      <pre className="whitespace-pre-wrap text-sm">{queryResult}</pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="upload">
              <Card>
                <CardHeader>
                  <CardTitle>Secure File Upload</CardTitle>
                  <CardDescription>Upload files securely with protection against malicious files</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="file-upload">Select File</Label>
                    <Input id="file-upload" type="file" onChange={handleFileChange} />
                    <p className="text-sm text-gray-500">
                      Allowed file types: .jpg, .jpeg, .png, .pdf, .doc, .docx, .txt, .csv
                    </p>
                  </div>
                  <Button onClick={handleFileUpload}>Upload File</Button>

                  {fileError && (
                    <Alert variant="destructive">
                      <AlertDescription>{fileError}</AlertDescription>
                    </Alert>
                  )}

                  {uploadSuccess && (
                    <Alert>
                      <AlertDescription>{uploadSuccess}</AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="files">
              <Card>
                <CardHeader>
                  <CardTitle>Uploaded Files</CardTitle>
                  <CardDescription>
                    View all files uploaded to the system
                    {!dbConnected && " (Database offline - showing cached data)"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {uploadedFiles.length > 0 ? (
                    <div className="space-y-4">
                      {uploadedFiles.map((file) => (
                        <div key={file.id} className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xl">{CloudinaryService.getFileIcon(file.type)}</span>
                                <h4 className="font-medium">{file.name}</h4>
                                {(file.secureUrl || file.url) && (
                                  <FileViewer
                                    file={{
                                      id: file.id || "",
                                      name: file.name,
                                      size: file.size,
                                      type: file.type,
                                      url: file.url,
                                      secureUrl: file.secureUrl,
                                      publicId: file.publicId,
                                      userId: file.userId,
                                      userEmail: file.userEmail || "Unknown",
                                      uploadedAt: file.uploadedAt?.toDate ? file.uploadedAt.toDate() : new Date(),
                                    }}
                                  >
                                    <Button variant="outline" size="sm">
                                      <EyeIcon className="h-4 w-4 mr-2" />
                                      View
                                    </Button>
                                  </FileViewer>
                                )}
                              </div>
                              <p className="text-sm text-gray-500">
                                Size: {formatFileSize(file.size)} | Type: {file.type}
                              </p>
                              <p className="text-sm text-gray-500">
                                Uploaded by: {file.userEmail || "Unknown"} | User ID: {file.userId}
                              </p>
                              <p className="text-sm text-gray-500">
                                Date: {file.uploadedAt?.toDate ? file.uploadedAt.toDate().toLocaleString() : "Unknown"}
                              </p>
                              {file.publicId && <p className="text-sm text-gray-500">Cloudinary ID: {file.publicId}</p>}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700 ml-2"
                              onClick={() => handleDeleteFile(file.id!, file.publicId)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500">
                      {dbConnected ? "No files uploaded yet" : "Database offline - cannot load files"}
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
