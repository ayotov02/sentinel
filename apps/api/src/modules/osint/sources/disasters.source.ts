import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface DisasterEvent {
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

export class DisastersSource {
  private readonly logger = new Logger(DisastersSource.name);

  constructor(private readonly config: ConfigService) {}

  async fetch(): Promise<DisasterEvent[]> {
    const events: DisasterEvent[] = [];

    try {
      const quakes = await this.fetchEarthquakes();
      events.push(...quakes);
    } catch (err) {
      this.logger.error(`USGS earthquake fetch failed: ${err}`);
    }

    try {
      const weather = await this.fetchWeatherAlerts();
      events.push(...weather);
    } catch (err) {
      this.logger.error(`NOAA weather fetch failed: ${err}`);
    }

    return events;
  }

  private async fetchEarthquakes(): Promise<DisasterEvent[]> {
    const response = await fetch(
      'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_hour.geojson',
      { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(15000) }
    );
    if (!response.ok) throw new Error(`USGS HTTP ${response.status}`);

    const geojson = await response.json();
    this.logger.debug(`USGS: ${geojson.features?.length || 0} earthquakes`);

    return (geojson.features || []).map((f: any) => {
      const [lon, lat, depth] = f.geometry.coordinates;
      const props = f.properties;
      const mag = props.mag;

      let severity: string;
      if (mag >= 7) severity = 'CRITICAL';
      else if (mag >= 5) severity = 'HIGH';
      else if (mag >= 4) severity = 'MEDIUM';
      else severity = 'LOW';

      return {
        entityId: `usgs-${f.id}`,
        entityType: 'event',
        displayName: props.title || `M${mag} Earthquake`,
        lat,
        lon,
        altitude: null,
        heading: null,
        speed: null,
        confidence: 0.99,
        properties: {
          source: 'USGS',
          event_type: 'earthquake',
          magnitude: mag,
          magnitude_type: props.magType,
          depth_km: depth,
          severity,
          place: props.place,
          tsunami: props.tsunami === 1,
          felt: props.felt,
          alert: props.alert,
          significance: props.sig,
          url: props.url,
          event_time: new Date(props.time).toISOString(),
        },
        rawData: props,
      };
    });
  }

  private async fetchWeatherAlerts(): Promise<DisasterEvent[]> {
    const response = await fetch(
      'https://api.weather.gov/alerts/active?severity=Extreme,Severe',
      {
        headers: {
          'Accept': 'application/geo+json',
          'User-Agent': 'SENTINEL-OSINT (sentinel@example.com)',
        },
        signal: AbortSignal.timeout(15000),
      }
    );
    if (!response.ok) throw new Error(`NOAA HTTP ${response.status}`);

    const data = await response.json();
    this.logger.debug(`NOAA: ${data.features?.length || 0} weather alerts`);

    return (data.features || [])
      .filter((f: any) => f.geometry?.coordinates || f.properties?.geocode)
      .slice(0, 100) // Limit to avoid overwhelming
      .map((f: any) => {
        const props = f.properties;
        let lat = 0, lon = 0;

        if (f.geometry?.type === 'Point') {
          [lon, lat] = f.geometry.coordinates;
        } else if (f.geometry?.type === 'Polygon' && f.geometry.coordinates[0]) {
          // Use centroid of first ring
          const ring = f.geometry.coordinates[0];
          lat = ring.reduce((s: number, c: number[]) => s + c[1], 0) / ring.length;
          lon = ring.reduce((s: number, c: number[]) => s + c[0], 0) / ring.length;
        }

        if (lat === 0 && lon === 0) return null;

        return {
          entityId: `noaa-${props.id}`,
          entityType: 'event',
          displayName: `${props.event}: ${props.headline || ''}`.substring(0, 200),
          lat,
          lon,
          altitude: null,
          heading: null,
          speed: null,
          confidence: 0.99,
          properties: {
            source: 'NOAA',
            event_type: 'weather',
            sub_type: props.event,
            severity: props.severity === 'Extreme' ? 'CRITICAL' : 'HIGH',
            urgency: props.urgency,
            certainty: props.certainty,
            description: props.description?.substring(0, 500),
            instruction: props.instruction?.substring(0, 500),
            sender: props.senderName,
            effective: props.effective,
            expires: props.expires,
            area_desc: props.areaDesc,
          },
          rawData: props,
        };
      })
      .filter(Boolean);
  }
}
