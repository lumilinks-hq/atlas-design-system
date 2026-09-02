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
      { title: resource.name, description: resource.path, mimeType: resource.mimeType },
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
      description: "Resolve Atlas Pattern and Example IDs to the minimum read-only resource set needed for implementation.",
      inputSchema: {
        patterns: z.array(z.string()).default([]),
        examples: z.array(z.string()).default([]),
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
