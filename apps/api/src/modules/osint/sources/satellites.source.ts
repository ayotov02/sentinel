import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface SatelliteState {
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

export class SatellitesSource {
  private readonly logger = new Logger(SatellitesSource.name);
  private spaceTrackCookie: string | null = null;
  private cookieExpiry = 0;
  private cachedTLEs: any[] = [];
  private cacheExpiry = 0;

  constructor(private readonly config: ConfigService) {}

  async fetch(): Promise<SatelliteState[]> {
    // Try Space-Track first (better data), CelesTrak as fallback
    let tleData: any[] = [];

    if (Date.now() < this.cacheExpiry && this.cachedTLEs.length > 0) {
      tleData = this.cachedTLEs;
    } else {
      try {
        const username = this.config.get<string>('SPACETRACK_USERNAME');
        const password = this.config.get<string>('SPACETRACK_PASSWORD');
        if (username && password) {
          tleData = await this.fetchSpaceTrack(username, password);
        } else {
          tleData = await this.fetchCelesTrak();
        }
      } catch (err) {
        this.logger.warn(`Space-Track failed, trying CelesTrak: ${err}`);
        try {
          tleData = await this.fetchCelesTrak();
        } catch (err2) {
          this.logger.error(`All satellite sources failed: ${err2}`);
          return [];
        }
      }

      this.cachedTLEs = tleData;
      this.cacheExpiry = Date.now() + 7200_000; // Cache 2 hours
    }

    // Propagate positions using simplified SGP4 approximation
    return tleData.map(tle => this.propagateAndNormalize(tle)).filter(Boolean) as SatelliteState[];
  }

  private async fetchSpaceTrack(username: string, password: string): Promise<any[]> {
    // Authenticate if needed
    if (!this.spaceTrackCookie || Date.now() > this.cookieExpiry) {
      const authResponse = await fetch('https://www.space-track.org/ajaxauth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `identity=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
        signal: AbortSignal.timeout(15000),
      });
      if (!authResponse.ok) throw new Error(`Space-Track auth failed: ${authResponse.status}`);

      const setCookie = authResponse.headers.get('set-cookie');
      if (setCookie) {
        this.spaceTrackCookie = setCookie.split(';')[0];
        this.cookieExpiry = Date.now() + 3600_000; // 1 hour
      }
    }

    // Fetch active satellites (limit to most interesting ones)
    const url = 'https://www.space-track.org/basicspacedata/query/class/gp/EPOCH/%3Enow-2/orderby/NORAD_CAT_ID%20asc/limit/500/format/json';
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Cookie': this.spaceTrackCookie || '',
      },
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error(`Space-Track query HTTP ${response.status}`);

    const data = await response.json();
    this.logger.debug(`Space-Track: ${data.length} satellites`);
    return data;
  }

  private async fetchCelesTrak(): Promise<any[]> {
    // CelesTrak GP data - no auth required
    const response = await fetch(
      'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=json',
      {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(30000),
      }
    );
    if (!response.ok) throw new Error(`CelesTrak HTTP ${response.status}`);

    const data = await response.json();
    this.logger.debug(`CelesTrak: ${data.length} satellites`);
    // Limit to most relevant satellites
    return data.slice(0, 500);
  }

  private propagateAndNormalize(tle: any): SatelliteState | null {
    try {
      const name = (tle.OBJECT_NAME || tle.name || 'UNKNOWN').trim();
      const noradId = tle.NORAD_CAT_ID || tle.noradCatId;
      const inclination = parseFloat(tle.INCLINATION || tle.inclination || '0');
      const period = parseFloat(tle.PERIOD || tle.period || '90');
      const apogee = parseFloat(tle.APOAPSIS || tle.apogee || '400');
      const perigee = parseFloat(tle.PERIAPSIS || tle.perigee || '400');
      const country = tle.COUNTRY_CODE || tle.countryCode || 'UNK';

      // Simplified position estimation based on orbital elements
      // In production, use satellite.js SGP4 propagation
      const now = Date.now();
      const orbitalPeriodMs = period * 60 * 1000;
      const phase = ((now % orbitalPeriodMs) / orbitalPeriodMs) * 2 * Math.PI;

      // Approximate ground track
      const lat = inclination * Math.sin(phase) * (Math.random() > 0.5 ? 1 : -1);
      const lon = ((phase * 180 / Math.PI) + (now / 1000 * 0.004)) % 360 - 180;
      const altitudeKm = (apogee + perigee) / 2;

      // Classify satellite type
      let satType = 'other';
      const upperName = name.toUpperCase();
      if (upperName.includes('STARLINK')) satType = 'communications';
      else if (upperName.includes('GPS') || upperName.includes('NAVSTAR')) satType = 'navigation';
      else if (upperName.includes('GLONASS')) satType = 'navigation';
      else if (upperName.includes('ISS')) satType = 'station';
      else if (upperName.includes('SENTINEL') || upperName.includes('LANDSAT') || upperName.includes('WORLDVIEW')) satType = 'earth_observation';
      else if (upperName.includes('NROL') || upperName.includes('USA') || upperName.includes('YAOGAN')) satType = 'military';
      else if (upperName.includes('COSMOS') || upperName.includes('KOSMOS')) satType = 'military';
      else if (upperName.includes('IRIDIUM')) satType = 'communications';
      else if (upperName.includes('METEOR') || upperName.includes('NOAA') || upperName.includes('GOES')) satType = 'weather';

      const confidence = tle.EPOCH ? Math.max(0.3, 1.0 - (Date.now() - new Date(tle.EPOCH).getTime()) / (14 * 86400000)) : 0.7;

      return {
        entityId: `sat-${noradId}`,
        entityType: 'satellite',
        displayName: name,
        lat: Math.max(-90, Math.min(90, lat)),
        lon: Math.max(-180, Math.min(180, lon)),
        altitude: altitudeKm * 1000, // Convert to meters
        heading: null,
        speed: null,
        confidence,
        properties: {
          norad_id: noradId,
          object_type: tle.OBJECT_TYPE || null,
          country_code: country,
          satellite_type: satType,
          inclination,
          period_min: period,
          apogee_km: apogee,
          perigee_km: perigee,
          epoch: tle.EPOCH || null,
          launch_date: tle.LAUNCH_DATE || null,
          decay_date: tle.DECAY_DATE || null,
          rcs_size: tle.RCS_SIZE || null,
        },
        rawData: tle,
      };
    } catch {
      return null;
    }
  }
}
