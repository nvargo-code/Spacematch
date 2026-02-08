import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

// Helper to extract typed value from Firestore REST field
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractValue(field: any): any {
  if (!field) return null;
  if ("stringValue" in field) return field.stringValue;
  if ("integerValue" in field) return parseInt(field.integerValue, 10);
  if ("booleanValue" in field) return field.booleanValue;
  if ("timestampValue" in field) return field.timestampValue;
  if ("nullValue" in field) return null;
  return null;
}

/**
 * GET /api/user?uid={uid} — Fetch user document via Firestore REST API
 */
export async function GET(request: NextRequest) {
  const uid = request.nextUrl.searchParams.get("uid");

  if (!uid) {
    return NextResponse.json({ error: "uid parameter required" }, { status: 400 });
  }

  if (!projectId) {
    return NextResponse.json({ error: "Project ID not configured", user: null }, { status: 500 });
  }

  try {
    const response = await fetch(`${baseUrl}/users/${uid}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (response.status === 404) {
      return NextResponse.json({ user: null });
    }

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Firestore API error: ${response.status}`, details: errorText, user: null },
        { status: response.status }
      );
    }

    const doc = await response.json();
    const fields = doc.fields || {};

    const user = {
      id: uid,
      email: extractValue(fields.email) || "",
      displayName: extractValue(fields.displayName) || "",
      photoURL: extractValue(fields.photoURL) || null,
      role: extractValue(fields.role) || null,
      bio: extractValue(fields.bio) || "",
      location: extractValue(fields.location) || "",
      createdAt: extractValue(fields.createdAt) || new Date().toISOString(),
      stripeCustomerId: extractValue(fields.stripeCustomerId) || undefined,
      activePostCount: extractValue(fields.activePostCount) || 0,
      extraPostCredits: extractValue(fields.extraPostCredits) || 0,
    };

    return NextResponse.json({ user });
  } catch (error) {
    console.error("API user GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error", user: null },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user — Create/ensure user document exists (merge behavior)
 * Body: { uid, email, displayName, photoURL }
 */
export async function POST(request: NextRequest) {
  if (!projectId) {
    return NextResponse.json({ error: "Project ID not configured" }, { status: 500 });
  }

  try {
    const { uid, email, displayName, photoURL } = await request.json();

    if (!uid) {
      return NextResponse.json({ error: "uid is required" }, { status: 400 });
    }

    // Build Firestore fields object — only include provided fields
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fields: Record<string, any> = {};
    const updateMaskFields: string[] = [];

    if (email !== undefined) {
      fields.email = { stringValue: email };
      updateMaskFields.push("email");
    }
    if (displayName !== undefined) {
      fields.displayName = { stringValue: displayName || email?.split("@")[0] || "User" };
      updateMaskFields.push("displayName");
    }
    if (photoURL !== undefined) {
      fields.photoURL = photoURL ? { stringValue: photoURL } : { nullValue: null };
      updateMaskFields.push("photoURL");
    }

    // Use PATCH with updateMask to merge (won't overwrite role or other fields)
    const updateMask = updateMaskFields.map((f) => `updateMask.fieldPaths=${f}`).join("&");
    const url = `${baseUrl}/users/${uid}?${updateMask}`;

    const response = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Firestore API error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API user POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
