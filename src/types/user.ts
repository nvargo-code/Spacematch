export type UserRole = "seeker" | "landlord";

export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole | null;
  bio?: string;
  location?: string;
  createdAt: Date;
  stripeCustomerId?: string;
  activePostCount: number;
  extraPostCredits: number;
}

export interface CreateUserData {
  email: string;
  displayName: string;
  photoURL?: string;
}
