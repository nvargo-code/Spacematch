import { z } from "zod";

export const emailSchema = z.string().email("Please enter a valid email address");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

export const displayNameSchema = z
  .string()
  .min(2, "Display name must be at least 2 characters")
  .max(50, "Display name must be less than 50 characters");

export const postTitleSchema = z
  .string()
  .min(5, "Title must be at least 5 characters")
  .max(100, "Title must be less than 100 characters");

export const postDescriptionSchema = z
  .string()
  .min(20, "Description must be at least 20 characters")
  .max(2000, "Description must be less than 2000 characters");

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: displayNameSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const postSchema = z.object({
  type: z.enum(["need", "space"]),
  title: postTitleSchema,
  description: postDescriptionSchema,
  images: z.array(z.string()).max(5, "Maximum 5 images allowed"),
  attributes: z.object({
    sizeCategory: z.enum(["small", "medium", "large", "extra-large"]).optional(),
    environment: z.enum(["indoor", "outdoor", "mixed"]).optional(),
    utilities: z.array(z.enum(["electricity", "water", "wifi", "hvac", "gas"])).optional(),
    budget: z.object({
      min: z.number().min(0),
      max: z.number().min(0),
      period: z.enum(["hourly", "daily", "weekly", "monthly", "long-term"]),
    }).optional(),
    duration: z.enum(["hourly", "daily", "weekly", "monthly", "long-term"]).optional(),
    location: z.string().optional(),
    hasParking: z.boolean().optional(),
    privacyLevel: z.enum(["private", "semi-private", "shared"]).optional(),
    hasRestroom: z.boolean().optional(),
    adaAccessible: z.boolean().optional(),
    petsAllowed: z.boolean().optional(),
    climateControlled: z.boolean().optional(),
    noiseLevel: z.enum(["quiet", "moderate", "loud"]).optional(),
    userTypes: z.array(z.enum(["artist", "musician", "maker", "photographer", "craftsperson", "educator", "entrepreneur", "other"])).optional(),
    customTags: z.array(z.string().max(30)).optional(),
  }),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export type SignUpFormData = z.infer<typeof signUpSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type PostFormData = z.infer<typeof postSchema>;
