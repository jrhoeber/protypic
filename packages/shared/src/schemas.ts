import { z } from "zod";
import {
  MAX_FILES_PER_PROTOTYPE,
  MAX_SINGLE_FILE_BASE64_CHARS,
} from "./constants";

export const expirationDaysSchema = z.union([
  z.literal(1),
  z.literal(7),
  z.literal(30),
  z.literal(90),
  z.null(),
]);

export const createPrototypeMetaSchema = z.object({
  name: z.string().min(1).max(120),
  expirationDays: expirationDaysSchema.default(7),
  isProtected: z.boolean().default(true),
});
export type CreatePrototypeMeta = z.infer<typeof createPrototypeMetaSchema>;

export const uploadFileSchema = z.object({
  path: z
    .string()
    .min(1)
    .max(512)
    .refine((p) => !p.startsWith("/") && !p.includes(".."), {
      message: "path must be relative and may not contain '..'",
    }),
  contentBase64: z.string().min(1).max(MAX_SINGLE_FILE_BASE64_CHARS),
});
export type UploadFile = z.infer<typeof uploadFileSchema>;

export const uploadRequestSchema = createPrototypeMetaSchema.extend({
  files: z.array(uploadFileSchema).min(1).max(MAX_FILES_PER_PROTOTYPE),
});
export type UploadRequest = z.infer<typeof uploadRequestSchema>;

export const createTokenRequestSchema = z.object({
  name: z.string().min(1).max(80),
});
export type CreateTokenRequest = z.infer<typeof createTokenRequestSchema>;
