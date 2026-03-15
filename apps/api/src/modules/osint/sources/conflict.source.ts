import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

interface ConflictEvent {
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

export class ConflictSource {
  private readonly logger = new Logger(ConflictSource.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Fetch conflict/event data from GDELT GEO API (no auth required)
   */
  async fetch(): Promise<ConflictEvent[]> {
    const events: ConflictEvent[] = [];

    try {
      const gdeltEvents = await this.fetchGdelt();
      events.push(...gdeltEvents);
    } catch (err) {
      this.logger.error(`GDELT fetch failed: ${err}`);
    }

    try {
      const acledKey = this.config.get<string>('ACLED_API_KEY');
      const acledEmail = this.config.get<string>('ACLED_EMAIL');
      if (acledKey && acledEmail) {
        const acledEvents = await this.fetchAcled(acledKey, acledEmail);
        events.push(...acledEvents);
      }
    } catch (err) {
      this.logger.error(`ACLED fetch failed: ${err}`);
    }

    return events;
  }

  private async fetchGdelt(): Promise<ConflictEvent[]> {
    // GDELT GEO API - returns GeoJSON of recent events mentioning conflict themes
    const themes = 'TERROR,KILL,PROTEST,MILITARY,ARMED_CONFLICT,REBELLION,CRISISLEX_C03_DEAD';
    const url = `https://api.gdeltproject.org/api/v2/geo/geo?query=${encodeURIComponent(themes)}&mode=PointData&format=GeoJSON&timespan=60min&maxpoints=250`;

    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error(`GDELT GEO HTTP ${response.status}`);

    const geojson = await response.json();
    if (!geojson.features) return [];

    this.logger.debug(`GDELT GEO: ${geojson.features.length} events`);

    return geojson.features
      .filter((f: any) => f.geometry?.coordinates?.length >= 2)
      .map((f: any, i: number) => {
        const [lon, lat] = f.geometry.coordinates;
        const props = f.properties || {};
        const name = props.name || props.html || 'Unknown Event';
        // Clean HTML from name
        const cleanName = name.replace(/<[^>]*>/g, '').substring(0, 200);

        return {
          entityId: `gdelt-${props.urlsourceurls || Date.now()}-${i}`,
          entityType: 'event',
          displayName: cleanName,
          lat,
          lon,
          altitude: null,
          heading: null,
          speed: null,
          confidence: 0.7,
          properties: {
            source: 'GDELT',
            source_url: props.url || props.urlsourceurls || null,
            tone: props.urltone ? parseFloat(props.urltone) : null,
            source_country: props.sourcecountry || null,
            event_type: 'conflict',
            themes: props.shareimage ? [] : [],
          },
          rawData: props,
        };
      });
  }

  private async fetchAcled(apiKey: string, email: string): Promise<ConflictEvent[]> {
    // ACLED API - structured conflict event data
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    const url = `https://api.acleddata.com/acled/read?key=${apiKey}&email=${email}&event_date=${thirtyDaysAgo}|${today}&event_date_where=BETWEEN&limit=500`;

    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error(`ACLED HTTP ${response.status}`);

    const data = await response.json();
    if (!data.data) return [];

    this.logger.debug(`ACLED: ${data.data.length} events`);

    return data.data
      .filter((e: any) => e.latitude && e.longitude)
      .map((e: any) => ({
        entityId: `acled-${e.data_id}`,
        entityType: 'event',
        displayName: `${e.event_type}: ${e.sub_event_type || ''}`.trim(),
        lat: parseFloat(e.latitude),
        lon: parseFloat(e.longitude),
        altitude: null,
        heading: null,
        speed: null,
        confidence: e.geo_precision === 1 ? 0.95 : e.geo_precision === 2 ? 0.70 : 0.40,
        properties: {
          source: 'ACLED',
          event_type: e.event_type,
          sub_event_type: e.sub_event_type,
          actor1: e.actor1,
          actor2: e.actor2,
          country: e.country,
          admin1: e.admin1,
          admin2: e.admin2,
          location: e.location,
          fatalities: parseInt(e.fatalities) || 0,
          event_date: e.event_date,
          notes: e.notes,
          disorder_type: e.disorder_type,
          geo_precision: e.geo_precision,
        },
        rawData: e,
      }));
  }
}
