# @protypic/mcp

MCP server for [protypic.ai](https://protypic.ai) — upload, list, and delete prototypes from any MCP-compatible harness.

## Install / run

```bash
npx @protypic/mcp
```

Or pin in your harness config (Claude Desktop example):

```jsonc
{
  "mcpServers": {
    "protypic": {
      "command": "npx",
      "args": ["-y", "@protypic/mcp"],
      "env": {
        "PROTYPIC_API_TOKEN": "ptk_..."
      }
    }
  }
}
```

Generate the token at [protypic.ai/settings](https://protypic.ai/settings).

## Tools

| Tool | Description |
| --- | --- |
| `upload_prototype` | Upload a single HTML file or a folder of static assets. Returns URL + access code + expiration. |
| `list_prototypes` | List your uploaded prototypes. |
| `get_prototype` | Get metadata for a single prototype. |
| `delete_prototype` | Permanently delete a prototype. |

## Env vars

- `PROTYPIC_API_TOKEN` (required) — API token from the portal.
- `PROTYPIC_BASE_URL` (optional, default `https://protypic.ai`) — for self-hosted or staging deployments.
