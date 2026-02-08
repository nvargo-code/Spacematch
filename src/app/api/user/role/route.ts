import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

/**
 * PUT /api/user/role — Update user role
 * Body: { uid, role }
 */
export async function PUT(request: NextRequest) {
  if (!projectId) {
    return NextResponse.json({ error: "Project ID not configured" }, { status: 500 });
  }

  try {
    const { uid, role } = await request.json();

    if (!uid || !role) {
      return NextResponse.json({ error: "uid and role are required" }, { status: 400 });
    }

    if (role !== "seeker" && role !== "landlord") {
      return NextResponse.json({ error: "role must be 'seeker' or 'landlord'" }, { status: 400 });
    }

    // PATCH with updateMask to only update the role field
    const url = `${baseUrl}/users/${uid}?updateMask.fieldPaths=role`;

    const response = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fields: {
          role: { stringValue: role },
        },
      }),
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
    console.error("API user role PUT error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
