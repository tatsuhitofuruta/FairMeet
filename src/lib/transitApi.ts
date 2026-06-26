import type { Station } from './types';

export const TRANSIT_API_BASE_URL = 'https://api.transit.ls8h.com';

export type TransitPlanType = 'departure' | 'arrival' | 'first' | 'last';

export interface TransitPlanRequest {
  from: string;
  to: string;
  fromLabel?: string;
  toLabel?: string;
  date?: string;
  time?: string;
  type?: TransitPlanType;
  allowModes?: string;
  avoidModes?: string;
  maxTransfers?: number;
  numItineraries?: number;
}

interface TransitPoint {
  id: string;
  name: string;
  platformCode?: string;
}

export interface TransitLeg {
  kind: 'transit' | 'walk';
  routeName?: string;
  mode?: string;
  color?: string;
  from: TransitPoint;
  to: TransitPoint;
  departureSecs: number;
  arrivalSecs: number;
}

export interface TransitJourney {
  departureSecs: number;
  arrivalSecs: number;
  durationSecs: number;
  transferCount: number;
  fare?: {
    currency: string;
    ticket: number;
    ic?: number;
  };
  accessWalkSecs?: number;
  egressWalkSecs?: number;
  legs: TransitLeg[];
}

export interface TransitPlanResponse {
  date: string;
  type: TransitPlanType;
  timezone: string;
  from: TransitPoint;
  to: TransitPoint;
  journeys: TransitJourney[];
}

export interface TransitRouteSummary {
  durationMinutes: number;
  transferCount: number;
  departureLabel: string;
  arrivalLabel: string;
  routeNames: string[];
  fareYen?: number;
  accessWalkMinutes?: number;
  egressWalkMinutes?: number;
}

export function stationTransitEndpoint(station: Pick<Station, 'lat' | 'lng'>): string {
  return `geo:${station.lat.toFixed(6)},${station.lng.toFixed(6)}`;
}

export function buildTransitPlanUrl(request: TransitPlanRequest, baseUrl = TRANSIT_API_BASE_URL): string {
  const url = new URL('/api/v1/plan', baseUrl);
  const params = url.searchParams;
  params.set('from', request.from);
  params.set('to', request.to);

  if (request.fromLabel) params.set('fromLabel', request.fromLabel);
  if (request.toLabel) params.set('toLabel', request.toLabel);
  if (request.date) params.set('date', request.date);
  if (request.time) params.set('time', request.time);
  if (request.type) params.set('type', request.type);
  if (request.allowModes) params.set('allowModes', request.allowModes);
  if (request.avoidModes) params.set('avoidModes', request.avoidModes);
  if (request.maxTransfers !== undefined) params.set('maxTransfers', String(request.maxTransfers));
  if (request.numItineraries !== undefined) params.set('numItineraries', String(request.numItineraries));

  return url.toString();
}

export async function fetchTransitPlan(
  request: TransitPlanRequest,
  fetcher: typeof fetch = fetch,
): Promise<TransitPlanResponse> {
  const response = await fetcher(buildTransitPlanUrl(request), {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Transit API request failed: ${response.status}`);
  }

  return (await response.json()) as TransitPlanResponse;
}

export function formatTransitServiceTime(seconds: number): string {
  const daySeconds = 24 * 60 * 60;
  const dayOffset = Math.floor(seconds / daySeconds);
  const normalizedSeconds = ((seconds % daySeconds) + daySeconds) % daySeconds;
  const hours = Math.floor(normalizedSeconds / 3600);
  const minutes = Math.floor((normalizedSeconds % 3600) / 60);
  const time = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

  if (dayOffset > 0) {
    return `翌日 ${time}`;
  }
  if (seconds < 0) {
    return `前日 ${time}`;
  }
  return time;
}

export function summarizeTransitPlan(plan: TransitPlanResponse): TransitRouteSummary | null {
  const journey = plan.journeys.find((item) => item.legs.some((leg) => leg.kind === 'transit')) ?? plan.journeys[0];
  if (!journey) {
    return null;
  }

  const routeNames = Array.from(
    new Set(
      journey.legs
        .filter((leg) => leg.kind === 'transit' && leg.routeName)
        .map((leg) => leg.routeName as string),
    ),
  );

  return {
    durationMinutes: Math.round(journey.durationSecs / 60),
    transferCount: journey.transferCount,
    departureLabel: formatTransitServiceTime(journey.departureSecs),
    arrivalLabel: formatTransitServiceTime(journey.arrivalSecs),
    routeNames: routeNames.length > 0 ? routeNames : ['徒歩'],
    fareYen: journey.fare?.ticket,
    accessWalkMinutes: journey.accessWalkSecs !== undefined ? Math.round(journey.accessWalkSecs / 60) : undefined,
    egressWalkMinutes: journey.egressWalkSecs !== undefined ? Math.round(journey.egressWalkSecs / 60) : undefined,
  };
}
