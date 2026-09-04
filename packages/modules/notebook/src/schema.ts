import { schema } from "@naoj/core";
import type { ITableSchema } from "@naoj/core";

const MODULE_NAME = "notebook_";

export const notesTable: ITableSchema = schema
  .table(MODULE_NAME + "notes")
  .id()
  .text("title")
  .default("untitled")
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
