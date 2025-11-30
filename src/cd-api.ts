/**
 * Czech Railways API Client
 * 
 * Client for interacting with the České dráhy (CD) mobile API.
 * Uses the internal mobile API at ipws.cdis.cz which is publicly accessible.
 */

import type {
  Location,
  Connection,
  ConnectionSearchResult,
  ConnectionLeg,
} from './types.js';

const API_BASE_URL = 'https://ipws.cdis.cz/IP.svc';
const APP_ID = '{A6AB5B3E-8A7E-4E84-9DC8-801561CE886F}';
const USER_DESC = '294|34|MCP-Client|^|mcp-cd-server|en|US|440|1080|2154|1.0.0';
const DEFAULT_CURRENCY = 'CZK';
const BOOKING_BASE_URL = 'https://www.cd.cz/spojeni-a-jizdenka/';

interface StationInfo {
  id: number;
  name: string;
}

interface CdMobileResponse<T> {
  d: T;
}

interface StationSearchItem {
  oItem: {
    iListID: number;
    sName: string;
  };
}

interface ConnectionInfo {
  iHandle: number;
  oConnInfo?: {
    aoConnections: RawConnection[];
  };
}

interface RawConnection {
  iID: number;
  aoTrains: RawLeg[];
}

interface RawLeg {
  dtDateTime1: string;
  dtDateTime2: string;
  sStationName1: string;
  sStationName2: string;
  sType?: string;
  sNum1?: string;
  sNum2?: string;
  sNum3?: string;
}

interface PriceInfo {
  iPrice: number;
}

