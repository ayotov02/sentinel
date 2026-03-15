import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface FireEvent {
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

export class FiresSource {
  private readonly logger = new Logger(FiresSource.name);

  constructor(private readonly config: ConfigService) {}

  async fetch(): Promise<FireEvent[]> {
    const mapKey = this.config.get<string>('FIRMS_MAP_KEY');
    if (!mapKey) {
      this.logger.warn('FIRMS_MAP_KEY not set — fire detection disabled');
      return [];
    }

    try {
      return await this.fetchFirms(mapKey);
    } catch (err) {
      this.logger.error(`FIRMS fetch failed: ${err}`);
      return [];
    }
  }

  private async fetchFirms(mapKey: string): Promise<FireEvent[]> {
    // VIIRS SNPP NRT - best balance of coverage and resolution
    // Area: world, last 24 hours
    const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${mapKey}/VIIRS_SNPP_NRT/world/1`;

    const response = await fetch(url, {
      headers: { 'Accept': 'text/csv' },
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error(`FIRMS HTTP ${response.status}`);

    const csv = await response.text();
    const lines = csv.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',');
    const latIdx = headers.indexOf('latitude');
    const lonIdx = headers.indexOf('longitude');
    const brightIdx = headers.indexOf('bright_ti4');
    const frpIdx = headers.indexOf('frp');
    const confIdx = headers.indexOf('confidence');
    const dateIdx = headers.indexOf('acq_date');
    const timeIdx = headers.indexOf('acq_time');
    const satIdx = headers.indexOf('satellite');
    const instrIdx = headers.indexOf('instrument');
    const dayNightIdx = headers.indexOf('daynight');

    // Only take high/nominal confidence fires, limit to 500
    const fires: FireEvent[] = [];
    for (let i = 1; i < lines.length && fires.length < 500; i++) {
      const cols = lines[i].split(',');
      const confidence = cols[confIdx]?.trim().toLowerCase();
      if (confidence === 'l' || confidence === 'low') continue; // Skip low confidence

      const lat = parseFloat(cols[latIdx]);
      const lon = parseFloat(cols[lonIdx]);
      if (isNaN(lat) || isNaN(lon)) continue;

      const brightness = parseFloat(cols[brightIdx]) || 0;
      const frp = parseFloat(cols[frpIdx]) || 0;
      const acqDate = cols[dateIdx]?.trim() || '';
      const acqTime = cols[timeIdx]?.trim() || '';

      let severity: string;
      if (frp > 100) severity = 'HIGH';
      else if (frp > 30) severity = 'MEDIUM';
      else severity = 'LOW';

      let confScore: number;
      if (confidence === 'h' || confidence === 'high') confScore = 0.95;
      else confScore = 0.70; // nominal

      fires.push({
        entityId: `firms-${lat.toFixed(3)}-${lon.toFixed(3)}-${acqDate}-${acqTime}`,
        entityType: 'event',
        displayName: `Fire Detection (${brightness.toFixed(0)}K)`,
        lat,
        lon,
        altitude: null,
        heading: null,
        speed: null,
        confidence: confScore,
        properties: {
          source: 'NASA_FIRMS',
          event_type: 'fire',
          brightness_kelvin: brightness,
          fire_radiative_power: frp,
          severity,
          satellite: cols[satIdx]?.trim() || null,
          instrument: cols[instrIdx]?.trim() || null,
          day_night: cols[dayNightIdx]?.trim() || null,
          acquisition_date: acqDate,
          acquisition_time: acqTime,
        },
        rawData: { line: lines[i] },
      });
    }

    this.logger.debug(`FIRMS: ${fires.length} fire detections (filtered from ${lines.length - 1})`);
    return fires;
  }
}
