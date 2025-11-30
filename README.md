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
> Search connections from Praha to Brno on December 15, 2025 at 10:00

Found 8 connection(s) from "Praha" to "Brno":

🚆 Connection: 2025-12-15T10:36:00.000Z → 2025-12-15T13:13:00.000Z
   Duration: 2h 37m
   Transfers: 0
   Price: 269 CZK
   Legs:
     1. Praha-Holešovice → Brno hl.n.
        Dep: 2025-12-15T10:36:00.000Z | Arr: 2025-12-15T13:13:00.000Z
        Train: rj 251 Vindobona Ex3
...

🎫 Book tickets at: https://www.cd.cz/spojeni-a-jizdenka/?fromCity=Praha&toCity=Brno&dateTime=2025-12-15T10:00
```

## Design Decisions

1. **Simplified interface**: Only two tools are needed for the main use case - finding connections and prices, then booking via the official website.

2. **Booking via official website**: Instead of complex booking flows, users get a direct link to book tickets on cd.cz. This ensures they get the official booking experience with all options.

3. **Prices included in search**: Prices for adult passengers are automatically fetched and displayed with each connection.

4. **Read-only operations**: The server only exposes read operations (search). Booking is handled through the official ČD website for security and user experience.

## License

MIT

