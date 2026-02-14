import { z } from "zod";

export const childIdParamSchema = z.object({
  childId: z.string().uuid()
});

export type ChildIdParams = z.infer<typeof childIdParamSchema>;
