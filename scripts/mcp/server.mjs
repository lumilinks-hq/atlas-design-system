import { pathToFileURL } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod/v4";
import { atlasResources, readAtlasResource, resolveDesignContract } from "../design-catalog.mjs";
import "../validate-design.mjs";

export function createAtlasMcpServer() {
  const server = new McpServer({ name: "atlas-design-system", version: "1.0.0" });

  for (const resource of atlasResources) {
    server.registerResource(
      resource.id,
      resource.uri,
      {
        title: resource.name,
        description: `Atlas design resource "${resource.id}" (${resource.path}). Read-only. Read it when resolve_design_contract lists this id in its resources array.`,
        mimeType: resource.mimeType,
      },
      async () => {
        const resolved = readAtlasResource(resource.uri);
        return { contents: [{ uri: resolved.uri, mimeType: resolved.mimeType, text: resolved.text }] };
      },
    );
  }

  server.registerTool(
    "resolve_design_contract",
    {
      title: "Resolve Atlas design contract",
      description: [
        "Resolve Atlas Pattern and Example IDs to the minimum read-only set of design resources needed to implement a screen.",
        "Call this once before reading any Atlas file. It returns { version, requested, screens, resources }; resources lists the exact resource URIs to read (shared design docs, the requested patterns and examples, and the HeroUI components each example depends on).",
        'IDs look like "pattern.page-layout#collection-table" (pattern id with optional #variant) and "example.account-management". At least one pattern or example is required.',
        "An unknown pattern or example id, or an unknown component referenced by an example, returns an error; nothing partial is returned.",
        "Do not call it to browse the catalog; list resources instead.",
      ].join(" "),
      inputSchema: {
        patterns: z.array(z.string()).default([]).describe('Pattern ids from HARNESS.json designRefs, e.g. "pattern.page-layout#collection-table". Empty when the screen has no pattern.'),
        examples: z.array(z.string()).default([]).describe('Example ids, e.g. "example.account-management". Empty when no example applies.'),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ patterns, examples }) => {
      try {
        const result = resolveDesignContract({ patterns, examples });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], structuredContent: result };
      } catch (error) {
        return { isError: true, content: [{ type: "text", text: error instanceof Error ? error.message : String(error) }] };
      }
    },
  );

  return server;
}

async function main() {
  const server = createAtlasMcpServer();
  await server.connect(new StdioServerTransport());
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "Atlas MCP server failed");
    process.exitCode = 1;
  });
}
