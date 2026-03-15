import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface NotamEvent {
  entityId: string;
  entityType: string;
  displayName: string;
  lat: number;
  lon: number;
  altitude: number | null;
  heading: number | null;
  speed: number | null;
  confidence: number;
  properties: Record<string, any>;
  rawData: Record<string, any>;
}

// Key airports/FIRs to monitor for intelligence-relevant NOTAMs
const MONITORED_LOCATIONS = [
  { icao: 'LLBG', name: 'Ben Gurion', lat: 32.01, lon: 34.89 },
  { icao: 'OSDI', name: 'Damascus', lat: 33.41, lon: 36.52 },
  { icao: 'OLBA', name: 'Beirut', lat: 33.82, lon: 35.49 },
  { icao: 'OJAI', name: 'Amman', lat: 31.72, lon: 35.99 },
  { icao: 'ORBI', name: 'Baghdad', lat: 33.26, lon: 44.23 },
  { icao: 'OERK', name: 'Riyadh', lat: 24.96, lon: 46.70 },
  { icao: 'OTHH', name: 'Doha', lat: 25.26, lon: 51.57 },
  { icao: 'OMDB', name: 'Dubai', lat: 25.25, lon: 55.36 },
  { icao: 'OIIE', name: 'Tehran', lat: 35.41, lon: 51.15 },
  { icao: 'LTFM', name: 'Istanbul', lat: 41.28, lon: 28.73 },
  { icao: 'UUEE', name: 'Moscow SVO', lat: 55.97, lon: 37.41 },
  { icao: 'UKBB', name: 'Kyiv', lat: 50.34, lon: 30.89 },
  { icao: 'OYSN', name: 'Sanaa', lat: 15.48, lon: 44.22 },
  { icao: 'OAMS', name: 'Mazar-i-Sharif', lat: 36.71, lon: 67.21 },
  { icao: 'HSSS', name: 'Khartoum', lat: 15.59, lon: 32.55 },
  { icao: 'HDAM', name: 'Djibouti', lat: 11.55, lon: 43.16 },
  { icao: 'HTDA', name: 'Dar es Salaam', lat: -6.88, lon: 39.20 },
  { icao: 'VHHH', name: 'Hong Kong', lat: 22.31, lon: 113.91 },
  { icao: 'RKSI', name: 'Seoul Incheon', lat: 37.46, lon: 126.44 },
  { icao: 'RJTT', name: 'Tokyo Haneda', lat: 35.55, lon: 139.78 },
];

export class NotamsSource {
  private readonly logger = new Logger(NotamsSource.name);

  constructor(private readonly config: ConfigService) {}

  async fetch(): Promise<NotamEvent[]> {
    const clientId = this.config.get<string>('FAA_CLIENT_ID');
    const clientSecret = this.config.get<string>('FAA_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      this.logger.warn('FAA_CLIENT_ID/FAA_CLIENT_SECRET not set — NOTAM tracking disabled');
      return [];
    }

    const events: NotamEvent[] = [];

    // Fetch NOTAMs for monitored locations in batches
    const batchSize = 5;
    for (let i = 0; i < MONITORED_LOCATIONS.length; i += batchSize) {
      const batch = MONITORED_LOCATIONS.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map(loc => this.fetchForLocation(loc, clientId, clientSecret))
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          events.push(...result.value);
        }
      }

      // Rate limit: small delay between batches
      if (i + batchSize < MONITORED_LOCATIONS.length) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    this.logger.debug(`NOTAMs: ${events.length} total`);
    return events;
  }

  private async fetchForLocation(
    location: typeof MONITORED_LOCATIONS[0],
    clientId: string,
    clientSecret: string,
  ): Promise<NotamEvent[]> {
    try {
      const response = await fetch(
        `https://external-api.faa.gov/notamapi/v1/notams?icaoLocation=${location.icao}&notamType=N,R,C&sortBy=effectiveStartDate&sortOrder=DESC&pageSize=20`,
        {
          headers: {
            'Accept': 'application/json',
            'client_id': clientId,
            'client_secret': clientSecret,
          },
          signal: AbortSignal.timeout(15000),
        }
      );

      if (!response.ok) return [];

      const data = await response.json();
      const items = data.items || [];

      return items.map((notam: any) => {
        const props = notam.properties || {};
        const coreText = props.coreNOTAMData?.notam?.text || '';
        const classification = props.coreNOTAMData?.notam?.classification || 'UNKNOWN';

        // Detect intelligence-relevant keywords
        const isIntelRelevant = /military|exercise|missile|restricted|prohibited|temporary flight restriction|GPS|jamming|live fire|hazardous|weapons/i.test(coreText);

        return {
          entityId: `notam-${props.coreNOTAMData?.notam?.id || Date.now()}`,
          entityType: 'event',
          displayName: `NOTAM ${location.icao}: ${coreText.substring(0, 100)}`,
          lat: location.lat,
          lon: location.lon,
          altitude: null,
          heading: null,
          speed: null,
          confidence: 0.99,
          properties: {
            source: 'FAA_NOTAM',
            event_type: 'notam',
            icao: location.icao,
            airport_name: location.name,
            classification,
            notam_text: coreText,
            effective_start: props.coreNOTAMData?.notam?.effectiveStart || null,
            effective_end: props.coreNOTAMData?.notam?.effectiveEnd || null,
            is_intel_relevant: isIntelRelevant,
            severity: isIntelRelevant ? 'MEDIUM' : 'LOW',
          },
          rawData: notam,
        };
      });
    } catch (err) {
      return [];
    }
  }
}
