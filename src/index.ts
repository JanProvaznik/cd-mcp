#!/usr/bin/env node
/**
 * Czech Railways (České dráhy) MCP Server
 * 
 * An MCP server that provides tools for searching Czech railway
 * connections, stations, and prices with booking links.
 * 
 * Tools:
 * - search_locations: Find train stations and cities
 * - search_connections: Search for train connections with prices and booking links
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod/v4';
import { cdClient, formatConnection, formatLocation, generateBookingUrl } from './cd-api.js';

// Create the MCP server
const server = new McpServer({
  name: 'cd-mcp',
  version: '1.0.0',
});

/**
 * Tool: search_locations
 * Search for train stations and cities by name
 */
server.registerTool(
  'search_locations',
  {
    title: 'Search Locations',
    description: 'Search for train stations and cities in the Czech Railways network. Use this to find station codes for connection searches.',
    inputSchema: {
      query: z.string().describe('Search query (station or city name, e.g., "Praha", "Brno")'),
      type: z.string().optional().describe('Optional location type filter (e.g., "station", "city")'),
    },
  },
  async ({ query, type }) => {
    try {
      const locations = await cdClient.searchLocations(query, type);
      
      if (locations.length === 0) {
        return {
          content: [{
            type: 'text' as const,
            text: `No locations found for "${query}". Try a different search term.`,
          }],
        };
      }

      const formatted = locations.map(formatLocation).join('\n');
      const summary = `Found ${locations.length} location(s) for "${query}":\n\n${formatted}`;
      
      return {
        content: [{
          type: 'text' as const,
          text: summary,
        }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{
          type: 'text' as const,
          text: `Error searching locations: ${message}`,
        }],
        isError: true,
      };
    }
  }
);

/**
 * Tool: search_connections
 * Search for train connections between two locations
 */
server.registerTool(
  'search_connections',
  {
    title: 'Search Connections',
    description: 'Search for train connections between two stations. Returns available trains with departure times, duration, prices (in CZK), and a link to book tickets.',
    inputSchema: {
      from: z.string().describe('Departure station or city name (e.g., "Praha", "Praha hl.n.")'),
      to: z.string().describe('Arrival station or city name (e.g., "Brno", "Brno hl.n.")'),
      departure: z.string().describe('Departure date and time in ISO 8601 format (e.g., "2025-12-15T08:00:00")'),
    },
  },
  async ({ from, to, departure }) => {
    try {
      const result = await cdClient.searchConnections(from, to, departure);
      
      if (!result.connections || result.connections.length === 0) {
        return {
          content: [{
            type: 'text' as const,
            text: `No connections found from "${from}" to "${to}" on ${departure}.`,
          }],
        };
      }

      const bookingUrl = generateBookingUrl(result.fromStation, result.toStation, departure);
      const formatted = result.connections.map(formatConnection).join('\n\n---\n\n');
      let summary = `Found ${result.connections.length} connection(s) from "${result.fromStation}" to "${result.toStation}":\n\n${formatted}`;
      summary += `\n\n🎫 Book tickets: ${bookingUrl}`;
      
      return {
        content: [{
          type: 'text' as const,
          text: summary,
        }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{
          type: 'text' as const,
          text: `Error searching connections: ${message}`,
        }],
        isError: true,
      };
    }
  }
);

// Start the server with stdio transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Czech Railways MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
