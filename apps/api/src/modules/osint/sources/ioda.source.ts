import { ConfigService } from '@nestjs/config';

export class IodaSource {
  private readonly apiEnabled: boolean;

  constructor(private readonly config: ConfigService) {
    this.apiEnabled = config.get('IODA_ENABLED') === 'true';
  }

  async fetch(): Promise<any[]> {
    if (!this.apiEnabled) return this.getMockData();

    const from = Math.floor((Date.now() - 3600000) / 1000); // last hour
    const until = Math.floor(Date.now() / 1000);
    const url = `https://api.ioda.inetintel.cc.gatech.edu/v2/signals/raw/country?from=${from}&until=${until}`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error(`IODA HTTP ${res.status}`);
    const data = await res.json() as any;

    return (data.data || [])
      .filter((d: any) => d.severity && d.severity > 0.3)
      .map((d: any) => ({
        entityType: 'event',
        entityId: `IODA-${d.entity_type}-${d.entity_code}-${d.from}`,
        displayName: `Internet outage: ${d.entity_name || d.entity_code}`,
        lat: d.latitude || null,
        lon: d.longitude || null,
        confidence: Math.min(d.severity, 1.0),
        properties: {
          subtype: 'internet_outage',
          entity_type: d.entity_type,
          entity_code: d.entity_code,
          entity_name: d.entity_name,
          datasource: d.datasource,
          severity_score: d.severity,
          from: d.from,
          until: d.until,
          level: d.level,
        },
        rawData: d,
      }));
  }

  private getMockData(): any[] {
    const outages = [
      {
        entityCode: 'SY',
        entityName: 'Syria',
        entityTypeVal: 'country',
        lat: 35.0,
        lon: 38.0,
        severity: 0.92,
        datasource: 'bgp',
        level: 'critical',
        notes: 'Nationwide BGP route withdrawals affecting 87% of Syrian prefixes. Likely state-directed internet shutdown.',
      },
      {
        entityCode: 'SD',
        entityName: 'Sudan',
        entityTypeVal: 'country',
        lat: 15.5,
        lon: 32.5,
        severity: 0.78,
        datasource: 'active-probing',
        level: 'severe',
        notes: 'Significant internet disruption across Khartoum and surrounding states. Partial mobile network blackout.',
      },
      {
        entityCode: 'ET-AM',
        entityName: 'Ethiopia - Amhara Region',
        entityTypeVal: 'region',
        lat: 11.5,
        lon: 38.5,
        severity: 0.65,
        datasource: 'bgp',
        level: 'moderate',
        notes: 'Regional internet shutdown in Amhara. Correlates with reported military operations in the area.',
      },
      {
        entityCode: 'AS44244',
        entityName: 'Iran - Irancell (MTN)',
        entityTypeVal: 'asn',
        lat: 35.7,
        lon: 51.4,
        severity: 0.55,
        datasource: 'active-probing',
        level: 'moderate',
        notes: 'Irancell mobile data throttling detected. Social media platforms and messaging apps partially blocked.',
      },
      {
        entityCode: 'IQ-AR',
        entityName: 'Iraq - Anbar Province',
        entityTypeVal: 'region',
        lat: 33.4,
        lon: 43.3,
        severity: 0.42,
        datasource: 'bgp',
        level: 'minor',
        notes: 'Intermittent connectivity issues in Anbar province. Possible infrastructure damage from recent conflict activity.',
      },
    ];

    const now = Math.floor(Date.now() / 1000);

    return outages.map((o, i) => ({
      entityType: 'event',
      entityId: `IODA-${o.entityTypeVal}-${o.entityCode}-${now - i * 600}`,
      displayName: `Internet outage: ${o.entityName}`,
      lat: o.lat,
      lon: o.lon,
      confidence: o.severity,
      properties: {
        subtype: 'internet_outage',
        entity_type: o.entityTypeVal,
        entity_code: o.entityCode,
        entity_name: o.entityName,
        datasource: o.datasource,
        severity_score: o.severity,
        level: o.level,
        notes: o.notes,
        from: now - 3600 - i * 600,
        until: now,
      },
    }));
  }
}
