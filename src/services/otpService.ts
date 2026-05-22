import { PlannedRoute, RouteLeg, RouteLegStep, LatLng } from '@/types';
import { getSettings } from './settingsService';

const REQUEST_TIMEOUT_MS = 12000;
const GRAPHQL_PATH = '/otp/routers/default/index/graphql';


const formatLocalDate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const formatLocalTime = (d: Date): string => {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const fetchWithTimeout = async (
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

const getItineraryLegs = (it: unknown): Array<{ mode?: string; distance?: number }> => {
  if (!it || typeof it !== 'object') return [];
  const maybeLegs = (it as { legs?: unknown }).legs;
  if (!Array.isArray(maybeLegs)) return [];
  return maybeLegs as Array<{ mode?: string; distance?: number }>;
};

const hasTransitLeg = (it: unknown): boolean => {
  const legs = getItineraryLegs(it);
  return legs.some((l) => (l?.mode ?? '').toUpperCase() !== 'WALK');
};

const getWalkDistance = (it: unknown): number => {
  const legs = getItineraryLegs(it);
  return legs
    .filter((l) => (l?.mode ?? '').toUpperCase() === 'WALK')
    .reduce((sum, l) => sum + (typeof l.distance === 'number' ? l.distance : 0), 0);
};

const getTotalDistance = (it: unknown): number => {
  const legs = getItineraryLegs(it);
  return legs.reduce((sum, l) => sum + (typeof l.distance === 'number' ? l.distance : 0), 0);
};


export const planRoute = async (
  from: LatLng,
  to: LatLng,
  options?: { wantsTransit?: boolean; dateTime?: Date },
): Promise<PlannedRoute | null> => {
  const settings = await getSettings();
  const baseUrl = settings.otpUrl.replace(/\/+$/, '');
  const url = `${baseUrl}${GRAPHQL_PATH}`;
  const when = options?.dateTime ?? new Date();
  const wantsTransit = options?.wantsTransit ?? true;

  const transportModesSnippet = wantsTransit
    ? 'transportModes: [{ mode: WALK }, { mode: TRANSIT }]'
    : 'transportModes: [{ mode: WALK }]';

  const query = `
    query Plan($from: InputCoordinates!, $to: InputCoordinates!, $date: String!, $time: String!) {
      plan(
        from: $from,
        to: $to,
        date: $date,
        time: $time,
        ${transportModesSnippet}
      ) {
        itineraries {
          legs {
            mode
            distance
            startTime
            endTime
            from { name lat lon }
            to { name lat lon }
            legGeometry { points length }
            steps {
              distance
              streetName
              absoluteDirection
              relativeDirection
              lat
              lon
            }
          }
        }
      }
    }
  `;

  const variables = {
    from: { lat: from.latitude, lon: from.longitude },
    to: { lat: to.latitude, lon: to.longitude },
    date: formatLocalDate(when),
    time: formatLocalTime(when),
  };

  let res: Response;
  try {
    res = await fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables }),
      },
      REQUEST_TIMEOUT_MS,
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Network request failed';
    console.warn(
      `[OTP] Request failed calling ${url}: ${msg}. ` +
        'Check that OTP is running and reachable. ' +
        'Android emulator: use 10.0.2.2. Physical device: use your PC LAN/Tailscale IP.',
    );
    return null;
  }

  if (!res.ok) {
    const text = await res.text();
    console.warn(`[OTP] HTTP ${res.status}: ${text}`);
    return null;
  }

  const json = await res.json();

  const gqlErrors = json?.errors;
  if (Array.isArray(gqlErrors) && gqlErrors.length > 0) {
    const msg = gqlErrors.map((er: { message?: string }) => er?.message).filter(Boolean).join('\n');
    console.warn(`[OTP] GraphQL errors:\n${msg}`);
    return null;
  }

  const itineraries = json?.data?.plan?.itineraries;
  if (!Array.isArray(itineraries) || itineraries.length === 0) {
    console.warn(
      wantsTransit
        ? '[OTP] No itineraries. GTFS may have no service for this date/time, or points are outside transit coverage.'
        : '[OTP] No itineraries. Points may be outside the walkable graph area.',
    );
    return null;
  }

  const pick = wantsTransit
    ? [...itineraries]
        .filter((it) => hasTransitLeg(it))
        .sort((a, b) => {
          const walkDelta = getWalkDistance(a) - getWalkDistance(b);
          if (walkDelta !== 0) return walkDelta;
          return getTotalDistance(a) - getTotalDistance(b);
        })[0]
    : [...itineraries].sort((a, b) => getTotalDistance(a) - getTotalDistance(b))[0];

  if (!pick) {
    console.warn('[OTP] No itinerary matching selected mode.');
    return null;
  }

  if (wantsTransit && !hasTransitLeg(pick)) {
    console.warn('[OTP] Transit mode selected, but no transit-leg itinerary found.');
    return null;
  }

  return parseItinerary(pick);
}


const parseItinerary = (itinerary: Record<string, unknown>): PlannedRoute => {
  const rawLegs = Array.isArray(itinerary.legs) ? (itinerary.legs as Array<Record<string, unknown>>) : [];
  const legs: RouteLeg[] = rawLegs.map((leg) => {
    const from = (leg.from ?? {}) as { name?: string; lat?: number; lon?: number };
    const to = (leg.to ?? {}) as { name?: string; lat?: number; lon?: number };
    const geometry = leg.legGeometry as { points: string; length?: number } | null;
    const encoded = geometry?.points;
    const polyline = typeof encoded === 'string' && encoded.length > 0 ? decodePolyline(encoded) : [];
    const rawSteps = (leg.steps ?? []) as Array<Record<string, unknown>>;
    const steps: RouteLegStep[] = rawSteps.map((s) => ({
      distance: (s.distance as number) ?? 0,
      streetName: s.streetName as string | undefined,
      absoluteDirection: s.absoluteDirection as string | undefined,
      relativeDirection: s.relativeDirection as string | undefined,
      lat: s.lat as number | undefined,
      lon: s.lon as number | undefined,
    }));

    return {
      mode: (leg.mode as string) ?? 'WALK',
      from: {
        name: typeof from.name === 'string' ? from.name : undefined,
        lat: typeof from.lat === 'number' ? from.lat : 0,
        lon: typeof from.lon === 'number' ? from.lon : 0,
      },
      to: {
        name: typeof to.name === 'string' ? to.name : undefined,
        lat: typeof to.lat === 'number' ? to.lat : 0,
        lon: typeof to.lon === 'number' ? to.lon : 0,
      },
      distanceMeters: (leg.distance as number) ?? 0,
      durationSeconds: 0,
      polyline,
      steps,
      startTimeMs: typeof leg.startTime === 'number' ? leg.startTime : undefined,
      endTimeMs: typeof leg.endTime === 'number' ? leg.endTime : undefined,
    };
  });

  const allPoints = legs.flatMap((l) => l.polyline);
  const totalDistance = legs.reduce((s, l) => s + l.distanceMeters, 0);

  return {
    totalDistanceMeters: totalDistance,
    totalDurationSeconds: 0,
    legs,
    polyline: allPoints,
  };
}


export const decodePolyline = (encoded: string, precision = 5): LatLng[] => {
  const coordinates: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lon = 0;
  const factor = Math.pow(10, precision);

  while (index < encoded.length) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlon = result & 1 ? ~(result >> 1) : result >> 1;
    lon += dlon;

    coordinates.push({ latitude: lat / factor, longitude: lon / factor });
  }

  return coordinates;
}
