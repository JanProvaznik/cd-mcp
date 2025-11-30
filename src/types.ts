/**
 * Type definitions for Czech Railways API responses
 */

export interface Location {
  key: string;
  name: string;
  type: string;
}

export interface ConnectionLeg {
  from: string;
  to: string;
  departure: string;
  arrival: string;
  trainNumber?: string;
  trainType?: string;
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
  connections: Connection[];
  fromStation: string;
  toStation: string;
}
