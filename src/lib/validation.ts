import { z } from "zod";
import { GENRES, MANHWA_STATUSES, USER_ROLES, USER_STATUSES } from "@/lib/constants";

const USERNAME_PATTERN = /^[A-Za-z0-9_.-]+$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LINK_OR_PATH_PATTERN = /^(https?:\/\/[^\s]+|\/(?!\/)[^\s]*)$/;

/* ---------------- Accounts ---------------- */

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters.")
  .max(32, "Username must be 32 characters or fewer.")
  .regex(
    USERNAME_PATTERN,
    "Username may only contain letters, numbers, underscores, hyphens, and dots.",
  );

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(5, "Enter a valid email address.")
  .max(254, "Email address is too long.")
  .regex(EMAIL_PATTERN, "Enter a valid email address.");

export const passwordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters.")
  .max(128, "Password must be 128 characters or fewer.");

const MISMATCH_MESSAGE = "Passwords do not match.";

export const setupSchema = z
  .object({
    username: usernameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().optional(),
    setupToken: z.string().max(200).optional(),
  })
  .refine((v) => v.confirmPassword === undefined || v.password === v.confirmPassword, {
    message: MISMATCH_MESSAGE,
    path: ["confirmPassword"],
  });

export const registerSchema = z
  .object({
    username: usernameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().optional(),
    role: z.enum(USER_ROLES).optional().default("user"),
  })
  .refine((v) => v.confirmPassword === undefined || v.password === v.confirmPassword, {
    message: MISMATCH_MESSAGE,
    path: ["confirmPassword"],
  });

export const adminCreateUserSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
  role: z.enum(USER_ROLES).default("user"),
});

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Enter your username or email.").max(254),
  password: z.string().min(1, "Enter your password.").max(128),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(20, "This reset link is invalid.").max(200),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: MISMATCH_MESSAGE,
    path: ["confirmPassword"],
  });

export const profileUpdateSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  currentPassword: z.string().max(128).optional(),
});

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password.").max(128),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: MISMATCH_MESSAGE,
    path: ["confirmPassword"],
  });

/* ---------------- Library and reading ---------------- */

export const bookmarkSchema = z.object({
  manhwaId: z.coerce.number().int().positive(),
});

export const progressSchema = z.object({
  chapterId: z.number().int().positive(),
  scrollPosition: z.number().min(0).max(1),
  completed: z.boolean().optional(),
  opened: z.boolean().optional(),
});

/* ---------------- Catalogue (admin) ---------------- */

const titleField = z
  .string()
  .trim()
  .min(1, "Title is required.")
  .max(200, "Title must be 200 characters or fewer.");

const slugField = z
  .string()
  .trim()
  .toLowerCase()
  .max(120, "Slug is too long.")
  .refine((v) => v === "" || SLUG_PATTERN.test(v), {
    message: "Slug may only contain lowercase letters, numbers and hyphens.",
  });

const textList = (max: number, itemMax: number) =>
  z.array(z.string().trim().min(1).max(itemMax)).max(max);

const coverField = z.union([
  z.literal(""),
  z.null(),
  z
    .string()
    .trim()
    .max(1000)
    .regex(LINK_OR_PATH_PATTERN, "Cover must be an https:// link or an uploaded image."),
]);

const manhwaBase = z.object({
  title: titleField,
  slug: slugField,
  alternativeTitles: textList(20, 200),
  synopsis: z.string().trim().max(5000, "Synopsis must be 5000 characters or fewer."),
  authors: textList(10, 120),
  artists: textList(10, 120),
  genres: z.array(z.enum(GENRES)).max(8, "Choose up to 8 genres."),
  status: z.enum(MANHWA_STATUSES),
  coverUrl: coverField,
  isFeatured: z.boolean(),
});

export const manhwaCreateSchema = manhwaBase.partial().extend({ title: titleField });
export const manhwaUpdateSchema = manhwaBase.partial();

const chapterNumber = z
  .number()
  .int("Chapter number must be a whole number.")
  .min(0, "Chapter number cannot be negative.")
  .max(100000, "Chapter number is too large.");

const pageUrl = z
  .string()
  .trim()
  .min(1)
  .max(1000)
  .regex(LINK_OR_PATH_PATTERN, "Each page must be an https:// link or an uploaded image.");

export const chapterCreateSchema = z.object({
  manhwaId: z.number().int().positive(),
  number: chapterNumber,
  title: z.string().trim().max(200, "Chapter title is too long.").optional(),
  pages: z.array(pageUrl).max(500, "A chapter can have at most 500 pages.").optional(),
});

export const chapterUpdateSchema = z.object({
  number: chapterNumber.optional(),
  title: z.string().trim().max(200, "Chapter title is too long.").optional(),
  pages: z.array(pageUrl).max(500, "A chapter can have at most 500 pages.").optional(),
});

/* ---------------- User management (admin) ---------------- */

export const adminUserUpdateSchema = z
  .object({
    role: z.enum(USER_ROLES).optional(),
    status: z.enum(USER_STATUSES).optional(),
  })
  .refine((v) => v.role !== undefined || v.status !== undefined, {
    message: "Nothing to update.",
  });
