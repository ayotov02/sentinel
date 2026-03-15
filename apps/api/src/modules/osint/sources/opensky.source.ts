import { ConfigService } from '@nestjs/config';

export class OpenSkySource {
  private readonly clientId?: string;
  private readonly clientSecret?: string;

  constructor(private readonly config: ConfigService) {
    this.clientId = config.get('OPENSKY_CLIENT_ID');
    this.clientSecret = config.get('OPENSKY_CLIENT_SECRET');
  }

  async fetch(): Promise<any[]> {
    if (!this.clientId) return this.getMockData();

    const url = 'https://opensky-network.org/api/states/all';
    const headers: Record<string, string> = {};
    if (this.clientId && this.clientSecret) {
      headers['Authorization'] = 'Basic ' + Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    }

    const res = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`OpenSky HTTP ${res.status}`);
    const data = await res.json() as any;

    return (data.states || []).slice(0, 500).map((s: any[]) => ({
      entityType: 'aircraft',
      entityId: `ICAO-${s[0]}`,
      displayName: s[1]?.trim() || s[0],
      lat: s[6],
      lon: s[5],
      altitude: s[7],
      heading: s[10],
      speed: s[9] ? s[9] * 1.944 : null, // m/s to kts
      confidence: s[8] ? 0.7 : 0.95, // on_ground vs airborne
      properties: {
        icao24: s[0],
        callsign: s[1]?.trim(),
        originCountry: s[2],
        onGround: s[8],
        squawk: s[14],
        spi: s[15],
        positionSource: s[16],
      },
    })).filter((e: any) => e.lat != null && e.lon != null);
  }

  private getMockData(): any[] {
    // Mediterranean region mock aircraft
    const callsigns = ['THY123','DLH456','BAW789','AFR012','UAE345','QTR678','ELY901','MEA234','RYR567','SAS890',
      'AZA111','IBE222','KLM333','SWR444','TAP555','LOT666','CSA777','AUA888','BEL999','FIN100',
      'EZY201','WZZ302','PGT403','SXS504','AEE605','OHY706','THY807','TRA908','VLG109','NOZ210',
      'RAM311','TUN412','MSR513','SVA614','ETH715','KQA816','SAA917','ANA018','JAL119','CPA220',
      'SIA321','THA422','MAS523','GIA624','UAE725','QFA826','ANZ927','LAN028','ACA129','DAL230'];

    return callsigns.map((cs, i) => ({
      entityType: 'aircraft',
      entityId: `ICAO-${(0xa00000 + i * 0x1111).toString(16)}`,
      displayName: cs,
      lat: 30 + Math.random() * 20,
      lon: 10 + Math.random() * 40,
      altitude: 8000 + Math.random() * 4000,
      heading: Math.random() * 360,
      speed: 350 + Math.random() * 150,
      confidence: 0.95,
      properties: {
        icao24: (0xa00000 + i * 0x1111).toString(16),
        callsign: cs,
        originCountry: ['Turkey','Germany','UK','France','UAE','Qatar','Israel','Lebanon'][i % 8],
        onGround: false,
        squawk: (1000 + i * 100).toString(),
      },
    }));
  }
}
