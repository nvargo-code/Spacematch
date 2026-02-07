import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Use Firebase REST API directly instead of SDK
export async function GET() {
  const startTime = Date.now();
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!projectId) {
    return NextResponse.json({ error: "Project ID not configured", posts: [] }, { status: 500 });
  }

  try {
    // Use Firestore REST API to query posts
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/posts?pageSize=50`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({
        error: `Firestore API error: ${response.status}`,
        details: errorText,
        posts: [],
      }, { status: response.status });
    }

    const data = await response.json();
    const fetchTime = Date.now() - startTime;

    // Transform Firestore REST response to our post format
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const posts = (data.documents || [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((doc: any) => {
        const fields = doc.fields || {};
        const id = doc.name?.split("/").pop();

        return {
          id,
          type: fields.type?.stringValue,
          authorId: fields.authorId?.stringValue,
          authorName: fields.authorName?.stringValue,
          authorPhotoURL: fields.authorPhotoURL?.stringValue || null,
          title: fields.title?.stringValue,
          description: fields.description?.stringValue,
          images: (fields.images?.arrayValue?.values || []).map((v: { stringValue: string }) => v.stringValue),
          status: fields.status?.stringValue,
          createdAt: fields.createdAt?.timestampValue || new Date().toISOString(),
          updatedAt: fields.updatedAt?.timestampValue || new Date().toISOString(),
          category: fields.category?.stringValue || null,
          replyCount: fields.replyCount?.integerValue ? parseInt(fields.replyCount.integerValue, 10) : 0,
          hasAvailability: fields.hasAvailability?.booleanValue || false,
        };
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((p: any) => p.status === "active");

    // Sort by createdAt descending
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    posts.sort((a: any, b: any) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      posts,
      count: posts.length,
      debug: {
        totalDocs: data.documents?.length || 0,
        fetchTime: `${fetchTime}ms`,
        projectId,
      }
    });
  } catch (error) {
    console.error("API posts error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error", posts: [] },
      { status: 500 }
    );
  }
}
