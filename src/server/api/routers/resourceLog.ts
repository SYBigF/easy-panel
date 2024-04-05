import { createTRPCRouter, protectedWithUserProcedure, type TRPCContext, protectedProcedure } from "@/server/trpc";
import { PaginationInputSchema } from "@/schema/pagination.schema";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  ResourceUsageLogWhereInputSchema,
  type GPT4LogGroupbyAccountResult,
  type ResourceLogSumResult,
  ResourceUsageLogSchema,
} from "@/schema/resourceLog.schema";
import { paginateQuery } from "../pagination";
import { type SQL, and, count, eq, gte, lte, sql } from "drizzle-orm";
import { resourceUsageLogs } from "@/server/db/schema";
import { UserRoles } from "@/schema/user.schema";
import { DURATION_WINDOWS, DurationWindow, DurationWindowSchema, ServiceTypeSchema } from "@/server/db/enum";

const sumChatGPTSharedLogsInDurationWindows = async ({
  ctx,
  durationWindows,
  userId,
  instanceId,
}: {
  ctx: TRPCContext;
  durationWindows: DurationWindow[];
  userId?: string;
  instanceId?: string;
}): Promise<ResourceLogSumResult[]> => {
  const results = [] as ResourceLogSumResult[];

  for (const durationWindow of durationWindows) {
    const durationWindowSeconds = DURATION_WINDOWS[durationWindow];
    const aggResult = await ctx.db
      .select({
        userId: resourceUsageLogs.userId,
        count: count(),
        sumUtf8Length: sql<number>`sum(${resourceUsageLogs.textBytes})`.mapWith(Number),
        // sumTokensLength: sum(resourceUsageLogs.tokensLength).mapWith(Number),
        sumTokensLength: sql<number>`0`.mapWith(Number), // todo
      })
      .from(resourceUsageLogs)
      .where(
        and(
          gte(resourceUsageLogs.timestamp, new Date(new Date().getTime() - durationWindowSeconds * 1000)),
          eq(resourceUsageLogs.type, ServiceTypeSchema.Values.CHATGPT_SHARED),
          userId ? eq(resourceUsageLogs.userId, userId) : sql`true`,
          instanceId ? eq(resourceUsageLogs.instanceId, instanceId) : sql`true`,
        ),
      )
      .groupBy(resourceUsageLogs.userId);

    results.push({
      durationWindow,
      stats: aggResult,
    });
  }

  return results;
};

const groupGPT4LogsInDurationWindow = async ({
  ctx,
  durationWindow,
  instanceId,
}: {
  ctx: TRPCContext;
  durationWindow: DurationWindow;
  instanceId?: string;
}): Promise<GPT4LogGroupbyAccountResult> => {
  const durationWindowSeconds = DURATION_WINDOWS[durationWindow];
  const groupByResult = await ctx.db
    .select({
      chatgptAccountId: sql<string | null>`${resourceUsageLogs.details} ->> 'chatgptAccountId'`,
      _count: count(),
    })
    .from(resourceUsageLogs)
    .where(
      and(
        eq(resourceUsageLogs.type, ServiceTypeSchema.Values.CHATGPT_SHARED),
        sql`${resourceUsageLogs.timestamp} >= ${new Date(new Date().getTime() - durationWindowSeconds * 1000)}`,
        instanceId ? sql`${resourceUsageLogs.instanceId} = ${instanceId}` : sql`true`,
        sql`${resourceUsageLogs.details} ->> 'model' LIKE 'gpt-4%'`,
      ),
    )
    .groupBy(sql`${resourceUsageLogs.details} ->> 'chatgptAccountId'`);
  const result = {
    durationWindow,
    counts: groupByResult.map((item) => ({
      chatgptAccountId: item.chatgptAccountId,
      count: item._count,
    })),
  };
  return result;
};

const PaginationResourceLogsInputSchema = z.object({
  where: ResourceUsageLogWhereInputSchema,
  pagination: PaginationInputSchema,
});

const getPaginatedResourceLogs = async ({
  input,
  ctx,
}: {
  input: z.infer<typeof PaginationResourceLogsInputSchema>;
  ctx: TRPCContext;
}) => {
  return paginateQuery({
    pagination: input.pagination,
    ctx,
    responseItemSchema: ResourceUsageLogSchema,
    handle: async ({ skip, take, ctx }) => {
      const where = input.where;
      const andParams = [] as SQL[];
      if (where.userId) {
        andParams.push(eq(resourceUsageLogs.userId, where.userId));
      }
      if (where.instanceId) {
        andParams.push(eq(resourceUsageLogs.instanceId, where.instanceId));
      }
      if (where.timestampStart) {
        andParams.push(gte(resourceUsageLogs.timestamp, where.timestampStart));
      }
      if (where.timestampEnd) {
        andParams.push(lte(resourceUsageLogs.timestamp, where.timestampEnd));
      }
      const filter = and(...andParams);
      const { total, result } = await ctx.db.transaction(async (tx) => {
        const total = await tx
          .select({
            value: count(),
          })
          .from(resourceUsageLogs)
          .where(and(...andParams));
        const result = await tx.select().from(resourceUsageLogs).where(filter).limit(take).offset(skip);
        return { result, total: total[0]!.value };
      });
      return { result, total };
    },
  });
};

export const resourceLogRouter = createTRPCRouter({
  getMany: protectedWithUserProcedure
    .input(
      z.object({
        where: ResourceUsageLogWhereInputSchema,
        pagination: PaginationInputSchema,
      }),
    )
    .query(async ({ input, ctx }) => {
      const user = ctx.user;
      if (user.role !== UserRoles.ADMIN && user.id !== input.where.userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You are not allowed to access this data" });
      }
      return getPaginatedResourceLogs({ input, ctx });
    }),

  sumLogsInDurationWindowsByUserId: protectedWithUserProcedure
    .input(
      z.object({
        userId: z.string().optional(),
        durationWindows: DurationWindowSchema.array(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const userId = input.userId ?? ctx.user.id;
      if (ctx.user.role !== UserRoles.ADMIN && ctx.user.id !== userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You are not allowed to access this data" });
      }
      return sumChatGPTSharedLogsInDurationWindows({
        ctx,
        durationWindows: input.durationWindows,
        userId,
      });
    }),

  sumLogsInDurationWindowsByInstance: protectedProcedure
    .input(
      z.object({
        instanceId: z.string(),
        durationWindows: DurationWindowSchema.array(),
      }),
    )
    .query(async ({ input, ctx }) => {
      // TODO: Check if the user has access to the instance
      return sumChatGPTSharedLogsInDurationWindows({
        ctx,
        durationWindows: input.durationWindows,
        instanceId: input.instanceId,
      });
    }),

  sumLogsInDurationWindowsGlobal: protectedProcedure
    .input(
      z.object({
        durationWindows: DurationWindowSchema.array(),
      }),
    )
    .query(async ({ input, ctx }) => {
      return sumChatGPTSharedLogsInDurationWindows({ ctx, durationWindows: input.durationWindows });
    }),

  groupGPT4LogsInDurationWindowByInstance: protectedProcedure
    .input(
      z.object({
        instanceId: z.string(),
        durationWindow: DurationWindowSchema,
      }),
    )
    .query(async ({ input, ctx }) => {
      return groupGPT4LogsInDurationWindow({
        ctx,
        durationWindow: input.durationWindow,
        instanceId: input.instanceId,
      });
    }),
});
