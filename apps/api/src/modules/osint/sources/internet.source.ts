import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface OutageEvent {
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

// Country centroid coordinates for mapping outages
const COUNTRY_CENTROIDS: Record<string, [number, number]> = {
  'AF': [33.93, 67.71], 'AL': [41.15, 20.17], 'DZ': [28.03, 1.66],
  'AO': [-11.20, 17.87], 'AR': [-38.42, -63.62], 'AM': [40.07, 45.04],
  'AU': [-25.27, 133.78], 'AZ': [40.14, 47.58], 'BH': [26.07, 50.56],
  'BD': [23.68, 90.36], 'BY': [53.71, 27.95], 'BO': [-16.29, -63.59],
  'BR': [-14.24, -51.93], 'MM': [21.91, 95.96], 'KH': [12.57, 104.99],
  'CM': [7.37, 12.35], 'CF': [6.61, 20.94], 'TD': [15.45, 18.73],
  'CN': [35.86, 104.20], 'CO': [4.57, -74.30], 'CD': [-4.04, 21.76],
  'CU': [21.52, -77.78], 'EG': [26.82, 30.80], 'ER': [15.18, 39.78],
  'ET': [9.15, 40.49], 'GA': [-0.80, 11.61], 'GH': [7.95, -1.02],
  'GN': [9.95, -9.70], 'HT': [18.97, -72.29], 'IN': [20.59, 78.96],
  'ID': [-0.79, 113.92], 'IR': [32.43, 53.69], 'IQ': [33.22, 43.68],
  'IL': [31.05, 34.85], 'JO': [30.59, 36.24], 'KZ': [48.02, 66.92],
  'KE': [-0.02, 37.91], 'KW': [29.31, 47.48], 'KG': [41.20, 74.77],
  'LA': [19.86, 102.50], 'LB': [33.85, 35.86], 'LR': [6.43, -9.43],
  'LY': [26.34, 17.23], 'MG': [-18.77, 46.87], 'MW': [-13.25, 34.30],
  'ML': [17.57, -4.00], 'MR': [21.01, -10.94], 'MX': [23.63, -102.55],
  'MZ': [-18.67, 35.53], 'NP': [28.39, 84.12], 'NE': [17.61, 8.08],
  'NG': [9.08, 8.68], 'KP': [40.34, 127.51], 'OM': [21.51, 55.92],
  'PK': [30.38, 69.35], 'PS': [31.95, 35.23], 'PH': [12.88, 121.77],
  'QA': [25.35, 51.18], 'RU': [61.52, 105.32], 'RW': [-1.94, 29.87],
  'SA': [23.89, 45.08], 'SN': [14.50, -14.45], 'SL': [8.46, -11.78],
  'SO': [5.15, 46.20], 'SS': [6.88, 31.31], 'SD': [12.86, 30.22],
  'SY': [34.80, 38.00], 'TJ': [38.86, 71.28], 'TZ': [-6.37, 34.89],
  'TG': [8.62, 1.21], 'TN': [33.89, 9.54], 'TR': [38.96, 35.24],
  'TM': [38.97, 59.56], 'UG': [1.37, 32.29], 'UA': [48.38, 31.17],
  'AE': [23.42, 53.85], 'UZ': [41.38, 64.59], 'VE': [6.42, -66.59],
  'VN': [14.06, 108.28], 'YE': [15.55, 48.52], 'ZM': [-13.13, 27.85],
  'ZW': [-19.02, 29.15],
};

export class InternetSource {
  private readonly logger = new Logger(InternetSource.name);

  constructor(private readonly config: ConfigService) {}

  async fetch(): Promise<OutageEvent[]> {
    try {
      return await this.fetchIoda();
    } catch (err) {
      this.logger.error(`IODA fetch failed: ${err}`);
      return [];
    }
  }

  private async fetchIoda(): Promise<OutageEvent[]> {
    // IODA alerts API - detects internet outages via BGP, active probing, darknet
    const now = Math.floor(Date.now() / 1000);
    const oneHourAgo = now - 3600;

    const response = await fetch(
      `https://api.ioda.inetintel.cc.gatech.edu/v2/alerts/country?from=${oneHourAgo}&until=${now}`,
      {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!response.ok) {
      // Fallback: try the signals endpoint
      return this.fetchIodaSignals();
    }

    const data = await response.json();
    const alerts = data.data || data.results || [];

    this.logger.debug(`IODA: ${alerts.length} outage alerts`);

    return alerts
      .filter((a: any) => a.entity?.code && COUNTRY_CENTROIDS[a.entity.code])
      .map((a: any) => {
        const code = a.entity.code;
        const [lat, lon] = COUNTRY_CENTROIDS[code] || [0, 0];
        const level = a.level || 'unknown';

        let severity: string;
        if (level === 'critical' || (a.score && a.score > 0.8)) severity = 'CRITICAL';
        else if (level === 'warning' || (a.score && a.score > 0.5)) severity = 'HIGH';
        else severity = 'MEDIUM';

        return {
          entityId: `ioda-${code}-${a.time || Date.now()}`,
          entityType: 'event',
          displayName: `Internet Outage: ${a.entity.name || code}`,
          lat,
          lon,
          altitude: null,
          heading: null,
          speed: null,
          confidence: a.score || 0.7,
          properties: {
            source: 'IODA',
            event_type: 'outage',
            country: a.entity.name || code,
            country_code: code,
            severity,
            level,
            score: a.score || null,
            datasource: a.datasource || null,
            condition: a.condition || null,
            start_time: a.time ? new Date(a.time * 1000).toISOString() : null,
          },
          rawData: a,
        };
      });
  }

  private async fetchIodaSignals(): Promise<OutageEvent[]> {
    // Fallback: use IODA signals endpoint
    const response = await fetch(
      'https://api.ioda.inetintel.cc.gatech.edu/v2/signals/country',
      {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(15000),
      }
    );
    if (!response.ok) throw new Error(`IODA signals HTTP ${response.status}`);

    const data = await response.json();
    return []; // Return empty if signals don't contain alertable data
  }
}
