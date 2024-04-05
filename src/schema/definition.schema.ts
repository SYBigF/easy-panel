import { z } from "zod";
import {
  ChatGPTSharedInstanceAttributesSchema,
  ChatGPTSharedOAuthEventContentSchema,
  ChatGPTSharedResourceUsageLogDetailsSchema,
} from "./service/chatgpt-shared.schema";

export const ServiceInstanceAttributesSchema = z.discriminatedUnion("type", [ChatGPTSharedInstanceAttributesSchema]);

export const UserLoginEventContentSchema = z.object({
  type: z.literal("user.login"),
  method: z.enum(["password", "oidc"]),
  ip: z.string().ip().optional(),
});

export const UserCreateEventContentCreatedBySchema = z.enum(["admin", "oidc"]);
export type UserCreateEventContentCreatedBy = z.infer<typeof UserCreateEventContentCreatedBySchema>;

export const UserCreateEventContentSchema = z.object({
  type: z.literal("user.create"),
  userId: z.string(),
  username: z.string(),
  email: z.string().email(),
  createdBy: UserCreateEventContentCreatedBySchema,
  ip: z.string().ip().optional(),
});

export const EventContentSchema = z.discriminatedUnion("type", [
  ChatGPTSharedOAuthEventContentSchema,
  UserLoginEventContentSchema,
  UserCreateEventContentSchema,
]);
export type EventContent = z.infer<typeof EventContentSchema>;

export const ResourceEventTypeSchema = z.enum(["consume"]);

export const ResourcePermissionSchema = z.enum(["view", "use"]);

export const ResourceUsageLogDetailsSchema = z.discriminatedUnion("type", [ChatGPTSharedResourceUsageLogDetailsSchema]);
export type ResourceUsageLogDetails = z.infer<typeof ResourceUsageLogDetailsSchema>;
