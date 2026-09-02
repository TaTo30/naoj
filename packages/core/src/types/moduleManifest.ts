import { z } from "zod";

export const ModuleManifestSchema = z.object({
  name: z
    .string()
    .regex(
      /^[a-z][a-z0-9-]*$/,
      "Must be lowercase letters, numbers, and hyphens starting with a letter",
    ),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, "Must follow semver format (e.g. 1.0.0)"),
  description: z.string().optional(),
  icon: z.string().optional(),
  primaryRoute: z.string().optional(),
  minCoreVersion: z.string().optional(),
  tables: z
    .array(z.string().regex(/^[a-z][a-z0-9_]*$/, "Table names must be lowercase with underscores"))
    .default([]),
  components: z.record(z.string()).default({}),
  entrypoint: z.string(),
});

export type IModuleManifest = z.infer<typeof ModuleManifestSchema>;

export function validateManifest(raw: unknown): IModuleManifest {
  return ModuleManifestSchema.parse(raw);
}

export function safeValidateManifest(
  raw: unknown,
): { success: true; data: IModuleManifest } | { success: false; error: z.ZodError } {
  const result = ModuleManifestSchema.safeParse(raw);
  return result.success
    ? { success: true, data: result.data }
    : { success: false, error: result.error };
}
