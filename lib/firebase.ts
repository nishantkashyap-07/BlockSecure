import { initializeApp, getApps, type FirebaseApp } from "firebase/app"
import { getAuth, type Auth } from "firebase/auth"
import { getFirestore, doc, getDoc, type Firestore } from "firebase/firestore"
import { getStorage, type FirebaseStorage } from "firebase/storage"

// ✅ Correct Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDk84yQSpGJVzUuo4n_aaIeSa_HV27WEYw",
  authDomain: "websecurity-a83f7.firebaseapp.com",
  projectId: "websecurity-a83f7",
  storageBucket: "websecurity-a83f7.appspot.com", 
  messagingSenderId: "993553214957",
  appId: "1:993553214957:web:68d5dbc0698329c6740be4",
  measurementId: "G-E8XEX93EJJ",
}

// 🔄 Firebase instance holders
let firebaseApp: FirebaseApp | null = null
let firebaseAuth: Auth | null = null
let firebaseDb: Firestore | null = null
let firebaseStorage: FirebaseStorage | null = null
let initializationError: string | null = null
let isInitialized = false

// ✅ Initialize Firebase
function initializeFirebaseApp(): FirebaseApp | null {
  try {
    if (firebaseApp && isInitialized) return firebaseApp

    const existingApps = getApps()
    if (existingApps.length > 0) {
      firebaseApp = existingApps[0]
      isInitialized = true
      console.log("✅ Using existing Firebase app")
      return firebaseApp
    }

    firebaseApp = initializeApp(firebaseConfig)
    isInitialized = true
    console.log("✅ Firebase app initialized")
    return firebaseApp
  } catch (error) {
    console.error("❌ Firebase app initialization error:", error)
    initializationError = error instanceof Error ? error.message : "Unknown Firebase error"
    isInitialized = false
    return null
  }
}

// ✅ Get Firebase Auth
export function getFirebaseAuth(): Auth | null {
  try {
    if (firebaseAuth) return firebaseAuth

    const app = initializeFirebaseApp()
    if (!app) return null

    firebaseAuth = getAuth(app)
    console.log("✅ Firebase Auth initialized")
    return firebaseAuth
  } catch (error) {
    console.error("❌ Firebase Auth error:", error)
    return null
  }
}

// ✅ Get Firestore
export function getFirebaseFirestore(): Firestore | null {
  try {
    if (firebaseDb) return firebaseDb

    const app = initializeFirebaseApp()
    if (!app) return null

    firebaseDb = getFirestore(app)
    console.log("✅ Firebase Firestore initialized")
    return firebaseDb
  } catch (error) {
    console.error("❌ Firestore init error:", error)
    return null
  }
}

// ✅ Get Firebase Storage
export function getFirebaseStorage(): FirebaseStorage | null {
  try {
    if (firebaseStorage) return firebaseStorage

    const app = initializeFirebaseApp()
    if (!app) return null

    firebaseStorage = getStorage(app)
    console.log("✅ Firebase Storage initialized")
    return firebaseStorage
  } catch (error) {
    console.error("❌ Storage init error:", error)
    return null
  }
}

// ✅ Check if Firebase config is valid
export function isFirebaseConfigured(): boolean {
  try {
    if (
      firebaseConfig.apiKey === "your-api-key" ||
      firebaseConfig.projectId === "your-project-id" ||
      !firebaseConfig.apiKey ||
      !firebaseConfig.projectId
    ) {
      console.warn("⚠️ Firebase config has placeholder values")
      return false
    }

    const app = initializeFirebaseApp()
    return app !== null && isInitialized
  } catch (error) {
    console.error("❌ Firebase config check failed:", error)
    return false
  }
}

// ✅ Test Firestore connectivity
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const firestore = getFirebaseFirestore()
    if (!firestore) {
      console.warn("⚠️ Firestore not available")
      return false
    }

    const testDocRef = doc(firestore, "test", "connection")
    const snapshot = await getDoc(testDocRef)

    console.log("✅ Firestore test successful:", snapshot.exists())
    return true
  } catch (error) {
    console.error("❌ Firestore test failed:", error)
    return false
  }
}

// ✅ Return any Firebase initialization error
export function getFirebaseError(): string | null {
  return initializationError
}

// ✅ Auto-initialize on frontend
if (typeof window !== "undefined") {
  initializeFirebaseApp()
}

export default firebaseApp
