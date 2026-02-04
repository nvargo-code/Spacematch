import { PostAttributes } from "./attributes";

export type PostType = "need" | "space";
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
}

export interface CreatePostData {
  type: PostType;
  title: string;
  description: string;
  images: string[];
  attributes: PostAttributes;
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
