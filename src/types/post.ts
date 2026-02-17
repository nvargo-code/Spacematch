import { PostAttributes } from "./attributes";
import { ForumCategory } from "./forum";

export type PostType = "need" | "space" | "community";
export type PostStatus = "active" | "closed" | "deleted";

export interface Post {
  id: string;
  type: PostType;
  authorId: string;
  authorName: string;
  authorPhotoURL?: string;
  title: string;
  description: string;
  images: string[];
  attributes: PostAttributes;
  searchKeywords: string[];
  status: PostStatus;
  createdAt: Date;
  updatedAt: Date;
  // Community forum fields
  category?: ForumCategory;
  replyCount?: number;
  // Availability calendar fields
  hasAvailability?: boolean;
  availabilityStart?: Date;
  availabilityEnd?: Date;
  // Import fields
  source?: "manual" | "csv-import" | "rapidapi" | string;
  externalId?: string;
  externalUrl?: string;
  isImported?: boolean;
}

export interface CreatePostData {
  type: PostType;
  title: string;
  description: string;
  images: string[];
  attributes: PostAttributes;
  category?: ForumCategory;
}

export interface PostFilter {
  type?: PostType;
  sizeCategory?: string;
  environment?: string;
  utilities?: string[];
  minBudget?: number;
  maxBudget?: number;
  duration?: string;
  location?: string;
  hasParking?: boolean;
  privacyLevel?: string;
  hasRestroom?: boolean;
  adaAccessible?: boolean;
  petsAllowed?: boolean;
  climateControlled?: boolean;
  noiseLevel?: string;
  userTypes?: string[];
}
