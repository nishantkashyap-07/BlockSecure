"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getRecentEvents } from "@/lib/blockchain"
import { DatabaseService, type SecurityEvent, type UploadedFile } from "@/lib/database"
import { BruteForceProtection } from "@/lib/brute-force-protection"
import { EmailService } from "@/lib/email-service"
import { RefreshCw, Database, Shield, Mail, Trash2, AlertTriangle, Plus, ExternalLink, Search, Download } from "lucide-react"
import { Input } from "@/components/ui/input"

export default function AdminPage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [firestoreEvents, setFirestoreEvents] = useState<SecurityEvent[]>([])
  const [blockchainEvents, setBlockchainEvents] = useState<any[]>([])
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [emailNotifications, setEmailNotifications] = useState<any[]>([])
  const [blockchainLoading, setBlockchainLoading] = useState(false)
  const [blockchainError, setBlockchainError] = useState<string | null>(null)
  const [dbConnected, setDbConnected] = useState(false)
  const [lockedEmails, setLockedEmails] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const router = useRouter()

  useEffect(() => {
    // Check if user is admin
    const isAdmin = localStorage.getItem("isAdmin")
    const adminEmail = localStorage.getItem("adminEmail")

    if (!isAdmin || !adminEmail) {
      router.push("/admin-login")
      return
    }

    setLoading(false)
    initializeData()

    // Set up auto-refresh every 30 seconds
    const interval = setInterval(() => {
      refreshData()
    }, 30000)

    return () => clearInterval(interval)
  }, [router])

  const initializeData = async () => {
    setError(null)
    try {
      // Test database connection first
      const connected = await DatabaseService.testConnection()
      setDbConnected(connected)

      if (connected) {
        await Promise.all([fetchFirestoreEvents(), fetchUploadedFiles(), fetchBlockchainEvents()])
      } else {
        setError("Database connection failed. Please check your Firebase configuration.")
      }

      fetchLockedEmails()
      fetchEmailNotifications()
    } catch (err) {
      console.error("Error initializing data:", err)
      setError(err instanceof Error ? err.message : "Failed to initialize dashboard")
    }
  }

  const refreshData = async () => {
    if (!dbConnected) return

    setRefreshing(true)
    try {
      await Promise.all([fetchFirestoreEvents(), fetchUploadedFiles()])
      fetchLockedEmails()
      fetchEmailNotifications()
    } catch (err) {
      console.error("Error refreshing data:", err)
    } finally {
      setRefreshing(false)
    }
  }

  const fetchFirestoreEvents = async () => {
    try {
      console.log("Fetching security events from Firebase...")
      const events = await DatabaseService.getSecurityEvents(100)
      console.log("Fetched events:", events.length)
      setFirestoreEvents(events)

      if (events.length === 0) {
        console.log("No events found in Firebase. Try triggering some security events first.")
      }
    } catch (error) {
      console.error("Error fetching security events:", error)
      setFirestoreEvents([])
    }
  }

  const fetchBlockchainEvents = async () => {
    setBlockchainLoading(true)
    setBlockchainError(null)
    try {
      console.log("Fetching blockchain events...")
      const events = await getRecentEvents(20)
      console.log("Blockchain events fetched:", events.length)
      setBlockchainEvents(events)
      if (events.length === 0) {
        setBlockchainError("No events found on blockchain - this is normal if no contract is deployed")
      }
    } catch (error) {
      console.error("Error fetching events from blockchain:", error)
      setBlockchainError(error instanceof Error ? error.message : "Failed to fetch blockchain events")
      setBlockchainEvents([])
    } finally {
      setBlockchainLoading(false)
    }
  }

  const fetchUploadedFiles = async () => {
    try {
      console.log("Fetching uploaded files...")
      const files = await DatabaseService.getUploadedFiles()
      console.log("Fetched files:", files.length)
      setUploadedFiles(files)
    } catch (error) {
      console.error("Error fetching uploaded files:", error)
      setUploadedFiles([])
    }
  }

  const fetchLockedEmails = () => {
    try {
      const locked = BruteForceProtection.getAllLockedEmails()
      console.log("Locked emails:", locked.length)
      setLockedEmails(locked)
    } catch (error) {
      console.error("Error fetching locked emails:", error)
      setLockedEmails([])
    }
  }

  const fetchEmailNotifications = () => {
    try {
      const notifications = EmailService.getStoredNotifications()
      console.log("Email notifications:", notifications.length)
      setEmailNotifications(notifications)
    } catch (error) {
      console.error("Error fetching email notifications:", error)
      setEmailNotifications([])
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("isAdmin")
    localStorage.removeItem("adminEmail")
    router.push("/admin-login")
  }

  const exportEventsCSV = () => {
    const headers = ["Event Type", "Severity", "User Email", "User ID", "Details", "Time", "Blockchain TX"]
    const rows = firestoreEvents.map((e) => [
      e.eventType,
      e.severity,
      e.userEmail || "Unknown",
      e.userId,
      `"${(e.details || "").replace(/"/g, '""')}"`,
      formatTimestamp(e.timestamp),
      e.blockchainTxHash || "None",
    ])
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `security-events-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const filteredEvents = firestoreEvents.filter((e) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      e.eventType.toLowerCase().includes(q) ||
      (e.userEmail || "").toLowerCase().includes(q) ||
      e.severity.toLowerCase().includes(q) ||
      (e.details || "").toLowerCase().includes(q)
    )
  })

  const getSeverityColor = (severity: string) => {
    switch (severity.toUpperCase()) {
      case "HIGH":
        return "destructive"
      case "MEDIUM":
        return "secondary"
      case "LOW":
        return "secondary"
      default:
        return "secondary"
    }
  }

  const getSeverityBadgeClass = (severity: string) => {
    switch (severity.toUpperCase()) {
      case "HIGH":
        return "bg-red-100 text-red-800 border-red-200"
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "LOW":
        return "bg-green-100 text-green-800 border-green-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const unlockEmail = (email: string) => {
    BruteForceProtection.clearAttempts(email)
    fetchLockedEmails()
  }

  const clearNotifications = () => {
    EmailService.clearNotifications()
    setEmailNotifications([])
  }

  const addTestEvent = async () => {
    try {
      console.log("Adding test security event...")

      // Create a test event directly through the API
      const response = await fetch("/api/log-security-event", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventType: "ADMIN_TEST_EVENT",
          details: `Test security event created by admin at ${new Date().toLocaleString()}`,
          severity: "MEDIUM",
          userId: "admin_test",
          userEmail: "admin@secureblock.com",
        }),
      })

      if (response.ok) {
        console.log("Test event created successfully")
        // Refresh the events immediately
        await fetchFirestoreEvents()
        fetchEmailNotifications()
      } else {
        console.error("Failed to create test event")
      }
    } catch (error) {
      console.error("Error adding test event:", error)
    }
  }

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return "Unknown"

    if (timestamp.toDate) {
      return timestamp.toDate().toLocaleString()
    }

    if (timestamp instanceof Date) {
      return timestamp.toLocaleString()
    }

    return new Date(timestamp).toLocaleString()
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-4 lg:px-6 h-14 flex items-center border-b">
        <div className="flex items-center justify-center">
          <Shield className="h-6 w-6 text-red-600 mr-2" />
          <span className="text-lg font-bold">SecureBlock Admin Dashboard</span>
        </div>
        <div className="ml-4 flex items-center gap-2">
          {dbConnected ? (
            <Badge className="bg-green-100 text-green-800">
              <Database className="h-3 w-3 mr-1" />
              DB Connected
            </Badge>
          ) : (
            <Badge variant="destructive">
              <Database className="h-3 w-3 mr-1" />
              DB Offline
            </Badge>
          )}
          {emailNotifications.length > 0 && (
            <Badge variant="destructive" className="bg-red-100 text-red-800">
              <Mail className="h-3 w-3 mr-1" />
              {emailNotifications.length} Alerts
            </Badge>
          )}
          {refreshing && (
            <Badge variant="secondary">
              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
              Refreshing...
            </Badge>
          )}
        </div>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Button variant="outline" size="sm" onClick={refreshData} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh All
          </Button>
          <Button variant="ghost" onClick={handleLogout}>
            Logout
          </Button>
        </nav>
      </header>

      <main className="flex-1 p-4 md:p-6">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!dbConnected && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>
              Database connection failed. Please check your Firebase configuration in lib/firebase.ts
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="events" className="space-y-4">
          <TabsList>
            <TabsTrigger value="events">Security Events ({firestoreEvents.length})</TabsTrigger>
            <TabsTrigger value="notifications">
              Email Notifications {emailNotifications.length > 0 && `(${emailNotifications.length})`}
            </TabsTrigger>
            <TabsTrigger value="blockchain">Blockchain Events {blockchainError && "⚠️"}</TabsTrigger>
            <TabsTrigger value="files">Uploaded Files ({uploadedFiles.length})</TabsTrigger>
            <TabsTrigger value="locked">Locked Accounts ({lockedEmails.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="events">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Security Events ({filteredEvents.length}{searchQuery ? ` of ${firestoreEvents.length}` : ""})
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={exportEventsCSV} disabled={firestoreEvents.length === 0}>
                      <Download className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                    <Button variant="outline" size="sm" onClick={addTestEvent}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Test Event
                    </Button>
                    <Button variant="outline" size="sm" onClick={fetchFirestoreEvents}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                  </div>
                </CardTitle>
                <CardDescription>
                  Real-time security events from Firebase {dbConnected ? "(Connected)" : "(Offline)"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {firestoreEvents.length > 0 && (
                  <div className="flex items-center gap-2 mb-4">
                    <Search className="h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search by event type, email, severity..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="max-w-sm"
                    />
                  </div>
                )}
                {filteredEvents.length > 0 ? (
                  <div className="space-y-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Event Type</TableHead>
                          <TableHead>Severity</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>Details</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead>Blockchain</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredEvents.map((event) => (
                          <TableRow key={event.id}>
                            <TableCell className="font-medium">{event.eventType}</TableCell>
                            <TableCell>
                              <Badge className={getSeverityBadgeClass(event.severity)}>{event.severity}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div>{event.userEmail || "Unknown"}</div>
                                <div className="text-gray-500 text-xs">{event.userId}</div>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-xs truncate" title={event.details}>
                              {event.details}
                            </TableCell>
                            <TableCell className="text-sm">{formatTimestamp(event.timestamp)}</TableCell>
                            <TableCell>
                              {event.blockchainTxHash ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    window.open(`https://sepolia.etherscan.io/tx/${event.blockchainTxHash}`, "_blank")
                                  }
                                >
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  View
                                </Button>
                              ) : (
                                <span className="text-gray-400 text-sm">None</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Database className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {searchQuery ? "No matching events" : "No Security Events Found"}
                    </h3>
                    <p className="text-gray-500 mb-4">
                      {searchQuery
                        ? `No events match "${searchQuery}". Try a different search term.`
                        : dbConnected
                        ? "No security events have been logged yet. Try triggering some events from the user dashboard."
                        : "Database is offline. Please check your Firebase configuration."}
                    </p>
                    {!searchQuery && (
                      <div className="space-y-2 text-sm text-gray-400">
                        <p>• Go to user dashboard and try SQL injection: <code>' OR 1=1 --</code></p>
                        <p>• Upload a malicious file like <code>virus.exe</code></p>
                        <p>• Make multiple failed login attempts</p>
                      </div>
                    )}
                    {dbConnected && !searchQuery && (
                      <Button onClick={addTestEvent} className="mt-4">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Test Event
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Email Notifications ({emailNotifications.length})
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={fetchEmailNotifications}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                    {emailNotifications.length > 0 && (
                      <Button variant="outline" size="sm" onClick={clearNotifications}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Clear All
                      </Button>
                    )}
                  </div>
                </CardTitle>
                <CardDescription>Email alerts sent to administrators</CardDescription>
              </CardHeader>
              <CardContent>
                {emailNotifications.length > 0 ? (
                  <div className="space-y-4">
                    {emailNotifications.map((notification) => (
                      <div key={notification.id} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium">{notification.subject}</h4>
                          <Badge className={getSeverityBadgeClass(notification.priority)}>
                            {notification.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          To: {notification.to} • {new Date(notification.timestamp).toLocaleString()}
                        </p>
                        <div className="text-sm bg-gray-50 p-3 rounded border whitespace-pre-wrap">
                          {notification.body}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Mail className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Email Notifications</h3>
                    <p className="text-gray-500">Email alerts will appear here when security events are triggered</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="blockchain">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Blockchain Events ({blockchainEvents.length})
                  </div>
                  <Button variant="outline" size="sm" onClick={fetchBlockchainEvents} disabled={blockchainLoading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${blockchainLoading ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                </CardTitle>
                <CardDescription>
                  Security events logged to the Ethereum blockchain for immutable audit trails
                </CardDescription>
              </CardHeader>
              <CardContent>
                
      

                {blockchainLoading ? (
                  <div className="text-center py-8">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <p>Loading blockchain events...</p>
                  </div>
                ) : blockchainEvents.length > 0 ? (
                  <div className="space-y-4">
                    {blockchainEvents.map((event, index) => (
                      <div key={event.id || index} className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium">{event.eventType}</h4>
                          <Badge variant={getSeverityColor(event.severity)}>{event.severity}</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{event.details}</p>
                        <div className="text-xs text-gray-500 space-y-1">
                          <p>User ID: {event.userId}</p>
                          <p>Timestamp: {event.timestamp?.toLocaleString() || "Unknown"}</p>
                          <p>Blockchain TX: {event.blockchainTxHash || event.id}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No blockchain events found</p>
                    <p className="text-xs mt-1">
                      Events will appear here when they are successfully logged to the blockchain
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="files">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Uploaded Files ({uploadedFiles.length})
                  </div>
                  <Button variant="outline" size="sm" onClick={fetchUploadedFiles}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </CardTitle>
                <CardDescription>Files uploaded through the system</CardDescription>
              </CardHeader>
              <CardContent>
                {uploadedFiles.length > 0 ? (
                  <div className="space-y-4">
                    {uploadedFiles.map((file) => (
                      <div key={file.id} className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium">{file.name}</h4>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{file.type}</Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700 h-6 w-6 p-0"
                              onClick={async () => {
                                if (!confirm("Delete this file?")) return
                                const { DatabaseService: DS } = await import("@/lib/database")
                                const ok = await DS.deleteFile(file.id!, file.publicId)
                                if (ok) setUploadedFiles((prev) => prev.filter((f) => f.id !== file.id))
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">Size: {formatFileSize(file.size)}</p>
                        <div className="text-xs text-gray-500 space-y-1">
                          <p>Uploaded by: {file.userEmail} | User ID: {file.userId}</p>
                          <p>Time: {file.uploadedAt?.toDate?.()?.toLocaleString() || "Unknown"}</p>
                          {file.publicId && <p>Cloudinary ID: {file.publicId}</p>}
                          {file.blockchainTxHash && <p>Blockchain TX: {file.blockchainTxHash}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No files uploaded yet</p>
                    <p className="text-xs mt-1">Files uploaded through the dashboard will appear here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="locked">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Locked Accounts ({lockedEmails.length})
                  </div>
                  <Button variant="outline" size="sm" onClick={fetchLockedEmails}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </CardTitle>
                <CardDescription>Accounts locked due to brute force attempts</CardDescription>
              </CardHeader>
              <CardContent>
                {lockedEmails.length > 0 ? (
                  <div className="space-y-4">
                    {lockedEmails.map((email) => (
                      <div key={email} className="flex justify-between items-center p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">{email}</p>
                          <p className="text-sm text-gray-500">Account locked due to multiple failed login attempts</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => unlockEmail(email)}>
                          Unlock
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No locked accounts</p>
                    <p className="text-xs mt-1">Accounts locked due to brute force attempts will appear here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
