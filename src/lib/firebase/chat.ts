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
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
  DocumentSnapshot,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "./config";
import { Chat, Message, CreateMessageData } from "@/types";

export async function createChat(
  participants: string[],
  participantNames: Record<string, string>,
  participantPhotos: Record<string, string>,
  matchId?: string
): Promise<string> {
  // Check if chat already exists between these participants
  const existingChat = await findExistingChat(participants);
  if (existingChat) {
    return existingChat.id;
  }

  const unreadCount: Record<string, number> = {};
  participants.forEach((p) => (unreadCount[p] = 0));

  const chatRef = await addDoc(collection(db, "chats"), {
    participants,
    participantNames,
    participantPhotos,
    matchId: matchId || null,
    unreadCount,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return chatRef.id;
}

async function findExistingChat(participants: string[]): Promise<Chat | null> {
  const sorted = [...participants].sort();

  const q = query(
    collection(db, "chats"),
    where("participants", "==", sorted)
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    // Try the other order
    const q2 = query(
      collection(db, "chats"),
      where("participants", "==", participants)
    );
    const snapshot2 = await getDocs(q2);

    if (snapshot2.empty) return null;
    return docToChat(snapshot2.docs[0]);
  }

  return docToChat(snapshot.docs[0]);
}

export async function getChat(chatId: string): Promise<Chat | null> {
  const chatRef = doc(db, "chats", chatId);
  const chatDoc = await getDoc(chatRef);

  if (!chatDoc.exists()) {
    return null;
  }

  return docToChat(chatDoc);
}

export async function getUserChats(userId: string): Promise<Chat[]> {
  const q = query(
    collection(db, "chats"),
    where("participants", "array-contains", userId),
    orderBy("updatedAt", "desc")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToChat);
}

export async function sendMessage(
  chatId: string,
  data: CreateMessageData
): Promise<string> {
  // Add message to subcollection
  const messageRef = await addDoc(
    collection(db, "chats", chatId, "messages"),
    {
      ...data,
      createdAt: serverTimestamp(),
      read: false,
    }
  );

  // Update chat's last message and timestamp
  const chatRef = doc(db, "chats", chatId);
  const chat = await getChat(chatId);

  if (chat) {
    const unreadCount = { ...chat.unreadCount };
    // Increment unread for all participants except sender
    chat.participants.forEach((p) => {
      if (p !== data.senderId) {
        unreadCount[p] = (unreadCount[p] || 0) + 1;
      }
    });

    await updateDoc(chatRef, {
      lastMessage: {
        text: data.text,
        senderId: data.senderId,
        createdAt: serverTimestamp(),
      },
      unreadCount,
      updatedAt: serverTimestamp(),
    });
  }

  return messageRef.id;
}

export async function getMessages(
  chatId: string,
  limitCount: number = 50
): Promise<Message[]> {
  const q = query(
    collection(db, "chats", chatId, "messages"),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToMessage).reverse();
}

export function subscribeToMessages(
  chatId: string,
  callback: (messages: Message[]) => void
): Unsubscribe {
  const q = query(
    collection(db, "chats", chatId, "messages"),
    orderBy("createdAt", "asc")
  );

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(docToMessage);
    callback(messages);
  });
}

export function subscribeToChats(
  userId: string,
  callback: (chats: Chat[]) => void
): Unsubscribe {
  const q = query(
    collection(db, "chats"),
    where("participants", "array-contains", userId),
    orderBy("updatedAt", "desc")
  );

  return onSnapshot(q, (snapshot) => {
    const chats = snapshot.docs.map(docToChat);
    callback(chats);
  });
}

export async function markChatAsRead(
  chatId: string,
  userId: string
): Promise<void> {
  const chatRef = doc(db, "chats", chatId);
  await updateDoc(chatRef, {
    [`unreadCount.${userId}`]: 0,
  });
}

export async function getOrCreateChat(
  currentUserId: string,
  currentUserName: string,
  currentUserPhoto: string | undefined,
  otherUserId: string,
  otherUserName: string,
  otherUserPhoto: string | undefined,
  matchId?: string
): Promise<string> {
  const participants = [currentUserId, otherUserId].sort();

  const existingChat = await findExistingChat(participants);
  if (existingChat) {
    return existingChat.id;
  }

  return createChat(
    participants,
    {
      [currentUserId]: currentUserName,
      [otherUserId]: otherUserName,
    },
    {
      [currentUserId]: currentUserPhoto || "",
      [otherUserId]: otherUserPhoto || "",
    },
    matchId
  );
}

function docToChat(doc: DocumentSnapshot | QueryDocumentSnapshot): Chat {
  const data = doc.data()!;
  return {
    id: doc.id,
    participants: data.participants,
    participantNames: data.participantNames || {},
    participantPhotos: data.participantPhotos || {},
    lastMessage: data.lastMessage
      ? {
          text: data.lastMessage.text,
          senderId: data.lastMessage.senderId,
          createdAt: data.lastMessage.createdAt?.toDate() || new Date(),
        }
      : undefined,
    matchId: data.matchId,
    unreadCount: data.unreadCount || {},
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  };
}

function docToMessage(doc: QueryDocumentSnapshot): Message {
  const data = doc.data();
  return {
    id: doc.id,
    chatId: doc.ref.parent.parent?.id || "",
    text: data.text,
    senderId: data.senderId,
    senderName: data.senderName,
    createdAt: data.createdAt?.toDate() || new Date(),
    read: data.read || false,
  };
}
