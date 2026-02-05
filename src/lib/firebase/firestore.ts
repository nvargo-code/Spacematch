import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  increment,
  DocumentSnapshot,
  QueryConstraint,
} from "firebase/firestore";
import { db } from "./config";
import { Post, CreatePostData, PostFilter, PostStatus } from "@/types";

const POSTS_PER_PAGE = 12;

// Helper to remove undefined values from an object (Firestore doesn't accept undefined)
function removeUndefined<T extends Record<string, unknown>>(obj: T): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    if (value !== null && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
      result[key] = removeUndefined(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result as T;
}

function generateSearchKeywords(post: CreatePostData): string[] {
  const keywords: string[] = [];

  // Add title words
  const titleWords = post.title.toLowerCase().split(/\s+/);
  keywords.push(...titleWords);

  // Add description words (first 100 words)
  const descWords = post.description.toLowerCase().split(/\s+/).slice(0, 100);
  keywords.push(...descWords);

  // Add attribute-based keywords
  if (post.attributes.sizeCategory) {
    keywords.push(post.attributes.sizeCategory);
  }
  if (post.attributes.environment) {
    keywords.push(post.attributes.environment);
  }
  if (post.attributes.utilities) {
    keywords.push(...post.attributes.utilities);
  }
  if (post.attributes.duration) {
    keywords.push(post.attributes.duration);
  }
  if (post.attributes.privacyLevel) {
    keywords.push(post.attributes.privacyLevel);
  }
  if (post.attributes.noiseLevel) {
    keywords.push(post.attributes.noiseLevel);
  }
  if (post.attributes.userTypes) {
    keywords.push(...post.attributes.userTypes);
  }
  if (post.attributes.customTags) {
    keywords.push(...post.attributes.customTags.map(t => t.toLowerCase()));
  }
  if (post.attributes.location) {
    keywords.push(...post.attributes.location.toLowerCase().split(/\s+/));
  }

  // Add boolean attribute keywords
  if (post.attributes.hasParking) keywords.push("parking");
  if (post.attributes.hasRestroom) keywords.push("restroom", "bathroom");
  if (post.attributes.adaAccessible) keywords.push("ada", "accessible", "accessibility");
  if (post.attributes.petsAllowed) keywords.push("pets", "pet-friendly");
  if (post.attributes.climateControlled) keywords.push("climate", "ac", "heating");

  // Remove duplicates and filter short words
  return Array.from(new Set(keywords)).filter(k => k.length > 2);
}

export async function createPost(
  authorId: string,
  authorName: string,
  authorPhotoURL: string | undefined,
  data: CreatePostData
): Promise<string> {
  const searchKeywords = generateSearchKeywords(data);

  // Clean data to remove undefined values (Firestore doesn't accept them)
  const cleanedData = removeUndefined(data as unknown as Record<string, unknown>);

  const postRef = await addDoc(collection(db, "posts"), {
    ...cleanedData,
    authorId,
    authorName,
    authorPhotoURL: authorPhotoURL || null,
    searchKeywords,
    status: "active",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Increment user's active post count
  const userRef = doc(db, "users", authorId);
  await updateDoc(userRef, {
    activePostCount: increment(1),
  });

  return postRef.id;
}

export async function getPost(postId: string): Promise<Post | null> {
  const postRef = doc(db, "posts", postId);
  const postDoc = await getDoc(postRef);

  if (!postDoc.exists()) {
    return null;
  }

  return docToPost(postDoc);
}

export async function getPosts(
  filters?: PostFilter,
  lastDoc?: DocumentSnapshot,
  pageSize: number = POSTS_PER_PAGE
): Promise<{ posts: Post[]; lastDoc: DocumentSnapshot | null; debug?: string }> {
  try {
    // First, try to get ALL posts without any filter to debug
    const allDocsSnapshot = await getDocs(collection(db, "posts"));
    const totalDocs = allDocsSnapshot.size;
    const statuses = allDocsSnapshot.docs.map(d => d.data().status);
    const uniqueStatuses = [...new Set(statuses)];

    console.log(`DEBUG: Total docs in posts collection: ${totalDocs}, statuses: ${uniqueStatuses.join(", ")}`);

    // Now do the actual query
    let q;
    if (filters?.type) {
      q = query(
        collection(db, "posts"),
        where("type", "==", filters.type),
        where("status", "==", "active"),
        limit(pageSize * 2)
      );
    } else {
      q = query(
        collection(db, "posts"),
        where("status", "==", "active"),
        limit(pageSize * 2)
      );
    }

    const snapshot = await getDocs(q);
    console.log(`DEBUG: Filtered query returned ${snapshot.size} docs`);

    // Sort client-side by createdAt descending
    let posts = snapshot.docs.map(docToPost);
    posts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Apply pagination client-side
    if (lastDoc) {
      const lastIndex = posts.findIndex(p => p.id === lastDoc.id);
      if (lastIndex >= 0) {
        posts = posts.slice(lastIndex + 1);
      }
    }

    posts = posts.slice(0, pageSize);
    const newLastDoc = snapshot.docs.find(d => d.id === posts[posts.length - 1]?.id) || null;

    return {
      posts,
      lastDoc: newLastDoc,
      debug: `Total: ${totalDocs}, Statuses: [${uniqueStatuses.join(", ")}], Filtered: ${snapshot.size}`
    };
  } catch (error) {
    console.error("getPosts error:", error);
    return { posts: [], lastDoc: null, debug: `Error: ${error}` };
  }
}

export async function getUserPosts(userId: string): Promise<Post[]> {
  try {
    // Simple query - just filter by authorId, sort client-side
    const q = query(
      collection(db, "posts"),
      where("authorId", "==", userId)
    );

    const snapshot = await getDocs(q);
    const posts = snapshot.docs.map(docToPost).filter(p => p.status === "active");
    posts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return posts;
  } catch (error) {
    console.error("getUserPosts error:", error);
    return [];
  }
}

export async function searchPosts(
  keyword: string,
  type?: "need" | "space"
): Promise<Post[]> {
  const searchTerm = keyword.toLowerCase();

  const constraints: QueryConstraint[] = [
    where("status", "==", "active"),
    where("searchKeywords", "array-contains", searchTerm),
    orderBy("createdAt", "desc"),
    limit(50),
  ];

  if (type) {
    constraints.unshift(where("type", "==", type));
  }

  const q = query(collection(db, "posts"), ...constraints);
  const snapshot = await getDocs(q);

  return snapshot.docs.map(docToPost);
}

export async function updatePostStatus(
  postId: string,
  status: PostStatus,
  authorId: string
): Promise<void> {
  const postRef = doc(db, "posts", postId);
  await updateDoc(postRef, {
    status,
    updatedAt: serverTimestamp(),
  });

  // Decrement user's active post count if closing/deleting
  if (status !== "active") {
    const userRef = doc(db, "users", authorId);
    await updateDoc(userRef, {
      activePostCount: increment(-1),
    });
  }
}

export async function deletePost(postId: string, authorId: string): Promise<void> {
  await updatePostStatus(postId, "deleted", authorId);
}

function docToPost(doc: DocumentSnapshot): Post {
  const data = doc.data()!;
  return {
    id: doc.id,
    type: data.type,
    authorId: data.authorId,
    authorName: data.authorName,
    authorPhotoURL: data.authorPhotoURL,
    title: data.title,
    description: data.description,
    images: data.images || [],
    attributes: data.attributes || {},
    searchKeywords: data.searchKeywords || [],
    status: data.status,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  };
}
