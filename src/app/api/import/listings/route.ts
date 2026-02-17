import { NextRequest, NextResponse } from "next/server";
import { mapExternalToPost } from "@/lib/import/mappers";
import type { ExternalListing } from "@/lib/import/types";

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

async function checkExternalIdExists(projectId: string, externalId: string): Promise<boolean> {
  const runQueryUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
  const response = await fetch(runQueryUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "posts" }],
        where: {
          fieldFilter: {
            field: { fieldPath: "externalId" },
            op: "EQUAL",
            value: { stringValue: externalId },
          },
        },
        limit: 1,
      },
    }),
  });

  if (!response.ok) return false;
  const results = await response.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return results.some((r: any) => r.document);
}

export async function POST(request: NextRequest) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const importSecret = process.env.IMPORT_SECRET_KEY;

  if (!projectId) {
    return NextResponse.json({ error: "Project ID not configured" }, { status: 500 });
  }

  // Authenticate via secret key
  const authHeader = request.headers.get("authorization");
  const providedSecret = authHeader?.replace("Bearer ", "");

  if (!importSecret || providedSecret !== importSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const listings: ExternalListing[] = Array.isArray(body) ? body : body.listings;

    if (!listings || !Array.isArray(listings) || listings.length === 0) {
      return NextResponse.json({ error: "No listings provided. Send a JSON array or { listings: [...] }" }, { status: 400 });
    }

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const listing of listings) {
      if (!listing.externalId || !listing.title) {
        errors.push(`Skipped listing: missing externalId or title`);
        skipped++;
        continue;
      }

      // Dedup check
      const exists = await checkExternalIdExists(projectId, listing.externalId);
      if (exists) {
        skipped++;
        continue;
      }

      const mapped = mapExternalToPost(listing);
      const now = new Date().toISOString();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fields: Record<string, any> = {
        type: toFirestoreValue(mapped.type),
        authorId: toFirestoreValue(mapped.authorId),
        authorName: toFirestoreValue(mapped.authorName),
        authorPhotoURL: toFirestoreValue(null),
        title: toFirestoreValue(mapped.title),
        description: toFirestoreValue(mapped.description),
        images: toFirestoreValue(mapped.images),
        attributes: toFirestoreValue(mapped.attributes),
        searchKeywords: toFirestoreValue(mapped.searchKeywords),
        status: toFirestoreValue(mapped.status),
        createdAt: { timestampValue: now },
        updatedAt: { timestampValue: now },
        hasAvailability: toFirestoreValue(false),
        source: toFirestoreValue(mapped.source),
        externalId: toFirestoreValue(mapped.externalId),
        externalUrl: toFirestoreValue(mapped.externalUrl || null),
        isImported: toFirestoreValue(true),
      };

      const createUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/posts`;
      const createRes = await fetch(createUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields }),
      });

      if (!createRes.ok) {
        const errText = await createRes.text();
        errors.push(`Failed to import "${listing.title}": ${errText}`);
        skipped++;
      } else {
        imported++;
      }
    }

    return NextResponse.json({
      imported,
      skipped,
      total: listings.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
