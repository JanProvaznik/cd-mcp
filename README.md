# cd-mcp

MCP (Model Context Protocol) server for Czech Railways (České dráhy) API.

This server provides AI assistants with tools to search for train connections, stations, and prices on the Czech railway network.

## Features

- **Search Locations**: Find train stations and cities in the Czech Railways network
- **Search Connections**: Search for train connections between two stations
- **Get Connection Details**: Get detailed information about a specific connection
- **Get Passenger Types**: List available passenger types and discount categories
- **Get Price Offers**: Get pricing information for connections

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
- `type` (string, optional): Location type filter (e.g., "station", "city")

### search_connections

Search for train connections between two stations.

**Parameters:**
- `from` (string, required): Departure station
- `to` (string, required): Arrival station
- `departure` (string, required): Departure date/time in ISO 8601 format
- `passengers` (number, optional): Number of passengers (1-9, default: 1)

### get_connection_details

Get detailed information about a specific connection.

**Parameters:**
- `handle` (string, required): Connection search handle from previous search
- `connectionId` (string, required): Connection identifier

### get_passenger_types

Get available passenger types and discount categories.

**Parameters:** None

### get_price_offer

Get a price offer for a connection (read-only, does not book tickets).

**Parameters:**
- `connectionId` (string, required): Connection identifier
- `passengers` (array, required): Array of passenger types and counts

## Design Decisions

As a Principal Architect, the following design decisions were made:

1. **Read-only operations only**: The server only exposes read operations (search, get details, pricing). Booking, payment, and refund operations are intentionally excluded for security reasons - these should require explicit user action through official channels.

2. **Stdio transport**: Uses stdio transport for simple integration with MCP clients like Claude Desktop. HTTP transport can be added if needed.

3. **Error handling**: All tools include proper error handling and return user-friendly error messages.

4. **Type safety**: Full TypeScript implementation with proper type definitions for API responses.

5. **Formatting**: Results are formatted for readability with emojis and structured text output.

## API Reference

This server interfaces with the Czech Railways Ticket API:
- Documentation: https://ticket-api.cd.cz/swaggerUI/cdapi-1.0.0.yml
- Base URL: https://ticket-api.cd.cz/api/v1

## License

MIT

