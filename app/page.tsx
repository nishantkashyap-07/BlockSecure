import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Shield, Lock } from "lucide-react"
import { SystemStatus } from "@/components/system-status"

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-4 lg:px-6 h-14 flex items-center border-b">
        <Link className="flex items-center justify-center" href="/">
          <Shield className="h-6 w-6 text-green-600" />
          <span className="ml-2 text-lg font-bold">SecureBlock</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Link className="text-sm font-medium hover:underline underline-offset-4" href="/login">
            Login
          </Link>
          <Link className="text-sm font-medium hover:underline underline-offset-4" href="/register">
            Register
          </Link>
          <Link
            className="text-sm font-medium hover:underline underline-offset-4 text-red-600 flex items-center gap-1"
            href="/admin-login"
          >
            <Lock className="h-3 w-3" />
            Admin
          </Link>
        </nav>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                  Blockchain-Powered Security
                </h1>
                <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                  Detect and prevent malicious user activity with tamper-proof blockchain logging and real-time admin
                  notifications
                </p>
              </div>
              <div className="space-x-4">
                <Link href="/register">
                  <Button>Get Started</Button>
                </Link>
                <Link href="/admin-login">
                  <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50">
                    <Lock className="h-4 w-4 mr-2" />
                    Admin Access
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* System Status Section */}
        <section className="w-full py-12 md:py-16 bg-gray-50 dark:bg-gray-900">
          <div className="container px-4 md:px-6 mx-auto">
            <SystemStatus />
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32 bg-gray-100 dark:bg-gray-800">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="grid gap-6 lg:grid-cols-4 lg:gap-12">
              <div className="flex flex-col justify-center space-y-4">
                <div className="inline-block rounded-lg bg-gray-100 p-2 dark:bg-gray-800">
                  <Shield className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-xl font-bold">SQL Injection Protection</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Detect and block SQL injection attempts with real-time blockchain logging.
                </p>
              </div>
              <div className="flex flex-col justify-center space-y-4">
                <div className="inline-block rounded-lg bg-gray-100 p-2 dark:bg-gray-800">
                  <Shield className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-xl font-bold">Secure File Uploads</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Block unauthorized file uploads with immutable audit trails.
                </p>
              </div>
              <div className="flex flex-col justify-center space-y-4">
                <div className="inline-block rounded-lg bg-gray-100 p-2 dark:bg-gray-800">
                  <Shield className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-xl font-bold">Blockchain Logging</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  All activities logged to Ethereum blockchain for tamper-proof auditing.
                </p>
              </div>
              <div className="flex flex-col justify-center space-y-4">
                <div className="inline-block rounded-lg bg-gray-100 p-2 dark:bg-gray-800">
                  <Shield className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-xl font-bold">Admin Notifications</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Instant email alerts to administrators for all malicious activities.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Blockchain Explanation Section */}
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center space-y-8 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  Why Blockchain for Security?
                </h2>
                <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                  Understanding the role of blockchain in our security architecture
                </p>
              </div>

              <div className="grid gap-6 lg:grid-cols-3 lg:gap-12 max-w-5xl">
                <div className="flex flex-col items-center space-y-4 p-6 border rounded-lg">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-2xl font-bold text-blue-600">1</span>
                  </div>
                  <h3 className="text-xl font-bold">Immutable Audit Trail</h3>
                  <p className="text-gray-500 text-center">
                    Once logged to blockchain, security events cannot be altered or deleted, ensuring complete audit
                    integrity.
                  </p>
                </div>

                <div className="flex flex-col items-center space-y-4 p-6 border rounded-lg">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                    <span className="text-2xl font-bold text-green-600">2</span>
                  </div>
                  <h3 className="text-xl font-bold">Decentralized Verification</h3>
                  <p className="text-gray-500 text-center">
                    Security logs are verified by the Ethereum network, preventing single points of failure or
                    tampering.
                  </p>
                </div>

                <div className="flex flex-col items-center space-y-4 p-6 border rounded-lg">
                  <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                    <span className="text-2xl font-bold text-purple-600">3</span>
                  </div>
                  <h3 className="text-xl font-bold">Compliance & Trust</h3>
                  <p className="text-gray-500 text-center">
                    Blockchain provides cryptographic proof of security events for regulatory compliance and stakeholder
                    trust.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-gray-500 dark:text-gray-400"> </p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            
          </Link>
          <Link className="text-xs hover:underline underline-offset-4" href="#">
           
          </Link>
        </nav>
      </footer>
    </div>
  )
}
