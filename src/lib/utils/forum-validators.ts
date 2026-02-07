import { z } from "zod";

export const communityPostSchema = z.object({
  title: z
    .string()
    .min(5, "Title must be at least 5 characters")
    .max(100, "Title must be less than 100 characters"),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(5000, "Description must be less than 5000 characters"),
  category: z.enum([
    "general",
    "tips-tricks",
    "space-ideas",
    "success-stories",
    "looking-for",
    "feedback",
  ]),
  images: z.array(z.string()).max(5, "Maximum 5 images allowed").optional(),
});

export const replySchema = z.object({
  body: z
    .string()
    .min(1, "Reply cannot be empty")
    .max(2000, "Reply must be less than 2000 characters"),
});

export type CommunityPostFormData = z.infer<typeof communityPostSchema>;
export type ReplyFormData = z.infer<typeof replySchema>;
