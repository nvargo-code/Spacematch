import {
  collection,
  doc,
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

export async function createPost(
  authorId: string,
  authorName: string,
  authorPhotoURL: string | undefined,
  data: CreatePostData
): Promise<string> {
  const response = await fetch("/api/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      authorId,
      authorName,
      authorPhotoURL: authorPhotoURL || null,
      type: data.type,
      title: data.title,
      description: data.description,
      images: data.images,
      attributes: data.attributes,
      category: data.category,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || "Failed to create post");
  }

  const result = await response.json();
  return result.id;
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
    // Debug: Check if db is initialized
    if (!db) {
      return { posts: [], lastDoc: null, debug: "ERROR: db is undefined" };
    }

    const startTime = Date.now();

    // Query for active posts
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

    const elapsed = Date.now() - startTime;
    return {
      posts,
      lastDoc: newLastDoc,
      debug: `${elapsed}ms | Total: ${snapshot.size}, Returned: ${posts.length}`
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
  type?: Post["type"]
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
    // Community fields
    category: data.category || undefined,
    replyCount: data.replyCount || 0,
    // Availability fields
    hasAvailability: data.hasAvailability || false,
    availabilityStart: data.availabilityStart?.toDate() || undefined,
    availabilityEnd: data.availabilityEnd?.toDate() || undefined,
  };
}
