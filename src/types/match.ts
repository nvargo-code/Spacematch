export type MatchStatus = "pending" | "paid" | "connected";

export interface Match {
  id: string;
  seekerPostId: string;
  landlordPostId: string;
  seekerId: string;
  landlordId: string;
  matchScore: number;
  status: MatchStatus;
  stripePaymentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Connection {
  id: string;
  userId: string;
  connectedUserId: string;
  matchId: string;
  amount: number;
  createdAt: Date;
}

export interface MatchResult {
  post: {
    id: string;
    title: string;
    authorName: string;
  };
  score: number;
  matchingAttributes: string[];
}
