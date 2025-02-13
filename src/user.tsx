import { z } from "zod";

export const User = z.object({
  discordUsername: z.optional(z.string()),
  discordId: z.optional(z.string()),
  discordMessageId: z.optional(z.string()),
  commentId: z.optional(z.string()),
  verificationCode: z.optional(z.string()),
  verificationStatus: z.boolean().default(false),
  roles: z.array(z.string()),
});

export const SafeUser = User.omit({ verificationCode: true });
export type User = z.infer<typeof User>;
export type SafeUser = z.infer<typeof SafeUser>;
