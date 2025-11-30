#!/usr/bin/env node
/**
 * Czech Railways (České dráhy) MCP Server
 * 
 * An MCP server that provides tools for searching Czech railway
 * connections, stations, and prices.
 * 
 * Tools:
 * - search_locations: Find train stations and cities
 * - search_connections: Search for train connections
 * - get_connection_details: Get detailed info about a connection
 * - get_passenger_types: List available passenger types and discounts
 * - get_price_offer: Get price offer for a connection
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod/v4';
import { cdClient, formatConnection, formatLocation } from './cd-api.js';

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
    description: 'Search for train connections between two stations. Returns available trains with departure times, duration, and transfers.',
    inputSchema: {
      from: z.string().describe('Departure station key or name (e.g., "Praha hl.n.")'),
      to: z.string().describe('Arrival station key or name (e.g., "Brno hl.n.")'),
      departure: z.string().describe('Departure date and time in ISO 8601 format (e.g., "2024-03-15T08:00:00")'),
      passengers: z.number().min(1).max(9).default(1).describe('Number of passengers (1-9, default: 1)'),
    },
  },
  async ({ from, to, departure, passengers }) => {
    try {
      const result = await cdClient.searchConnections(from, to, departure, passengers);
      
      if (!result.connections || result.connections.length === 0) {
        return {
          content: [{
            type: 'text' as const,
            text: `No connections found from "${from}" to "${to}" on ${departure}.`,
          }],
        };
      }

      const formatted = result.connections.map(formatConnection).join('\n\n---\n\n');
      let summary = `Found ${result.connections.length} connection(s) from "${from}" to "${to}":\n\n${formatted}`;
      
      if (result.handle) {
        summary += `\n\n📑 Pagination handle: ${result.handle} (use with get_more_connections for more results)`;
      }
      
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

/**
 * Tool: get_connection_details
 * Get detailed information about a specific connection
 */
server.registerTool(
  'get_connection_details',
  {
    title: 'Get Connection Details',
    description: 'Get detailed information about a specific train connection, including all stops, platforms, and carrier information.',
    inputSchema: {
      handle: z.string().describe('Connection search handle from a previous search'),
      connectionId: z.string().describe('Connection identifier from the search results'),
    },
  },
  async ({ handle, connectionId }) => {
    try {
      const connection = await cdClient.getConnectionDetails(handle, connectionId);
      const formatted = formatConnection(connection);
      
      return {
        content: [{
          type: 'text' as const,
          text: `Connection Details:\n\n${formatted}`,
        }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{
          type: 'text' as const,
          text: `Error getting connection details: ${message}`,
        }],
        isError: true,
      };
    }
  }
);

/**
 * Tool: get_passenger_types
 * Get available passenger types and discounts
 */
server.registerTool(
  'get_passenger_types',
  {
    title: 'Get Passenger Types',
    description: 'Get a list of available passenger types and discount categories (e.g., adult, child, senior, student discounts).',
    inputSchema: {},
  },
  async () => {
    try {
      const types = await cdClient.getPassengerTypes();
      
      if (types.length === 0) {
        return {
          content: [{
            type: 'text' as const,
            text: 'No passenger types available.',
          }],
        };
      }

      const formatted = types.map(t => {
        let line = `👤 ${t.name} (${t.key})`;
        if (t.description) {
          line += `\n   ${t.description}`;
        }
        if (t.discountPercent !== undefined) {
          line += `\n   Discount: ${t.discountPercent}%`;
        }
        return line;
      }).join('\n\n');
      
      return {
        content: [{
          type: 'text' as const,
          text: `Available passenger types:\n\n${formatted}`,
        }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{
          type: 'text' as const,
          text: `Error getting passenger types: ${message}`,
        }],
        isError: true,
      };
    }
  }
);

/**
 * Tool: get_price_offer
 * Get a price offer for a connection
 */
server.registerTool(
  'get_price_offer',
  {
    title: 'Get Price Offer',
    description: 'Get a price offer for a specific connection with given passenger types. Note: This only retrieves pricing information, it does not book tickets.',
    inputSchema: {
      connectionId: z.string().describe('Connection identifier from search results'),
      passengers: z.array(z.object({
        type: z.string().describe('Passenger type key (e.g., "ADULT", "CHILD", "SENIOR")'),
        count: z.number().min(1).max(9).describe('Number of passengers of this type'),
      })).describe('Array of passenger types and counts'),
    },
  },
  async ({ connectionId, passengers }) => {
    try {
      const offer = await cdClient.getPriceOffer(connectionId, passengers);
      
      let summary = `💰 Price Offer\n`;
      summary += `   Booking ID: ${offer.bookingId}\n`;
      summary += `   Total Price: ${offer.totalPrice.amount} ${offer.totalPrice.currency}\n`;
      
      if (offer.validUntil) {
        summary += `   Valid Until: ${offer.validUntil}\n`;
      }
      
      if (offer.tickets && offer.tickets.length > 0) {
        summary += `\n   Ticket breakdown:\n`;
        offer.tickets.forEach((ticket, i) => {
          summary += `     ${i + 1}. ${ticket.passengerType}: ${ticket.price.amount} ${ticket.price.currency}\n`;
        });
      }
      
      summary += `\n⚠️ Note: This is only a price quote. To purchase tickets, please visit cd.cz or use the official ČD app.`;
      
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
          text: `Error getting price offer: ${message}`,
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
