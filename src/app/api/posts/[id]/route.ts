import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const postId = params.id;

  if (!projectId) {
    return NextResponse.json({ error: "Project ID not configured", post: null }, { status: 500 });
  }

  if (!postId) {
    return NextResponse.json({ error: "Post ID required", post: null }, { status: 400 });
  }

  try {
    // Use Firestore REST API to get single document
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/posts/${postId}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ error: "Post not found", post: null }, { status: 404 });
      }
      const errorText = await response.text();
      return NextResponse.json({
        error: `Firestore API error: ${response.status}`,
        details: errorText,
        post: null,
      }, { status: response.status });
    }

    const doc = await response.json();
    const fetchTime = Date.now() - startTime;

    // Transform Firestore REST response to our post format
    const fields = doc.fields || {};
    const post = {
      id: postId,
      type: fields.type?.stringValue,
      authorId: fields.authorId?.stringValue,
      authorName: fields.authorName?.stringValue,
      authorPhotoURL: fields.authorPhotoURL?.stringValue || null,
      title: fields.title?.stringValue,
      description: fields.description?.stringValue,
      images: (fields.images?.arrayValue?.values || []).map((v: { stringValue: string }) => v.stringValue),
      attributes: parseAttributes(fields.attributes?.mapValue?.fields || {}),
      searchKeywords: (fields.searchKeywords?.arrayValue?.values || []).map((v: { stringValue: string }) => v.stringValue),
      status: fields.status?.stringValue,
      createdAt: fields.createdAt?.timestampValue || new Date().toISOString(),
      updatedAt: fields.updatedAt?.timestampValue || new Date().toISOString(),
      // Community fields
      category: fields.category?.stringValue || null,
      replyCount: fields.replyCount?.integerValue ? parseInt(fields.replyCount.integerValue, 10) : 0,
      // Availability fields
      hasAvailability: fields.hasAvailability?.booleanValue || false,
      availabilityStart: fields.availabilityStart?.timestampValue || null,
      availabilityEnd: fields.availabilityEnd?.timestampValue || null,
    };

    return NextResponse.json({
      post,
      debug: {
        fetchTime: `${fetchTime}ms`,
      }
    });
  } catch (error) {
    console.error("API post error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error", post: null },
      { status: 500 }
    );
  }
}

// Helper to parse Firestore map values to plain object
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseAttributes(fields: Record<string, any>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(fields)) {
    if (value.stringValue !== undefined) {
      result[key] = value.stringValue;
    } else if (value.booleanValue !== undefined) {
      result[key] = value.booleanValue;
    } else if (value.integerValue !== undefined) {
      result[key] = parseInt(value.integerValue, 10);
    } else if (value.doubleValue !== undefined) {
      result[key] = value.doubleValue;
    } else if (value.arrayValue?.values) {
      result[key] = value.arrayValue.values.map((v: { stringValue: string }) => v.stringValue);
    }
  }

  return result;
}
