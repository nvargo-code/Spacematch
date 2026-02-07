import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./config";
import { Post, Match, MatchResult, MatchStatus } from "@/types";

export async function findMatches(post: Post): Promise<MatchResult[]> {
  // Find posts of the opposite type
  const oppositeType = post.type === "need" ? "space" : "need";

  const q = query(
    collection(db, "posts"),
    where("type", "==", oppositeType),
    where("status", "==", "active")
  );

  const snapshot = await getDocs(q);
  const matches: MatchResult[] = [];

  for (const doc of snapshot.docs) {
    const otherPost = doc.data() as Post;
    otherPost.id = doc.id;

    // Don't match with own posts
    if (otherPost.authorId === post.authorId) continue;

    const { score, matchingAttributes } = calculateMatchScore(post, otherPost);

    if (score > 0) {
      matches.push({
        post: {
          id: otherPost.id,
          title: otherPost.title,
          authorName: otherPost.authorName,
        },
        score,
        matchingAttributes,
      });
    }
  }

  // Sort by score descending
  matches.sort((a, b) => b.score - a.score);

  return matches.slice(0, 10); // Return top 10 matches
}

function calculateMatchScore(
  post1: Post,
  post2: Post
): { score: number; matchingAttributes: string[] } {
  let score = 0;
  const matchingAttributes: string[] = [];

  const attrs1 = post1.attributes;
  const attrs2 = post2.attributes;

  // Size category match (10 points)
  if (attrs1.sizeCategory && attrs2.sizeCategory) {
    if (attrs1.sizeCategory === attrs2.sizeCategory) {
      score += 10;
      matchingAttributes.push("Size");
    }
  }

  // Environment match (10 points)
  if (attrs1.environment && attrs2.environment) {
    if (attrs1.environment === attrs2.environment) {
      score += 10;
      matchingAttributes.push("Environment");
    }
  }

  // Duration match (15 points)
  if (attrs1.duration && attrs2.duration) {
    if (attrs1.duration === attrs2.duration) {
      score += 15;
      matchingAttributes.push("Duration");
    }
  }

  // Privacy level match (10 points)
  if (attrs1.privacyLevel && attrs2.privacyLevel) {
    if (attrs1.privacyLevel === attrs2.privacyLevel) {
      score += 10;
      matchingAttributes.push("Privacy");
    }
  }

  // Noise level match (10 points)
  if (attrs1.noiseLevel && attrs2.noiseLevel) {
    if (attrs1.noiseLevel === attrs2.noiseLevel) {
      score += 10;
      matchingAttributes.push("Noise Level");
    }
  }

  // Utilities match (2 points per matching utility)
  if (attrs1.utilities && attrs2.utilities) {
    const matchingUtilities = attrs1.utilities.filter((u) =>
      attrs2.utilities!.includes(u)
    );
    if (matchingUtilities.length > 0) {
      score += matchingUtilities.length * 2;
      matchingAttributes.push("Utilities");
    }
  }

  // User types match (5 points per matching type)
  if (attrs1.userTypes && attrs2.userTypes) {
    const matchingTypes = attrs1.userTypes.filter((t) =>
      attrs2.userTypes!.includes(t)
    );
    if (matchingTypes.length > 0) {
      score += matchingTypes.length * 5;
      matchingAttributes.push("User Type");
    }
  }

  // Amenities matches (3 points each)
  if (attrs1.hasParking && attrs2.hasParking) {
    score += 3;
    matchingAttributes.push("Parking");
  }
  if (attrs1.hasRestroom && attrs2.hasRestroom) {
    score += 3;
    matchingAttributes.push("Restroom");
  }
  if (attrs1.adaAccessible && attrs2.adaAccessible) {
    score += 3;
    matchingAttributes.push("ADA Accessible");
  }
  if (attrs1.petsAllowed && attrs2.petsAllowed) {
    score += 3;
    matchingAttributes.push("Pets Allowed");
  }
  if (attrs1.climateControlled && attrs2.climateControlled) {
    score += 3;
    matchingAttributes.push("Climate Control");
  }

  // Location match (bonus 20 points for same location)
  if (attrs1.location && attrs2.location) {
    const loc1 = attrs1.location.toLowerCase();
    const loc2 = attrs2.location.toLowerCase();
    if (loc1 === loc2 || loc1.includes(loc2) || loc2.includes(loc1)) {
      score += 20;
      matchingAttributes.push("Location");
    }
  }

  // Availability bonus — space post with availability set (+5 "Available Now")
  const spacePost = post1.type === "space" ? post1 : post2;
  if (spacePost.hasAvailability) {
    const now = new Date();
    // +5 if space is currently available (now falls within availability range)
    if (
      spacePost.availabilityStart &&
      spacePost.availabilityEnd &&
      now >= spacePost.availabilityStart &&
      now <= spacePost.availabilityEnd
    ) {
      score += 5;
      matchingAttributes.push("Available Now");
    }
    // +5 for long-term availability (availability span > 30 days)
    if (
      spacePost.availabilityStart &&
      spacePost.availabilityEnd &&
      spacePost.availabilityEnd.getTime() - spacePost.availabilityStart.getTime() >
        30 * 24 * 60 * 60 * 1000
    ) {
      score += 5;
      matchingAttributes.push("Long-term Availability");
    }
  }

  return { score, matchingAttributes };
}

export async function createMatch(
  seekerPostId: string,
  landlordPostId: string,
  seekerId: string,
  landlordId: string,
  matchScore: number
): Promise<string> {
  const matchRef = await addDoc(collection(db, "matches"), {
    seekerPostId,
    landlordPostId,
    seekerId,
    landlordId,
    matchScore,
    status: "pending" as MatchStatus,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return matchRef.id;
}

export async function getMatch(matchId: string): Promise<Match | null> {
  const matchRef = doc(db, "matches", matchId);
  const matchDoc = await getDoc(matchRef);

  if (!matchDoc.exists()) {
    return null;
  }

  const data = matchDoc.data();
  return {
    id: matchDoc.id,
    seekerPostId: data.seekerPostId,
    landlordPostId: data.landlordPostId,
    seekerId: data.seekerId,
    landlordId: data.landlordId,
    matchScore: data.matchScore,
    status: data.status,
    stripePaymentId: data.stripePaymentId,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  };
}

export async function updateMatchStatus(
  matchId: string,
  status: MatchStatus,
  paymentId?: string
): Promise<void> {
  const matchRef = doc(db, "matches", matchId);
  const updateData: Record<string, unknown> = {
    status,
    updatedAt: serverTimestamp(),
  };

  if (paymentId) {
    updateData.stripePaymentId = paymentId;
  }

  await updateDoc(matchRef, updateData);
}

export async function getUserMatches(userId: string): Promise<Match[]> {
  const q = query(
    collection(db, "matches"),
    where("seekerId", "==", userId)
  );

  const q2 = query(
    collection(db, "matches"),
    where("landlordId", "==", userId)
  );

  const [seekerSnapshot, landlordSnapshot] = await Promise.all([
    getDocs(q),
    getDocs(q2),
  ]);

  const matches: Match[] = [];

  [...seekerSnapshot.docs, ...landlordSnapshot.docs].forEach((doc) => {
    const data = doc.data();
    matches.push({
      id: doc.id,
      seekerPostId: data.seekerPostId,
      landlordPostId: data.landlordPostId,
      seekerId: data.seekerId,
      landlordId: data.landlordId,
      matchScore: data.matchScore,
      status: data.status,
      stripePaymentId: data.stripePaymentId,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    });
  });

  return matches;
}
