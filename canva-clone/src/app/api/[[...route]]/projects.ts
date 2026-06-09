import { z } from "zod";
import { Hono } from "hono";
import { eq, and, desc, asc } from "drizzle-orm";
import { verifyAuth } from "@hono/auth-js";
import { zValidator } from "@hono/zod-validator";

import { db } from "@/db/drizzle";
import { projects, projectsInsertSchema, users } from "@/db/schema";

const app = new Hono()
  .get(
    "/templates",
    verifyAuth(),
    zValidator(
      "query",
      z.object({
        page: z.coerce.number(),
        limit: z.coerce.number(),
      }),
    ),
    async (c) => {
      const { page, limit } = c.req.valid("query");

      const data = await db
        .select({
          id: projects.id,
          name: projects.name,
          userId: projects.userId,
          json: projects.json,
          height: projects.height,
          width: projects.width,
          thumbnailUrl: projects.thumbnailUrl,
          isTemplate: projects.isTemplate,
          isPro: projects.isPro,
          createdAt: projects.createdAt,
          updatedAt: projects.updatedAt,
          userName: users.name,
          userImage: users.image,
        })
        .from(projects)
        .leftJoin(users, eq(projects.userId, users.id))
        .where(eq(projects.isTemplate, true))
        .limit(limit)
        .offset((page -1) * limit)
        .orderBy(
          asc(projects.isPro),
          desc(projects.updatedAt),
        );

      return c.json({ data });
    },
  )
  .delete(
    "/:id",
    verifyAuth(),
    zValidator("param", z.object({ id: z.string() })),
    async (c) => {
      const auth = c.get("authUser");
      const userId = (auth?.token?.id ?? auth?.token?.sub) as string | undefined;
      const { id } = c.req.valid("param");

      if (!userId) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const data = await db
        .delete(projects)
        .where(
          and(
            eq(projects.id, id),
            eq(projects.userId, userId),
          ),
        )
        .returning();

      if (data.length === 0) {
        return c.json({ error: "Not found" }, 404);
      }

      return c.json({ data: { id } });
    },
  )
  .post(
    "/:id/duplicate",
    verifyAuth(),
    zValidator("param", z.object({ id: z.string() })),
    async (c) => {
      const auth = c.get("authUser");
      const userId = (auth?.token?.id ?? auth?.token?.sub) as string | undefined;
      const { id } = c.req.valid("param");

      if (!userId) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const data = await db
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.id, id),
            eq(projects.userId, userId),
          ),
        );

      if (data.length === 0) {
        return c.json({ error: "Not found" }, 404);
      }

      const project = data[0];

      const duplicateData = await db
        .insert(projects)
        .values({
          name: `Copy of ${project.name}`,
          json: project.json,
          width: project.width,
          height: project.height,
          userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return c.json({ data: duplicateData[0] });
    },
  )
  .get(
    "/",
    verifyAuth(),
    zValidator(
      "query",
      z.object({
        page: z.coerce.number(),
        limit: z.coerce.number(),
      }),
    ),
    async (c) => {
      const auth = c.get("authUser");
      const userId = (auth?.token?.id ?? auth?.token?.sub) as string | undefined;
      const { page, limit } = c.req.valid("query");

      if (!userId) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const data = await db
        .select({
          id: projects.id,
          name: projects.name,
          width: projects.width,
          height: projects.height,
          thumbnailUrl: projects.thumbnailUrl,
          updatedAt: projects.updatedAt,
          createdAt: projects.createdAt,
          isTemplate: projects.isTemplate,
          isPro: projects.isPro,
        })
        .from(projects)
        .where(eq(projects.userId, userId))
        .limit(limit)
        .offset((page - 1) * limit)
        .orderBy(desc(projects.updatedAt))

      return c.json({
        data,
        nextPage: data.length === limit ? page + 1 : null,
      });
    },
  )
  .patch(
    "/:id",
    verifyAuth(),
    zValidator(
      "param",
      z.object({ id: z.string() }),
    ),
    zValidator(
      "json",
      projectsInsertSchema
        .omit({
          id: true,
          userId: true,
          createdAt: true,
          updatedAt: true,
        })
        .partial()
    ),
    async (c) => {
      const auth = c.get("authUser");
      const userId = (auth?.token?.id ?? auth?.token?.sub) as string | undefined;
      const { id } = c.req.valid("param");
      const values = c.req.valid("json");

      if (!userId) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const data = await db
        .update(projects)
        .set({
          ...values,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(projects.id, id),
            eq(projects.userId, userId),
          ),
        )
        .returning();

      if (data.length === 0) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      return c.json({ data: data[0] });
    },
  )
  .get(
    "/:id",
    verifyAuth(),
    zValidator("param", z.object({ id: z.string() })),
    async (c) => {
      const auth = c.get("authUser");
      const userId = (auth?.token?.id ?? auth?.token?.sub) as string | undefined;
      const { id } = c.req.valid("param");

      if (!userId) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const data = await db
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.id, id),
            eq(projects.userId, userId),
          )
        );

      if (data.length === 0) {
        return c.json({ error: "Not found" }, 404);
      }

      return c.json({ data: data[0] });
    },
  )
  .post(
    "/",
    verifyAuth(),
    zValidator(
      "json",
      projectsInsertSchema.pick({
        name: true,
        json: true,
        width: true,
        height: true,
        thumbnailUrl: true,
        isTemplate: true,
        isPro: true,
      }),
    ),
    async (c) => {
      const auth = c.get("authUser");
      const userId = (auth?.token?.id ?? auth?.token?.sub) as string | undefined;
      const { name, json, height, width, thumbnailUrl, isTemplate, isPro } = c.req.valid("json");

      if (!userId) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const data = await db
        .insert(projects)
        .values({
          name,
          json,
          width,
          height,
          thumbnailUrl,
          isTemplate,
          isPro,
          userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      if (!data[0]) {
        return c.json({ error: "Something went wrong" }, 400);
      }

      return c.json({ data: data[0] });
    },
  );

export default app;
