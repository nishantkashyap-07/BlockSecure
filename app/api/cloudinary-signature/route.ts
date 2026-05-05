import { NextResponse } from "next/server"
import { v2 as cloudinary } from "cloudinary"

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(request: Request) {
  try {
    const { timestamp, folder } = await request.json()

    if (!process.env.CLOUDINARY_API_SECRET) {
      return NextResponse.json({ error: "Cloudinary not configured" }, { status: 500 })
    }

    // Generate signature for secure upload
    const signature = cloudinary.utils.api_sign_request(
      {
        timestamp: timestamp,
        folder: folder || "secureblock",
      },
      process.env.CLOUDINARY_API_SECRET,
    )

    return NextResponse.json({
      signature,
      timestamp,
      api_key: process.env.CLOUDINARY_API_KEY,
    })
  } catch (error) {
    console.error("Error generating Cloudinary signature:", error)
    return NextResponse.json({ error: "Failed to generate signature" }, { status: 500 })
  }
}
