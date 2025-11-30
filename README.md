# cd-mcp

MCP (Model Context Protocol) server for Czech Railways (České dráhy) API.

This server provides AI assistants with tools to search for train connections, stations, and prices on the Czech railway network, with direct links to book tickets.

## Features

- **Search Locations**: Find train stations and cities in the Czech Railways network
- **Search Connections**: Search for train connections between two stations with prices and booking links

## Installation

```bash
npm install
npm run build
```

## Usage

### With Claude Desktop

Add to your Claude Desktop configuration (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "cd-mcp": {
      "command": "node",
      "args": ["/path/to/cd-mcp/dist/index.js"]
    }
  }
}
```

### With MCP Inspector

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

### Development

```bash
npm run dev
```

## Available Tools

### search_locations

Search for train stations and cities by name.

**Parameters:**
- `query` (string, required): Search query (e.g., "Praha", "Brno")

**Example:**
```
> Search for stations: "Ostrava"
📍 Ostrava
📍 Ostrava hl.n.
📍 Ostrava střed
...
```

### search_connections

Search for train connections between two stations. Returns available trains with departure times, duration, prices, and a link to book tickets.

**Parameters:**
- `from` (string, required): Departure station or city name (e.g., "Praha", "Praha hl.n.")
- `to` (string, required): Arrival station or city name (e.g., "Brno", "Brno hl.n.")
- `departure` (string, required): Departure date/time in ISO 8601 format (e.g., "2025-12-15T08:00:00")

**Example:**
```
> Search connections from Praha to Brno on December 5, 2025 at 10:00

Found 8 connection(s) from "Praha" to "Brno":

🚆 Connection: 2025-12-05T10:35:00.000Z → 2025-12-05T13:19:00.000Z
   Duration: 2h 44m
   Transfers: 0
   Price: 465 CZK
   Legs:
     1. Praha hl.n. → Brno hl.n.
        Dep: 2025-12-05T10:35:00.000Z | Arr: 2025-12-05T13:19:00.000Z
        Train: rj 257 Vindobona Ex3
...

🎫 Book tickets: https://idos.cz/vlakyautobusymhdvse/spojeni?f=Praha&t=Brno&date=05.12.2025&time=10%3A00
```

## Design Decisions

1. **Simplified interface**: Only two tools are needed for the main use case - finding connections and prices, then booking via IDOS.

2. **Booking via IDOS**: The IDOS timetable service (idos.cz) supports deep linking with search parameters pre-filled, making it easy to click through to book tickets.

3. **Prices included in search**: Prices for adult passengers (in CZK) are automatically fetched and displayed with each connection.

4. **Read-only operations**: The server only exposes read operations (search). Booking is handled through the official ČD website for security and user experience.

## License

MIT

