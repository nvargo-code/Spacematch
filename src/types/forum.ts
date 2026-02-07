export type ForumCategory =
  | "general"
  | "tips-tricks"
  | "space-ideas"
  | "success-stories"
  | "looking-for"
  | "feedback";

export const FORUM_CATEGORIES: { value: ForumCategory; label: string }[] = [
  { value: "general", label: "General" },
  { value: "tips-tricks", label: "Tips & Tricks" },
  { value: "space-ideas", label: "Space Ideas" },
  { value: "success-stories", label: "Success Stories" },
  { value: "looking-for", label: "Looking For" },
  { value: "feedback", label: "Feedback" },
];

export interface ForumReply {
  id: string;
  body: string;
  authorId: string;
  authorName: string;
  authorPhotoURL?: string;
  createdAt: Date;
  updatedAt: Date;
}
