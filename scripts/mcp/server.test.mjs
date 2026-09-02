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
  it("lists and reads Atlas resources", async () => {
    const client = await connect();
    const listed = await client.listResources();
    expect(listed.resources.some((resource) => resource.uri === "atlas://design/patterns/page-layout")).toBe(true);
    expect(listed.resources.some((resource) => resource.uri === "atlas://design/patterns/spacing-layout")).toBe(true);

    const result = await client.readResource({ uri: "atlas://design/examples/account-management" });
    expect(result.contents[0].text).toContain('"id": "example.account-management"');
  });

  it("resolves a design contract through a read-only tool", async () => {
    const client = await connect();
    const result = await client.callTool({
      name: "resolve_design_contract",
      arguments: {
        patterns: ["pattern.page-layout#collection-table", "pattern.page-layout#single-one-column"],
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
