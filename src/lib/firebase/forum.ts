import {
  collection,
  doc,
  addDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  updateDoc,
  increment,
} from "firebase/firestore";
import { db } from "./config";
import { ForumReply } from "@/types";

export async function getReplies(postId: string): Promise<ForumReply[]> {
  const repliesRef = collection(db, "posts", postId, "replies");
  const q = query(repliesRef, orderBy("createdAt", "asc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      body: data.body,
      authorId: data.authorId,
      authorName: data.authorName,
      authorPhotoURL: data.authorPhotoURL || undefined,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  });
}

export async function createReply(
  postId: string,
  data: {
    body: string;
    authorId: string;
    authorName: string;
    authorPhotoURL?: string;
  }
): Promise<string> {
  const repliesRef = collection(db, "posts", postId, "replies");
  const replyDoc = await addDoc(repliesRef, {
    body: data.body,
    authorId: data.authorId,
    authorName: data.authorName,
    authorPhotoURL: data.authorPhotoURL || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Increment reply count on the post
  const postRef = doc(db, "posts", postId);
  await updateDoc(postRef, {
    replyCount: increment(1),
  });

  return replyDoc.id;
}

export async function deleteReply(
  postId: string,
  replyId: string
): Promise<void> {
  const replyRef = doc(db, "posts", postId, "replies", replyId);
  await deleteDoc(replyRef);

  // Decrement reply count on the post
  const postRef = doc(db, "posts", postId);
  await updateDoc(postRef, {
    replyCount: increment(-1),
  });
}
