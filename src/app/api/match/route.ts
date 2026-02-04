import { NextRequest, NextResponse } from "next/server";
import { getPost } from "@/lib/firebase/firestore";
import { findMatches, createMatch } from "@/lib/firebase/matching";

export async function POST(request: NextRequest) {
  try {
    const { postId, userId } = await request.json();

    if (!postId || !userId) {
      return NextResponse.json(
        { error: "Missing postId or userId" },
        { status: 400 }
      );
    }

    // Get the post
    const post = await getPost(postId);
    if (!post) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    // Verify the user owns this post
    if (post.authorId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Find matches
    const matches = await findMatches(post);

    return NextResponse.json({ matches });
  } catch (error) {
    console.error("Error finding matches:", error);
    return NextResponse.json(
      { error: "Failed to find matches" },
      { status: 500 }
    );
  }
}

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
