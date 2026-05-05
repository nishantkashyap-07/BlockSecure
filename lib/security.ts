/**
 * Detects potential SQL injection in a string
 */
export function detectSqlInjection(input: string): boolean {
  if (!input) return false

  // Common SQL injection patterns
  const sqlPatterns = [
    /(\s|^)(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|EXEC|UNION|CREATE|WHERE)(\s|$)/i,
    /(\s|^)(OR|AND)(\s+)(['"]?\w+['"]?\s*=\s*['"]?\w+['"]?)/i,
    /['"];/i,
    /--/,
    /\/\*/,
    /\*\//,
    /xp_/i,
    /SLEEP$$\d+$$/i,
    /BENCHMARK$$\d+,\w+$$/i,
    /WAITFOR DELAY/i,
  ]

  return sqlPatterns.some((pattern) => pattern.test(input))
}

/**
 * Checks if a file type is allowed for upload
 */
export function isFileTypeAllowed(filename: string): boolean {
  if (!filename) return false

  // Get file extension
  const extension = filename.split(".").pop()?.toLowerCase() || ""

  // List of allowed file extensions
  const allowedExtensions = ["jpg", "jpeg", "png", "gif", "pdf", "doc", "docx", "xls", "xlsx", "txt", "csv"]

  // List of explicitly blocked extensions (high-risk file types)
  const blockedExtensions = [
    "exe",
    "bat",
    "cmd",
    "sh",
    "js",
    "php",
    "html",
    "htm",
    "asp",
    "aspx",
    "jsp",
    "dll",
    "msi",
    "vbs",
    "ps1",
    "py",
    "rb",
    "pl",
  ]

  // Block explicitly dangerous extensions
  if (blockedExtensions.includes(extension)) {
    return false
  }

  // Only allow explicitly permitted extensions
  return allowedExtensions.includes(extension)
}
