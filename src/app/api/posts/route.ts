import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Helper: convert a JS value to a Firestore REST API "Value" object
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

function generateSearchKeywords(
  type: string,
  title: string,
  description: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  attributes?: any,
): string[] {
  const keywords: string[] = [];
  keywords.push(...title.toLowerCase().split(/\s+/));
  keywords.push(...description.toLowerCase().split(/\s+/).slice(0, 100));

  if (type === "community") {
    keywords.push("community");
  } else if (attributes) {
    if (attributes.sizeCategory) keywords.push(attributes.sizeCategory);
    if (attributes.environment) keywords.push(attributes.environment);
    if (attributes.utilities) keywords.push(...attributes.utilities);
    if (attributes.duration) keywords.push(attributes.duration);
    if (attributes.privacyLevel) keywords.push(attributes.privacyLevel);
    if (attributes.noiseLevel) keywords.push(attributes.noiseLevel);
    if (attributes.userTypes) keywords.push(...attributes.userTypes);
    if (attributes.customTags) keywords.push(...attributes.customTags.map((t: string) => t.toLowerCase()));
    if (attributes.location) keywords.push(...attributes.location.toLowerCase().split(/\s+/));
    if (attributes.hasParking) keywords.push("parking");
    if (attributes.hasRestroom) keywords.push("restroom", "bathroom");
    if (attributes.adaAccessible) keywords.push("ada", "accessible", "accessibility");
    if (attributes.petsAllowed) keywords.push("pets", "pet-friendly");
    if (attributes.climateControlled) keywords.push("climate", "ac", "heating");
  }

  return Array.from(new Set(keywords)).filter(k => k.length > 2);
}

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
function parseFirestoreDoc(doc: any) {
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
    attributes: fields.attributes ? fromFirestoreValue(fields.attributes) : {},
    status: fields.status?.stringValue,
    createdAt: fields.createdAt?.timestampValue || new Date().toISOString(),
    updatedAt: fields.updatedAt?.timestampValue || new Date().toISOString(),
    category: fields.category?.stringValue || null,
    replyCount: fields.replyCount?.integerValue ? parseInt(fields.replyCount.integerValue, 10) : 0,
    hasAvailability: fields.hasAvailability?.booleanValue || false,
  };
}

// Use Firebase REST API directly instead of SDK
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!projectId) {
    return NextResponse.json({ error: "Project ID not configured", posts: [] }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const keyword = searchParams.get("keyword");
  const typeFilter = searchParams.get("type");

  try {
    let documents: unknown[] = [];

    if (keyword) {
      // Search by keyword using array-contains on searchKeywords
      const searchTerm = keyword.toLowerCase().trim();
      const words = searchTerm.split(/\s+/).filter(w => w.length > 2);
      const primaryKeyword = words[0] || searchTerm;

      const runQueryUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;

      // Use a single array-contains filter (no composite index needed).
      // Status and type filtering + sorting are handled in post-processing below.
      const response = await fetch(runQueryUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: "posts" }],
            where: {
              fieldFilter: {
                field: { fieldPath: "searchKeywords" },
                op: "ARRAY_CONTAINS",
                value: { stringValue: primaryKeyword },
              },
            },
            limit: 100,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return NextResponse.json({
          error: `Firestore API error: ${response.status}`,
          details: errorText,
          posts: [],
        }, { status: response.status });
      }

      const results = await response.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      documents = results.filter((r: any) => r.document).map((r: any) => r.document);

      // Multi-word filtering: check remaining keywords against searchKeywords
      if (words.length > 1) {
        const additionalWords = words.slice(1);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        documents = (documents as any[]).filter((doc: any) => {
          const docKeywords: string[] = (doc.fields?.searchKeywords?.arrayValue?.values || [])
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((v: any) => v.stringValue);
          return additionalWords.every(w => docKeywords.includes(w));
        });
      }
    } else if (userId) {
      // Use :runQuery to filter by authorId
      const runQueryUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;

      const response = await fetch(runQueryUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: "posts" }],
            where: {
              fieldFilter: {
                field: { fieldPath: "authorId" },
                op: "EQUAL",
                value: { stringValue: userId },
              },
            },
            limit: 50,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return NextResponse.json({
          error: `Firestore API error: ${response.status}`,
          details: errorText,
          posts: [],
        }, { status: response.status });
      }

      const results = await response.json();
      // runQuery returns array of { document: {...} } objects
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      documents = results.filter((r: any) => r.document).map((r: any) => r.document);
    } else {
      // Fetch all posts
      const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/posts?pageSize=50`;

      const response = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
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
      documents = data.documents || [];
    }

    const fetchTime = Date.now() - startTime;

    // Transform Firestore REST response to our post format
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let posts = (documents as any[])
      .map(parseFirestoreDoc)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((p: any) => p.status === "active");

    // Apply type filter (used by keyword search)
    if (typeFilter) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      posts = posts.filter((p: any) => p.type === typeFilter);
    }

    // Sort by createdAt descending
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    posts.sort((a: any, b: any) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      posts,
      count: posts.length,
      debug: {
        totalDocs: documents.length,
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

// POST /api/posts — create a new post via Firestore REST API
export async function POST(request: NextRequest) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!projectId) {
    return NextResponse.json({ error: "Project ID not configured" }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { authorId, authorName, authorPhotoURL, type, title, description, images, attributes, category } = body;

    if (!authorId || !title || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const searchKeywords = generateSearchKeywords(type, title, description || "", attributes);

    // Build Firestore document fields
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fields: Record<string, any> = {
      type: toFirestoreValue(type),
      authorId: toFirestoreValue(authorId),
      authorName: toFirestoreValue(authorName || ""),
      authorPhotoURL: toFirestoreValue(authorPhotoURL || null),
      title: toFirestoreValue(title),
      description: toFirestoreValue(description || ""),
      images: toFirestoreValue(images || []),
      attributes: toFirestoreValue(attributes || {}),
      searchKeywords: toFirestoreValue(searchKeywords),
      status: toFirestoreValue("active"),
      createdAt: { timestampValue: now },
      updatedAt: { timestampValue: now },
      hasAvailability: toFirestoreValue(false),
    };

    if (category) {
      fields.category = toFirestoreValue(category);
    }

    if (type === "community") {
      fields.replyCount = toFirestoreValue(0);
    }

    // Create the post document (auto-generated ID)
    const createUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/posts`;
    const createRes = await fetch(createUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      console.error("Firestore create post error:", errText);
      return NextResponse.json({ error: "Failed to create post", details: errText }, { status: 500 });
    }

    const createData = await createRes.json();
    const newDocId = createData.name?.split("/").pop();

    // Increment user's activePostCount using commit with field transform
    const commitUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:commit`;
    const commitRes = await fetch(commitUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        writes: [
          {
            transform: {
              document: `projects/${projectId}/databases/(default)/documents/users/${authorId}`,
              fieldTransforms: [
                {
                  fieldPath: "activePostCount",
                  increment: { integerValue: "1" },
                },
              ],
            },
          },
        ],
      }),
    });

    if (!commitRes.ok) {
      console.error("Firestore increment activePostCount error:", await commitRes.text());
      // Non-fatal: post was already created
    }

    return NextResponse.json({ id: newDocId });
  } catch (error) {
    console.error("API POST /posts error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
