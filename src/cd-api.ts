/**
 * Czech Railways API Client
 * 
 * Client for interacting with the České dráhy (CD) ticket API.
 * API documentation: https://ticket-api.cd.cz/swaggerUI/cdapi-1.0.0.yml
 */

import type {
  Location,
  LocationSearchResult,
  Connection,
  ConnectionSearchResult,
  PassengerType,
  PassengerTypesResult,
  PriceOffer,
  ConnectionLeg,
} from './types.js';

const API_BASE_URL = 'https://ticket-api.cd.cz/api/v1';

export class CdApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Make an API request with proper error handling
   */
  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Search for locations (train stations, cities) by name
   * @param query - Search query string
   * @param type - Optional location type filter (e.g., 'station', 'city')
   */
  async searchLocations(query: string, type?: string): Promise<Location[]> {
    const endpoint = type 
      ? `/locations/${encodeURIComponent(type)}?q=${encodeURIComponent(query)}`
      : `/locations?q=${encodeURIComponent(query)}`;
    
    const result = await this.request<LocationSearchResult>('GET', endpoint);
    return result.locations || [];
  }

  /**
   * Get location details by type and key
   * @param type - Location type
   * @param key - Location key/identifier
   */
  async getLocation(type: string, key: string): Promise<Location | null> {
    try {
      const endpoint = `/locations/${encodeURIComponent(type)}/${encodeURIComponent(key)}`;
      return await this.request<Location>('GET', endpoint);
    } catch {
      return null;
    }
  }

  /**
   * Search for train connections
   * @param from - Departure station/city
   * @param to - Arrival station/city
   * @param departure - Departure date/time (ISO 8601 format)
   * @param passengers - Number of passengers (default: 1)
   */
  async searchConnections(
    from: string,
    to: string,
    departure: string,
    passengers: number = 1
  ): Promise<ConnectionSearchResult> {
    const requestBody = {
      from: { key: from },
      to: { key: to },
      departure,
      passengers: Array(passengers).fill({ type: 'ADULT' }),
    };

    const result = await this.request<ConnectionSearchResult>('POST', '/connections/search', requestBody);
    return result;
  }

  /**
   * Get more connections using a pagination handle
   * @param handle - Pagination handle from previous search
   * @param direction - 'next' or 'previous'
   */
  async getMoreConnections(handle: string, direction: 'next' | 'previous' = 'next'): Promise<ConnectionSearchResult> {
    const endpoint = `/connections/${encodeURIComponent(handle)}?direction=${direction}`;
    return await this.request<ConnectionSearchResult>('POST', endpoint);
  }

  /**
   * Get detailed information about a specific connection
   * @param handle - Connection search handle
   * @param connectionId - Connection identifier
   */
  async getConnectionDetails(handle: string, connectionId: string): Promise<Connection> {
    const endpoint = `/connections/${encodeURIComponent(handle)}/${encodeURIComponent(connectionId)}`;
    return await this.request<Connection>('POST', endpoint);
  }

  /**
   * Get available passenger types and discounts
   */
  async getPassengerTypes(): Promise<PassengerType[]> {
    const result = await this.request<PassengerTypesResult>('GET', '/consts/passengers');
    return result.passengerTypes || [];
  }

  /**
   * Get a price offer for a connection
   * @param connectionId - Connection identifier
   * @param passengers - Array of passenger types
   */
  async getPriceOffer(
    connectionId: string,
    passengers: { type: string; count: number }[]
  ): Promise<PriceOffer> {
    const requestBody = {
      connectionId,
      passengers: passengers.flatMap(p => Array(p.count).fill({ type: p.type })),
    };

    return await this.request<PriceOffer>('POST', '/tickets', requestBody);
  }
}

/**
 * Format a connection for display
 */
export function formatConnection(conn: Connection): string {
  const lines: string[] = [];
  lines.push(`🚆 Connection: ${conn.departure} → ${conn.arrival}`);
  lines.push(`   Duration: ${Math.floor(conn.duration / 60)}h ${conn.duration % 60}m`);
  lines.push(`   Transfers: ${conn.transfers}`);
  
  if (conn.price) {
    lines.push(`   Price: ${conn.price.amount} ${conn.price.currency}`);
  }
  
  if (conn.legs && conn.legs.length > 0) {
    lines.push('   Legs:');
    conn.legs.forEach((leg: ConnectionLeg, i: number) => {
      lines.push(`     ${i + 1}. ${leg.from} → ${leg.to}`);
      lines.push(`        Dep: ${leg.departure} | Arr: ${leg.arrival}`);
      if (leg.trainType && leg.trainNumber) {
        lines.push(`        Train: ${leg.trainType} ${leg.trainNumber}`);
      }
    });
  }
  
  return lines.join('\n');
}

/**
 * Format a location for display
 */
export function formatLocation(loc: Location): string {
  let result = `📍 ${loc.name}`;
  if (loc.type) {
    result += ` (${loc.type})`;
  }
  if (loc.countryCode) {
    result += ` [${loc.countryCode}]`;
  }
  return result;
}

// Export singleton client instance
export const cdClient = new CdApiClient();
