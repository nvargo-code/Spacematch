export interface Chat {
  id: string;
  participants: string[];
  participantNames: Record<string, string>;
  participantPhotos: Record<string, string>;
  lastMessage?: {
    text: string;
    senderId: string;
    createdAt: Date;
  };
  matchId?: string;
  unreadCount: Record<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  chatId: string;
  text: string;
  senderId: string;
  senderName: string;
  createdAt: Date;
  read: boolean;
}

export interface CreateMessageData {
  text: string;
  senderId: string;
  senderName: string;
}
