import { ConfigService } from '@nestjs/config';

export class FirmsSource {
  private readonly apiKey?: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = config.get('NASA_FIRMS_API_KEY');
  }

  async fetch(): Promise<any[]> {
    if (!this.apiKey) return this.getMockData();

    // NASA FIRMS (Fire Information for Resource Management System)
    // Area: Middle East / North Africa bounding box
    const area = '-5,0,60,45'; // west,south,east,north
    const dayRange = 1;
    const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${this.apiKey}/VIIRS_SNPP_NRT/${area}/${dayRange}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new Error(`FIRMS HTTP ${res.status}`);
    const text = await res.text();

    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',');
    const latIdx = headers.indexOf('latitude');
    const lonIdx = headers.indexOf('longitude');
    const brightIdx = headers.indexOf('bright_ti4');
    const scanIdx = headers.indexOf('scan');
    const trackIdx = headers.indexOf('track');
    const dateIdx = headers.indexOf('acq_date');
    const timeIdx = headers.indexOf('acq_time');
    const satIdx = headers.indexOf('satellite');
    const instrIdx = headers.indexOf('instrument');
    const confIdx = headers.indexOf('confidence');
    const frpIdx = headers.indexOf('frp');

    return lines.slice(1, 501).map((line, i) => {
      const cols = line.split(',');
      const lat = parseFloat(cols[latIdx]);
      const lon = parseFloat(cols[lonIdx]);
      const confidence = cols[confIdx];

      return {
        entityType: 'event',
        entityId: `FIRMS-${cols[dateIdx]}-${lat.toFixed(3)}-${lon.toFixed(3)}-${i}`,
        displayName: `Fire detection: ${lat.toFixed(2)}, ${lon.toFixed(2)}`,
        lat,
        lon,
        confidence: confidence === 'high' ? 0.95 : confidence === 'nominal' ? 0.75 : 0.5,
        properties: {
          subtype: 'fire',
          brightness: parseFloat(cols[brightIdx]),
          scan: parseFloat(cols[scanIdx]),
          track: parseFloat(cols[trackIdx]),
          acq_date: cols[dateIdx],
          acq_time: cols[timeIdx],
          satellite: cols[satIdx],
          instrument: cols[instrIdx],
          confidence_level: confidence,
          frp: parseFloat(cols[frpIdx]),
        },
      };
    }).filter((e) => !isNaN(e.lat) && !isNaN(e.lon));
  }

  private getMockData(): any[] {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];

    const hotspots = [
      // Sudan - conflict-related fires
      { lat: 13.452, lon: 25.312, brightness: 342.8, frp: 45.2, confidence: 'high', desc: 'El Fasher area, North Darfur - possible conflict fire' },
      { lat: 12.891, lon: 24.891, brightness: 338.5, frp: 38.1, confidence: 'high', desc: 'Nyala outskirts, South Darfur - structure fire' },
      { lat: 15.632, lon: 32.478, brightness: 310.2, frp: 12.5, confidence: 'nominal', desc: 'Khartoum North - urban fire' },
      // Libya - oil infrastructure
      { lat: 29.078, lon: 15.934, brightness: 367.4, frp: 89.3, confidence: 'high', desc: 'Sharara oil field area - gas flaring / disruption' },
      { lat: 30.412, lon: 19.123, brightness: 355.1, frp: 72.6, confidence: 'high', desc: 'Brega oil terminal region - flaring activity' },
      // Ethiopia - agricultural / conflict
      { lat: 12.234, lon: 37.891, brightness: 315.6, frp: 22.4, confidence: 'nominal', desc: 'Gondar area, Amhara - brush fire near conflict zone' },
      { lat: 8.912, lon: 38.456, brightness: 308.3, frp: 15.8, confidence: 'nominal', desc: 'Rift Valley, Oromia - agricultural burning' },
      // Yemen - conflict
      { lat: 14.823, lon: 42.978, brightness: 348.9, frp: 56.7, confidence: 'high', desc: 'Hodeidah port area - explosion detected' },
      { lat: 15.412, lon: 44.234, brightness: 332.1, frp: 31.4, confidence: 'high', desc: 'Sanaa outskirts - airstrike impact zone' },
      // Iraq / Syria - conflict & oil
      { lat: 36.345, lon: 43.121, brightness: 371.2, frp: 95.8, confidence: 'high', desc: 'Nineveh Plains, Iraq - oil well fire' },
      { lat: 35.178, lon: 40.234, brightness: 345.6, frp: 48.2, confidence: 'high', desc: 'Deir ez-Zor, Syria - oil facility fire' },
      // Central Africa
      { lat: 4.567, lon: 18.234, brightness: 312.4, frp: 18.9, confidence: 'nominal', desc: 'Central African Republic - bush fire' },
      // Nigeria
      { lat: 11.523, lon: 13.089, brightness: 329.7, frp: 28.3, confidence: 'nominal', desc: 'Borno State, Nigeria - suspected Boko Haram attack' },
      // Mozambique
      { lat: -11.234, lon: 40.123, brightness: 318.9, frp: 21.7, confidence: 'nominal', desc: 'Cabo Delgado - insurgency-related fire' },
      // Gulf region - industrial
      { lat: 26.234, lon: 50.178, brightness: 305.1, frp: 10.2, confidence: 'low', desc: 'Bahrain industrial area - controlled flaring' },
    ];

    return hotspots.map((h, i) => ({
      entityType: 'event',
      entityId: `FIRMS-${dateStr}-${h.lat.toFixed(3)}-${h.lon.toFixed(3)}-${i}`,
      displayName: `Fire detection: ${h.lat.toFixed(2)}, ${h.lon.toFixed(2)}`,
      lat: h.lat,
      lon: h.lon,
      confidence: h.confidence === 'high' ? 0.95 : h.confidence === 'nominal' ? 0.75 : 0.5,
      properties: {
        subtype: 'fire',
        brightness: h.brightness,
        scan: 0.39 + Math.random() * 0.3,
        track: 0.36 + Math.random() * 0.3,
        acq_date: dateStr,
        acq_time: `${String(Math.floor(Math.random() * 24)).padStart(2, '0')}${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
        satellite: i % 2 === 0 ? 'N' : 'N20',
        instrument: 'VIIRS',
        confidence_level: h.confidence,
        frp: h.frp,
        description: h.desc,
      },
    }));
  }
}
