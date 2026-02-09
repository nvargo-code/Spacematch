import { Post, Match, MatchResult, MatchStatus } from "@/types";

const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/databases/(default)/documents`;

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toFirestoreValue(val: any): any {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === "string") return { stringValue: val };
  if (typeof val === "boolean") return { booleanValue: val };
  if (typeof val === "number") {
    if (Number.isInteger(val)) return { integerValue: String(val) };
    return { doubleValue: val };
  }
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === "object") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseFirestorePost(doc: any): Post {
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseFirestoreMatch(doc: any): Match {
  const fields = doc.fields || {};
  const id = doc.name?.split("/").pop();

  return {
    id,
    seekerPostId: fields.seekerPostId?.stringValue,
    landlordPostId: fields.landlordPostId?.stringValue,
    seekerId: fields.seekerId?.stringValue,
    landlordId: fields.landlordId?.stringValue,
    matchScore: fields.matchScore?.integerValue ? parseInt(fields.matchScore.integerValue, 10) : (fields.matchScore?.doubleValue || 0),
    status: fields.status?.stringValue as MatchStatus,
    stripePaymentId: fields.stripePaymentId?.stringValue,
    createdAt: fields.createdAt?.timestampValue ? new Date(fields.createdAt.timestampValue) : new Date(),
    updatedAt: fields.updatedAt?.timestampValue ? new Date(fields.updatedAt.timestampValue) : new Date(),
  };
}

const MIN_MATCHING_ATTRIBUTES = 4;

export async function findMatches(post: Post): Promise<MatchResult[]> {
  const oppositeType = post.type === "need" ? "space" : "need";

  const runQueryUrl = `${FIRESTORE_BASE}:runQuery`;
  const response = await fetch(runQueryUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "posts" }],
        where: {
          compositeFilter: {
            op: "AND",
            filters: [
              { fieldFilter: { field: { fieldPath: "type" }, op: "EQUAL", value: { stringValue: oppositeType } } },
              { fieldFilter: { field: { fieldPath: "status" }, op: "EQUAL", value: { stringValue: "active" } } },
            ],
          },
        },
        limit: 100,
      },
    }),
  });

  if (!response.ok) {
    console.error("findMatches query error:", await response.text());
    return [];
  }

  const results = await response.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const documents = results.filter((r: any) => r.document).map((r: any) => r.document);

  const matches: MatchResult[] = [];

  for (const doc of documents) {
    const otherPost = parseFirestorePost(doc);

    // Don't match with own posts
    if (otherPost.authorId === post.authorId) continue;

    const { score, matchingAttributes } = calculateMatchScore(post, otherPost);

    if (score > 0 && matchingAttributes.length >= MIN_MATCHING_ATTRIBUTES) {
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

  matches.sort((a, b) => b.score - a.score);
  return matches.slice(0, 10);
}

export function calculateMatchScore(
  post1: Post,
  post2: Post
): { score: number; matchingAttributes: string[] } {
  let score = 0;
  const matchingAttributes: string[] = [];

  const attrs1 = post1.attributes;
  const attrs2 = post2.attributes;

  if (!attrs1 || !attrs2) return { score: 0, matchingAttributes: [] };

  // Determine which is the seeker (need) and which is the space
  const needPost = post1.type === "need" ? post1 : post2;
  const spacePost = post1.type === "space" ? post1 : post2;
  const needAttrs = needPost.attributes;
  const spaceAttrs = spacePost.attributes;

  // Required attribute check: if seeker requests these, space MUST have them
  if (needAttrs.adaAccessible && !spaceAttrs.adaAccessible) {
    return { score: 0, matchingAttributes: [] };
  }
  if (needAttrs.petsAllowed && !spaceAttrs.petsAllowed) {
    return { score: 0, matchingAttributes: [] };
  }
  if (needAttrs.climateControlled && !spaceAttrs.climateControlled) {
    return { score: 0, matchingAttributes: [] };
  }

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

  // Availability bonus
  if (spacePost.hasAvailability) {
    const now = new Date();
    if (
      spacePost.availabilityStart &&
      spacePost.availabilityEnd &&
      now >= spacePost.availabilityStart &&
      now <= spacePost.availabilityEnd
    ) {
      score += 5;
      matchingAttributes.push("Available Now");
    }
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
  const now = new Date().toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fields: Record<string, any> = {
    seekerPostId: toFirestoreValue(seekerPostId),
    landlordPostId: toFirestoreValue(landlordPostId),
    seekerId: toFirestoreValue(seekerId),
    landlordId: toFirestoreValue(landlordId),
    matchScore: toFirestoreValue(matchScore),
    status: toFirestoreValue("pending"),
    createdAt: { timestampValue: now },
    updatedAt: { timestampValue: now },
  };

  const createUrl = `${FIRESTORE_BASE}/matches`;
  const response = await fetch(createUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("createMatch error:", errText);
    throw new Error("Failed to create match");
  }

  const data = await response.json();
  return data.name?.split("/").pop();
}

export async function getMatch(matchId: string): Promise<Match | null> {
  const url = `${FIRESTORE_BASE}/matches/${matchId}`;
  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 404) return null;
    console.error("getMatch error:", await response.text());
    return null;
  }

  const doc = await response.json();
  return parseFirestoreMatch(doc);
}

export async function updateMatchStatus(
  matchId: string,
  status: MatchStatus,
  paymentId?: string
): Promise<void> {
  const now = new Date().toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fields: Record<string, any> = {
    status: toFirestoreValue(status),
    updatedAt: { timestampValue: now },
  };

  if (paymentId) {
    fields.stripePaymentId = toFirestoreValue(paymentId);
  }

  // We need to read existing doc, merge, and write back
  const existingMatch = await getMatch(matchId);
  if (!existingMatch) throw new Error("Match not found");

  const mergedFields: Record<string, unknown> = {
    seekerPostId: toFirestoreValue(existingMatch.seekerPostId),
    landlordPostId: toFirestoreValue(existingMatch.landlordPostId),
    seekerId: toFirestoreValue(existingMatch.seekerId),
    landlordId: toFirestoreValue(existingMatch.landlordId),
    matchScore: toFirestoreValue(existingMatch.matchScore),
    status: toFirestoreValue(status),
    createdAt: { timestampValue: existingMatch.createdAt.toISOString() },
    updatedAt: { timestampValue: now },
  };

  if (paymentId) {
    mergedFields.stripePaymentId = toFirestoreValue(paymentId);
  } else if (existingMatch.stripePaymentId) {
    mergedFields.stripePaymentId = toFirestoreValue(existingMatch.stripePaymentId);
  }

  const url = `${FIRESTORE_BASE}/matches/${matchId}`;
  const response = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields: mergedFields }),
  });

  if (!response.ok) {
    console.error("updateMatchStatus error:", await response.text());
    throw new Error("Failed to update match status");
  }
}

export async function getUserMatches(userId: string): Promise<Match[]> {
  const runQueryUrl = `${FIRESTORE_BASE}:runQuery`;

  const [seekerRes, landlordRes] = await Promise.all([
    fetch(runQueryUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: "matches" }],
          where: { fieldFilter: { field: { fieldPath: "seekerId" }, op: "EQUAL", value: { stringValue: userId } } },
          limit: 50,
        },
      }),
    }),
    fetch(runQueryUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: "matches" }],
          where: { fieldFilter: { field: { fieldPath: "landlordId" }, op: "EQUAL", value: { stringValue: userId } } },
          limit: 50,
        },
      }),
    }),
  ]);

  const matches: Match[] = [];

  for (const res of [seekerRes, landlordRes]) {
    if (!res.ok) {
      console.error("getUserMatches query error:", await res.text());
      continue;
    }
    const results = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const docs = results.filter((r: any) => r.document).map((r: any) => r.document);
    for (const doc of docs) {
      matches.push(parseFirestoreMatch(doc));
    }
  }

  // Deduplicate by id (in case someone is both seeker and landlord somehow)
  const seen = new Set<string>();
  return matches.filter((m) => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });
}
