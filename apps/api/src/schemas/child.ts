import { z } from "zod";

export const createChildSchema = z.object({
  name: z.string().trim().min(1).max(80),
  birthDate: z.string().date(),
  sex: z.enum(["M", "F"])
});

export type CreateChildDto = z.infer<typeof createChildSchema>;
