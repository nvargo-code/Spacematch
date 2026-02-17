import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toFirestoreValue(val: any): any {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === "string") return { stringValue: val };
  if (typeof val === "boolean") return { booleanValue: val };
  if (typeof val === "number") {
    if (Number.isInteger(val)) return { integerValue: String(val) };
    return { doubleValue: val };
  }
  return { stringValue: String(val) };
}

export async function POST(request: NextRequest) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!projectId) {
    return NextResponse.json({ error: "Project ID not configured" }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { userId, userName, postId, postTitle, externalUrl } = body;

    if (!userId || !postId) {
      return NextResponse.json({ error: "Missing required fields: userId, postId" }, { status: 400 });
    }

    const now = new Date().toISOString();

    const fields = {
      userId: toFirestoreValue(userId),
      userName: toFirestoreValue(userName || ""),
      postId: toFirestoreValue(postId),
      postTitle: toFirestoreValue(postTitle || ""),
      externalUrl: toFirestoreValue(externalUrl || ""),
      createdAt: { timestampValue: now },
    };

    const createUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/interests`;
    const createRes = await fetch(createUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      console.error("Firestore create interest error:", errText);
      return NextResponse.json({ error: "Failed to log interest" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Interest API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
