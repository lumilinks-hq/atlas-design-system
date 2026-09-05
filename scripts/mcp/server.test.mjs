// @vitest-environment node
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it } from "vitest";
import { createAtlasMcpServer } from "./server.mjs";

const connections = [];

afterEach(async () => {
  await Promise.all(connections.splice(0).map(({ client, server }) => Promise.all([client.close(), server.close()])));
});

async function connect() {
  const server = createAtlasMcpServer();
  const client = new Client({ name: "atlas-test-client", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  connections.push({ client, server });
  return client;
}

describe("Atlas MCP server", () => {
  it("explains id formats, return shape, and failure mode in the tool description", async () => {
    const client = await connect();
    const { tools } = await client.listTools();
    const tool = tools.find((candidate) => candidate.name === "resolve_design_contract");
    expect(tool.description).toContain("pattern.page-layout#collection-table");
    expect(tool.description).toContain("example.account-management");
    expect(tool.description).toContain("resources");
    expect(tool.description).toMatch(/error/i);
    expect(tool.inputSchema.properties.patterns.description).toContain("pattern.");
    expect(tool.inputSchema.properties.examples.description).toContain("example.");

    const { resources } = await client.listResources();
    const resource = resources.find((candidate) => candidate.uri === "atlas://design/patterns/page-layout");
    expect(resource.description).toContain("resolve_design_contract");
  });

  it("lists and reads Atlas resources", async () => {
    const client = await connect();
    const listed = await client.listResources();
    expect(listed.resources.some((resource) => resource.uri === "atlas://design/patterns/page-layout")).toBe(true);
    expect(listed.resources.some((resource) => resource.uri === "atlas://design/patterns/spacing-layout")).toBe(true);
    expect(listed.resources.some((resource) => resource.uri === "atlas://design/patterns/visual-grouping")).toBe(true);
    expect(listed.resources.some((resource) => resource.uri === "atlas://design/patterns/mobile-layout")).toBe(true);

    const result = await client.readResource({ uri: "atlas://design/examples/account-management" });
    expect(result.contents[0].text).toContain('"id": "example.account-management"');
  });

  it("resolves a design contract through a read-only tool", async () => {
    const client = await connect();
    const result = await client.callTool({
      name: "resolve_design_contract",
      arguments: {
        patterns: [
          "pattern.page-layout#collection-table",
          "pattern.page-layout#single-one-column",
          "pattern.visual-grouping#surface-group",
          "pattern.mobile-layout#responsive-collection",
        ],
        examples: ["example.account-management"],
      },
    });
    expect(result.isError).not.toBe(true);
    expect(result.content[0].text).toContain("component.button");
  });

  it("returns protocol errors for unknown contract references", async () => {
    const client = await connect();
    const unknownPattern = await client.callTool({
      name: "resolve_design_contract",
      arguments: { patterns: ["pattern.unknown#missing"], examples: [] },
    });
    const unknownVariant = await client.callTool({
      name: "resolve_design_contract",
      arguments: { patterns: ["pattern.page-layout#missing"], examples: [] },
    });
    const emptyRequest = await client.callTool({
      name: "resolve_design_contract",
      arguments: { patterns: [], examples: [] },
    });

    expect(unknownPattern.isError).toBe(true);
    expect(unknownPattern.content[0].text).toContain("Unknown pattern reference");
    expect(unknownVariant.isError).toBe(true);
    expect(unknownVariant.content[0].text).toContain("Unknown pattern variant");
    expect(emptyRequest.isError).toBe(true);
    expect(emptyRequest.content[0].text).toContain("At least one pattern or example reference is required");
  });

  it("rejects resources outside the published Atlas catalog", async () => {
    const client = await connect();
    await expect(client.readResource({ uri: "atlas://design/private-file" })).rejects.toThrow();
  });
});
