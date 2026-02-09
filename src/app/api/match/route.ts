import { NextRequest, NextResponse } from "next/server";
import { findMatches, createMatch, getUserMatches } from "@/lib/firebase/matching";
import { Post } from "@/types";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromFirestoreValue(val: any): any {
  if (val === null || val === undefined) return null;
  if ("stringValue" in val) return val.stringValue;
  if ("integerValue" in val) return parseInt(val.integerValue, 10);
  if ("doubleValue" in val) return val.doubleValue;
  if ("booleanValue" in val) return val.booleanValue;
  if ("nullValue" in val) return null;
  if ("timestampValue" in val) return val.timestampValue;
  if ("arrayValue" in val) return (val.arrayValue?.values || []).map(fromFirestoreValue);
  if ("mapValue" in val) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: Record<string, any> = {};
    for (const [k, v] of Object.entries(val.mapValue?.fields || {})) {
      result[k] = fromFirestoreValue(v);
    }
    return result;
  }
  return null;
}

async function getPostViaREST(postId: string): Promise<Post | null> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) return null;

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/posts/${postId}`;
  const response = await fetch(url);

  if (!response.ok) return null;

  const doc = await response.json();
  const fields = doc.fields || {};
  const id = doc.name?.split("/").pop();

  return {
    id,
    type: fields.type?.stringValue,
    authorId: fields.authorId?.stringValue,
    authorName: fields.authorName?.stringValue,
    authorPhotoURL: fields.authorPhotoURL?.stringValue || undefined,
    title: fields.title?.stringValue,
    description: fields.description?.stringValue,
    images: (fields.images?.arrayValue?.values || []).map((v: { stringValue: string }) => v.stringValue),
    attributes: fields.attributes ? fromFirestoreValue(fields.attributes) : {},
    searchKeywords: (fields.searchKeywords?.arrayValue?.values || []).map((v: { stringValue: string }) => v.stringValue),
    status: fields.status?.stringValue,
    createdAt: fields.createdAt?.timestampValue ? new Date(fields.createdAt.timestampValue) : new Date(),
    updatedAt: fields.updatedAt?.timestampValue ? new Date(fields.updatedAt.timestampValue) : new Date(),
    hasAvailability: fields.hasAvailability?.booleanValue || false,
    availabilityStart: fields.availabilityStart?.timestampValue ? new Date(fields.availabilityStart.timestampValue) : undefined,
    availabilityEnd: fields.availabilityEnd?.timestampValue ? new Date(fields.availabilityEnd.timestampValue) : undefined,
  } as Post;
}

// GET /api/match?userId=... — fetch all matches for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId parameter" },
        { status: 400 }
      );
    }

    const matches = await getUserMatches(userId);

    // Enrich matches with post titles
    const enrichedMatches = await Promise.all(
      matches.map(async (match) => {
        const [seekerPost, landlordPost] = await Promise.all([
          getPostViaREST(match.seekerPostId),
          getPostViaREST(match.landlordPostId),
        ]);
        return {
          ...match,
          seekerPostTitle: seekerPost?.title || "Unknown Post",
          seekerPostAuthorName: seekerPost?.authorName || "Unknown",
          landlordPostTitle: landlordPost?.title || "Unknown Post",
          landlordPostAuthorName: landlordPost?.authorName || "Unknown",
        };
      })
    );

    return NextResponse.json({ matches: enrichedMatches });
  } catch (error) {
    console.error("Error fetching matches:", error);
    return NextResponse.json(
      { error: "Failed to fetch matches" },
      { status: 500 }
    );
  }
}

// POST /api/match — find matches for a post
export async function POST(request: NextRequest) {
  try {
    const { postId, userId } = await request.json();

    if (!postId || !userId) {
      return NextResponse.json(
        { error: "Missing postId or userId" },
        { status: 400 }
      );
    }

    const post = await getPostViaREST(postId);
    if (!post) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    if (post.authorId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const matches = await findMatches(post);

    // Persist match records to Firestore so they appear on /matches
    for (const match of matches) {
      const isSeeker = post.type === "need";
      const otherPost = await getPostViaREST(match.post.id);
      if (!otherPost) continue;

      try {
        await createMatch(
          isSeeker ? postId : match.post.id,
          isSeeker ? match.post.id : postId,
          isSeeker ? userId : otherPost.authorId,
          isSeeker ? otherPost.authorId : userId,
          match.score
        );
      } catch (err) {
        console.error("Failed to persist match record:", err);
      }
    }

    return NextResponse.json({ matches });
  } catch (error) {
    console.error("Error finding matches:", error);
    return NextResponse.json(
      { error: "Failed to find matches" },
      { status: 500 }
    );
  }
}

// PUT /api/match — create a match record
export async function PUT(request: NextRequest) {
  try {
    const { seekerPostId, landlordPostId, seekerId, landlordId, matchScore } =
      await request.json();

    if (!seekerPostId || !landlordPostId || !seekerId || !landlordId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const matchId = await createMatch(
      seekerPostId,
      landlordPostId,
      seekerId,
      landlordId,
      matchScore || 0
    );

    return NextResponse.json({ matchId });
  } catch (error) {
    console.error("Error creating match:", error);
    return NextResponse.json(
      { error: "Failed to create match" },
      { status: 500 }
    );
  }
}
