import { ConfigService } from '@nestjs/config';

export class SpaceTrackSource {
  private readonly username?: string;
  private readonly password?: string;
  private sessionCookie?: string;

  constructor(private readonly config: ConfigService) {
    this.username = config.get('SPACETRACK_USERNAME');
    this.password = config.get('SPACETRACK_PASSWORD');
  }

  async fetch(): Promise<any[]> {
    if (!this.username || !this.password) return this.getMockData();

    // Authenticate if no session cookie
    if (!this.sessionCookie) {
      const authRes = await fetch('https://www.space-track.org/ajaxauth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `identity=${encodeURIComponent(this.username)}&password=${encodeURIComponent(this.password)}`,
        signal: AbortSignal.timeout(15000),
      });
      if (!authRes.ok) throw new Error(`SpaceTrack auth failed: ${authRes.status}`);
      const setCookie = authRes.headers.get('set-cookie');
      if (setCookie) this.sessionCookie = setCookie.split(';')[0];
    }

    const url = 'https://www.space-track.org/basicspacedata/query/class/gp/EPOCH/%3Enow-1/orderby/NORAD_CAT_ID/limit/100/format/json';
    const res = await fetch(url, {
      headers: {
        'Cookie': this.sessionCookie || '',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) {
      this.sessionCookie = undefined; // Clear stale session
      throw new Error(`SpaceTrack HTTP ${res.status}`);
    }
    const data = await res.json() as any[];

    return data.map((sat: any) => {
      const { lat, lon } = this.estimatePosition(sat);
      return {
        entityType: 'satellite',
        entityId: `SAT-${sat.NORAD_CAT_ID}`,
        displayName: sat.OBJECT_NAME,
        lat,
        lon,
        altitude: ((parseFloat(sat.APOGEE) + parseFloat(sat.PERIGEE)) / 2) * 1000, // km to m
        heading: null,
        speed: null,
        confidence: 0.90,
        properties: {
          norad_id: sat.NORAD_CAT_ID,
          object_name: sat.OBJECT_NAME,
          object_type: sat.OBJECT_TYPE,
          period_min: parseFloat(sat.PERIOD),
          inclination: parseFloat(sat.INCLINATION),
          apogee_km: parseFloat(sat.APOGEE),
          perigee_km: parseFloat(sat.PERIGEE),
          rcs_size: sat.RCS_SIZE,
          launch_date: sat.LAUNCH_DATE,
          decay_date: sat.DECAY_DATE,
          country_code: sat.COUNTRY_CODE,
          epoch: sat.EPOCH,
        },
        rawData: sat,
      };
    });
  }

  private estimatePosition(sat: any): { lat: number; lon: number } {
    // Simple estimation based on epoch and orbital elements
    const inclination = parseFloat(sat.INCLINATION) || 51.6;
    const raan = parseFloat(sat.RA_OF_ASC_NODE) || 0;
    const epoch = new Date(sat.EPOCH).getTime();
    const now = Date.now();
    const period = (parseFloat(sat.PERIOD) || 90) * 60 * 1000; // ms
    const elapsed = (now - epoch) % period;
    const phase = (elapsed / period) * 2 * Math.PI;

    const lat = inclination * Math.sin(phase) * (Math.PI / 180) * (180 / Math.PI);
    const lon = ((raan + (elapsed / period) * 360) % 360) - 180;

    return {
      lat: Math.max(-90, Math.min(90, lat)),
      lon: Math.max(-180, Math.min(180, lon)),
    };
  }

  private getMockData(): any[] {
    const satellites = [
      { norad: 25544, name: 'ISS (ZARYA)', type: 'PAYLOAD', period: 92.9, inc: 51.64, apo: 421, per: 419, rcs: 'LARGE', country: 'ISS', launch: '1998-11-20' },
      { norad: 48274, name: 'STARLINK-2305', type: 'PAYLOAD', period: 95.7, inc: 53.05, apo: 550, per: 549, rcs: 'MEDIUM', country: 'US', launch: '2021-03-24' },
      { norad: 48275, name: 'STARLINK-2306', type: 'PAYLOAD', period: 95.7, inc: 53.05, apo: 550, per: 549, rcs: 'MEDIUM', country: 'US', launch: '2021-03-24' },
      { norad: 43013, name: 'GSAT-17', type: 'PAYLOAD', period: 1436.1, inc: 0.06, apo: 35795, per: 35781, rcs: 'LARGE', country: 'IN', launch: '2017-06-29' },
      { norad: 41866, name: 'TIANGONG-2', type: 'PAYLOAD', period: 91.3, inc: 42.79, apo: 393, per: 381, rcs: 'LARGE', country: 'PRC', launch: '2016-09-15' },
      { norad: 27424, name: 'COSMOS 2389 (GLONASS)', type: 'PAYLOAD', period: 675.7, inc: 64.77, apo: 19140, per: 19100, rcs: 'LARGE', country: 'CIS', launch: '2002-12-25' },
      { norad: 28654, name: 'NAVSTAR 60 (GPS IIR-14)', type: 'PAYLOAD', period: 717.9, inc: 55.03, apo: 20222, per: 20163, rcs: 'LARGE', country: 'US', launch: '2004-11-06' },
      { norad: 39634, name: 'YAOGAN 20A', type: 'PAYLOAD', period: 97.2, inc: 63.40, apo: 630, per: 600, rcs: 'MEDIUM', country: 'PRC', launch: '2013-11-25' },
      { norad: 36508, name: 'COSMOS 2462 (ELINT)', type: 'PAYLOAD', period: 92.4, inc: 74.02, apo: 420, per: 400, rcs: 'MEDIUM', country: 'CIS', launch: '2010-04-16' },
      { norad: 44506, name: 'USA 290 (KH-11)', type: 'PAYLOAD', period: 97.5, inc: 97.44, apo: 680, per: 250, rcs: 'LARGE', country: 'US', launch: '2019-01-19' },
      { norad: 40258, name: 'SENTINEL-1A', type: 'PAYLOAD', period: 98.6, inc: 98.18, apo: 693, per: 690, rcs: 'LARGE', country: 'ESA', launch: '2014-04-03' },
      { norad: 42063, name: 'SENTINEL-2A', type: 'PAYLOAD', period: 100.6, inc: 98.57, apo: 786, per: 784, rcs: 'LARGE', country: 'ESA', launch: '2015-06-23' },
      { norad: 43567, name: 'NROL-47 (TOPAZ)', type: 'PAYLOAD', period: 107.4, inc: 123.0, apo: 1100, per: 1000, rcs: 'LARGE', country: 'US', launch: '2018-01-12' },
      { norad: 37348, name: 'LACROSSE 5 (ONYX)', type: 'PAYLOAD', period: 95.2, inc: 57.0, apo: 520, per: 510, rcs: 'LARGE', country: 'US', launch: '2005-04-30' },
      { norad: 49044, name: 'JILIN-1-GF03D', type: 'PAYLOAD', period: 96.7, inc: 97.51, apo: 535, per: 530, rcs: 'SMALL', country: 'PRC', launch: '2022-01-26' },
      { norad: 41335, name: 'GAOFEN 4', type: 'PAYLOAD', period: 1436.0, inc: 0.05, apo: 35793, per: 35780, rcs: 'LARGE', country: 'PRC', launch: '2015-12-29' },
      { norad: 51001, name: 'SHAHEEN-SAT', type: 'PAYLOAD', period: 94.8, inc: 42.0, apo: 500, per: 490, rcs: 'SMALL', country: 'IR', launch: '2023-09-27' },
      { norad: 50100, name: 'OFEK 16', type: 'PAYLOAD', period: 94.5, inc: 141.9, apo: 600, per: 340, rcs: 'SMALL', country: 'IL', launch: '2020-07-06' },
      { norad: 47851, name: 'TURKSAT 5A', type: 'PAYLOAD', period: 1436.1, inc: 0.03, apo: 35800, per: 35785, rcs: 'LARGE', country: 'TUR', launch: '2021-01-08' },
      { norad: 43700, name: 'ICEYE-X1', type: 'PAYLOAD', period: 95.0, inc: 97.69, apo: 570, per: 490, rcs: 'SMALL', country: 'FI', launch: '2018-01-12' },
    ];

    const now = Date.now();

    return satellites.map((sat, i) => {
      // Simple orbit simulation for ground track position
      const periodMs = sat.period * 60 * 1000;
      const phase = ((now + i * 137000) % periodMs) / periodMs * 2 * Math.PI;
      const incRad = (sat.inc * Math.PI) / 180;

      // Ground track estimation
      let lat = Math.asin(Math.sin(incRad) * Math.sin(phase)) * (180 / Math.PI);
      let lon = ((i * 47 + (now / 1000) * 0.004) % 360) - 180;

      // Clamp to valid ranges
      lat = Math.max(-90, Math.min(90, lat));
      lon = Math.max(-180, Math.min(180, lon));

      return {
        entityType: 'satellite',
        entityId: `SAT-${sat.norad}`,
        displayName: sat.name,
        lat,
        lon,
        altitude: ((sat.apo + sat.per) / 2) * 1000, // km to m
        heading: null,
        speed: null,
        confidence: 0.90,
        properties: {
          norad_id: sat.norad,
          object_name: sat.name,
          object_type: sat.type,
          period_min: sat.period,
          inclination: sat.inc,
          apogee_km: sat.apo,
          perigee_km: sat.per,
          rcs_size: sat.rcs,
          country_code: sat.country,
          launch_date: sat.launch,
          decay_date: null,
          epoch: new Date().toISOString(),
        },
      };
    });
  }
}
