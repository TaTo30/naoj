import { schema } from "@naoj/core";
import type { ITableSchema } from "@naoj/core";

export const notesTable: ITableSchema = schema
  .table("notes")
  .id()
  .text("title")
  .default("Untitled")
  .text("content")
  .default("")
  .json("tags")
  .default("[]")
  .nullable()
  .text("path")
  .default("/") // directory path, e.g. "/" or "/food"
  .datetime("created_at")
  .default("CURRENT_TIMESTAMP")
  .datetime("updated_at")
  .default("CURRENT_TIMESTAMP")
  .integer("deleted")
  .default(0)
  .build();
