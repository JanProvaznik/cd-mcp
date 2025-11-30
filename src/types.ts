/**
 * Type definitions for Czech Railways API responses
 */

export interface Location {
  key: string;
  name: string;
  type: string;
  countryCode?: string;
  latitude?: number;
  longitude?: number;
}

export interface LocationSearchResult {
  locations: Location[];
}

export interface ConnectionLeg {
  from: string;
  to: string;
  departure: string;
  arrival: string;
  trainNumber?: string;
  trainType?: string;
  carrier?: string;
  platform?: string;
}

export interface Connection {
  id: string;
  departure: string;
  arrival: string;
  duration: number;
  transfers: number;
  legs: ConnectionLeg[];
  price?: {
    amount: number;
    currency: string;
  };
}

export interface ConnectionSearchResult {
  handle?: string;
  connections: Connection[];
}

export interface PassengerType {
  key: string;
  name: string;
  description?: string;
  discountPercent?: number;
}

export interface PassengerTypesResult {
  passengerTypes: PassengerType[];
}

export interface PriceOffer {
  bookingId: string;
  totalPrice: {
    amount: number;
    currency: string;
  };
  validUntil?: string;
  tickets: {
    connectionId: string;
    price: {
      amount: number;
      currency: string;
    };
    passengerType: string;
  }[];
}

export interface ApiError {
  code: string;
  message: string;
  details?: string;
}
