#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { ProtypicClient, ApiError } from "./client.js";
import { loadPath } from "./files.js";

const BASE_URL = process.env.PROTYPIC_BASE_URL || "https://protypic.ai";
const TOKEN = process.env.PROTYPIC_API_TOKEN;

if (!TOKEN) {
  console.error("PROTYPIC_API_TOKEN is required. Generate one at https://protypic.ai/settings.");
  process.exit(1);
}

const client = new ProtypicClient(BASE_URL, TOKEN);

const uploadInput = z.object({
  name: z.string().min(1).describe("Display name for the prototype."),
  path: z
    .string()
    .min(1)
    .describe("Absolute path to a single HTML file or a folder of static assets."),
  expirationDays: z
    .union([z.literal(1), z.literal(7), z.literal(30), z.literal(90), z.null()])
    .default(7)
    .describe("How long the prototype stays live. null = never expire."),
  isProtected: z
    .boolean()
    .default(true)
    .describe("If true, viewers must enter an access code."),
});

const idInput = z.object({ id: z.string().min(1) });

const tools = [
  {
    name: "upload_prototype",
    description:
      "Upload a frontend prototype. Provide a path to a single HTML file or a folder " +
      "of static assets (HTML/CSS/JS/images). Returns the public URL, access code, and expiration.",
    inputSchema: zodToJsonSchema(uploadInput),
  },
  {
    name: "list_prototypes",
    description: "List all prototypes you have uploaded.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_prototype",
    description: "Get metadata for a single prototype by id.",
    inputSchema: zodToJsonSchema(idInput),
  },
  {
    name: "delete_prototype",
    description: "Permanently delete a prototype.",
    inputSchema: zodToJsonSchema(idInput),
  },
];

const server = new Server(
  { name: "protypic", version: "0.0.1" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: rawArgs } = req.params;
  try {
    if (name === "upload_prototype") {
      const args = uploadInput.parse(rawArgs);
      const files = await loadPath(args.path);
      const result = await client.upload({
        name: args.name,
        expirationDays: args.expirationDays,
        isProtected: args.isProtected,
        files,
      });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
    if (name === "list_prototypes") {
      const result = await client.list();
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
    if (name === "get_prototype") {
      const { id } = idInput.parse(rawArgs);
      const result = await client.get(id);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
    if (name === "delete_prototype") {
      const { id } = idInput.parse(rawArgs);
      await client.delete(id);
      return { content: [{ type: "text", text: `Deleted ${id}.` }] };
    }
    return {
      content: [{ type: "text", text: `Unknown tool: ${name}` }],
      isError: true,
    };
  } catch (err) {
    const msg =
      err instanceof ApiError
        ? `protypic API error (${err.status}): ${err.message}`
        : err instanceof Error
          ? err.message
          : "Unknown error";
    return { content: [{ type: "text", text: msg }], isError: true };
  }
});

function zodToJsonSchema(schema: z.ZodObject<z.ZodRawShape>): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];
  for (const [key, value] of Object.entries(schema.shape)) {
    properties[key] = zodTypeToJson(value as z.ZodTypeAny);
    if (!(value instanceof z.ZodOptional) && !(value instanceof z.ZodDefault)) required.push(key);
  }
  return { type: "object", properties, required, additionalProperties: false };
}

function zodTypeToJson(t: z.ZodTypeAny): Record<string, unknown> {
  if (t instanceof z.ZodDefault) return zodTypeToJson(t._def.innerType);
  if (t instanceof z.ZodOptional) return zodTypeToJson(t._def.innerType);
  if (t instanceof z.ZodString) {
    return t.description ? { type: "string", description: t.description } : { type: "string" };
  }
  if (t instanceof z.ZodBoolean) {
    return t.description ? { type: "boolean", description: t.description } : { type: "boolean" };
  }
  if (t instanceof z.ZodNumber) return { type: "number" };
  if (t instanceof z.ZodNull) return { type: "null" };
  if (t instanceof z.ZodLiteral) return { const: t._def.value };
  if (t instanceof z.ZodUnion) {
    return { anyOf: t._def.options.map((o: z.ZodTypeAny) => zodTypeToJson(o)) };
  }
  return {};
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