export class CdApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Make a POST request to the CD mobile API
   */
  private async postRequest<T>(endpoint: string, body: unknown): Promise<T> {
    const url = `${this.baseUrl}/${endpoint}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'okhttp/4.9.3',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const json = await response.json() as CdMobileResponse<T>;
    return json.d;
  }

  /**
   * Search for a station by name
   */
  private async searchStation(mask: string): Promise<StationInfo> {
    const body = {
      iLang: 1,
      sMask: mask,
      iMaxCount: 5,
      sAppID: APP_ID,
      sUserDesc: USER_DESC,
    };
    
    const result = await this.postRequest<StationSearchItem[]>('SearchGlobalListItemInfoExt', body);
    const item = result?.[0]?.oItem;
    
    if (!item) {
      throw new Error(`Station not found: ${mask}`);
    }
    
    return { id: item.iListID, name: item.sName };
  }

  /**
   * Create a session for API calls
   */
  private async createSession(): Promise<string> {
    const body = {
      iLang: 1,
      sAppID: APP_ID,
      sUserDesc: USER_DESC,
      sUser: '',
      sPwd: '',
      iTokenType: 1,
      oRegisterNotificationsSettings: {
        iNotificationMask: 2047,
        iInitialAdvance: 30,
        iDelayLimit: 5,
        iChangeAdvance: 5,
        iGetOffAdvance: 5,
      },
    };
    
    const result = await this.postRequest<{ sSessionID: string }>('CreateSession', body);
    return result.sSessionID;
  }

  /**
   * Parse CD date format (/Date(timestamp)/) to ISO string
   */
  private parseDate(raw: string): string {
    const match = raw.match(/\/Date\((-?\d+)\)\//);
    if (!match || !match[1]) return raw;
    return new Date(parseInt(match[1], 10)).toISOString();
  }

  /**
   * Search for locations (train stations, cities) by name
   * @param query - Search query string
   * @param _type - Optional location type filter (ignored in mobile API)
   */
  async searchLocations(query: string, _type?: string): Promise<Location[]> {
    const body = {
      iLang: 1,
      sMask: query,
      iMaxCount: 10,
      sAppID: APP_ID,
      sUserDesc: USER_DESC,
    };
    
    const result = await this.postRequest<StationSearchItem[]>('SearchGlobalListItemInfoExt', body);
    
    return (result || []).map(item => ({
      key: String(item.oItem.iListID),
      name: item.oItem.sName,
      type: 'station',
    }));
  }

  /**
   * Search for train connections
   * @param from - Departure station/city name
   * @param to - Arrival station/city name
   * @param departure - Departure date/time (ISO 8601 format)
   */
  async searchConnections(
    from: string,
    to: string,
    departure: string
  ): Promise<ConnectionSearchResult> {
    // First, resolve station names to IDs
    const [fromStation, toStation] = await Promise.all([
      this.searchStation(from),
      this.searchStation(to),
    ]);

    // Create session
    const sessionID = await this.createSession();

    // Convert departure to timestamp
    const depMs = new Date(departure).getTime();

    // Search for journeys (1 adult passenger for price)
    const body = {
      iLang: 1,
      sSessionID: sessionID,
      oFrom: { iListID: fromStation.id, sName: fromStation.name },
      oTo: { iListID: toStation.id, sName: toStation.name },
      aoVia: [],
      aoChange: [],
      dtDateTime: `/Date(${depMs})/`,
      bIsDep: true,
      oConnParms: { iSearchConnectionFlags: 0, iCarrier: 2 },
      iMaxObjectsCount: 0,
      iMaxCount: 8,
      oPriceRequestClass: { iClass: 2, bBusiness: false },
      aoPassengers: [{
        oPassenger: { iPassengerId: 5 },
        iCount: 1,
        iAge: -1,
      }],
    };

    const result = await this.postRequest<ConnectionInfo>('SearchConnectionInfo1', body);

    if (!result?.oConnInfo?.aoConnections) {
      return { connections: [], fromStation: fromStation.name, toStation: toStation.name };
    }

    // Get prices for all connections
    const connIDs = result.oConnInfo.aoConnections.map(c => c.iID);
    let prices: number[] = [];
    
    try {
      const priceBody = {
        iLang: 1,
        sSessionID: sessionID,
        iHandle: result.iHandle,
        aiConnID: connIDs,
        oPriceRequest: {
          aoPassengers: [{
            oPassenger: { iPassengerId: 5 },
            iCount: 1,
            iAge: -1,
          }],
          iConnHandleThere: 0,
          iConnIDThere: 0,
          oClass: { iClass: 2, bBusiness: false },
          iDocType: 1,
        },
        bStopIfAgeError: true,
      };
      
      const priceResult = await this.postRequest<PriceInfo[]>('GetConnectionsPrice', priceBody);
      prices = (priceResult || []).map(p => (p.iPrice || 0) / 100);
    } catch {
      // Prices might not be available, continue without them
      prices = result.oConnInfo.aoConnections.map(() => 0);
    }

    // Transform to our format
    const connections: Connection[] = result.oConnInfo.aoConnections.map((conn, idx) => {
      const legs: ConnectionLeg[] = conn.aoTrains.map(leg => ({
        from: leg.sStationName1,
        to: leg.sStationName2,
        departure: this.parseDate(leg.dtDateTime1),
        arrival: this.parseDate(leg.dtDateTime2),
        trainType: leg.sType,
        trainNumber: [leg.sNum1, leg.sNum2, leg.sNum3].filter(Boolean).join(' '),
      }));

      const firstLeg = legs[0];
      const lastLeg = legs[legs.length - 1];
      const depTime = new Date(firstLeg?.departure || departure);
      const arrTime = new Date(lastLeg?.arrival || departure);
      const durationMinutes = Math.round((arrTime.getTime() - depTime.getTime()) / 60000);

      const price = prices[idx];
      return {
        id: String(conn.iID),
        departure: firstLeg?.departure || departure,
        arrival: lastLeg?.arrival || departure,
        duration: durationMinutes,
        transfers: conn.aoTrains.length - 1,
        legs,
        price: price !== undefined && price > 0 ? {
          amount: price,
          currency: DEFAULT_CURRENCY,
        } : undefined,
      };
    });

    return {
      connections,
      fromStation: fromStation.name,
      toStation: toStation.name,
    };
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
  return `📍 ${loc.name}`;
}

/**
 * Generate a booking URL for the ČD website
 * @param fromStation - Departure station name
 * @param toStation - Arrival station name  
 * @param departure - Departure date/time in ISO format
 */
export function generateBookingUrl(fromStation: string, toStation: string, departure: string): string {
  const depDate = new Date(departure);
  const dateStr = depDate.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:MM
  
  const params = new URLSearchParams({
    fromCity: fromStation,
    toCity: toStation,
    dateTime: dateStr,
  });
  
  return `${BOOKING_BASE_URL}?${params.toString()}`;
}

// Export singleton client instance
export const cdClient = new CdApiClient();
