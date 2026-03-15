import { ConfigService } from '@nestjs/config';

export class AdsbExchangeSource {
  private readonly apiKey?: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = config.get('ADSB_EXCHANGE_API_KEY');
  }

  async fetch(): Promise<any[]> {
    if (!this.apiKey) return this.getMockData();

    const lat = 27;
    const lon = 52;
    const radius = 250; // nautical miles
    const url = `https://adsbexchange.com/api/aircraft/json/lat/${lat}/lon/${lon}/dist/${radius}/`;
    const res = await fetch(url, {
      headers: {
        'api-auth': this.apiKey,
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`ADS-B Exchange HTTP ${res.status}`);
    const data = await res.json() as any;

    return (data.ac || []).map((ac: any) => ({
      entityType: 'aircraft',
      entityId: `ICAO-${ac.icao}`,
      displayName: ac.call?.trim() || ac.reg || ac.icao,
      lat: ac.lat,
      lon: ac.lon,
      altitude: ac.alt ? ac.alt * 0.3048 : null, // ft to m
      heading: ac.trak,
      speed: ac.spd, // already in kts
      confidence: 0.92,
      properties: {
        icao24: ac.icao,
        callsign: ac.call?.trim(),
        registration: ac.reg,
        aircraftType: ac.type,
        operator: ac.opIcao,
        squawk: ac.sqk,
        altBaro: ac.alt,
        vertRate: ac.vsi,
        category: ac.category,
        mil: ac.mil,
      },
      rawData: ac,
    })).filter((e: any) => e.lat != null && e.lon != null);
  }

  private getMockData(): any[] {
    // Persian Gulf military-style & surveillance aircraft
    const aircraft = [
      { callsign: 'FORTE12', type: 'GLBL', reg: '10-2045', mil: true, desc: 'RQ-4B Global Hawk' },
      { callsign: 'FORTE11', type: 'GLBL', reg: '11-2046', mil: true, desc: 'RQ-4B Global Hawk' },
      { callsign: 'DUKE21', type: 'RC135', reg: '62-4132', mil: true, desc: 'RC-135V Rivet Joint' },
      { callsign: 'DUKE22', type: 'RC135', reg: '64-4841', mil: true, desc: 'RC-135W Rivet Joint' },
      { callsign: 'RCH871', type: 'C17', reg: '05-5141', mil: true, desc: 'C-17A Globemaster III' },
      { callsign: 'RCH402', type: 'C17', reg: '07-7178', mil: true, desc: 'C-17A Globemaster III' },
      { callsign: 'NCHO51', type: 'E3TF', reg: '75-0557', mil: true, desc: 'E-3C Sentry AWACS' },
      { callsign: 'NCHO52', type: 'E3TF', reg: '77-0354', mil: true, desc: 'E-3C Sentry AWACS' },
      { callsign: 'LAGR131', type: 'KC135', reg: '58-0100', mil: true, desc: 'KC-135R Stratotanker' },
      { callsign: 'LAGR132', type: 'KC135', reg: '61-0266', mil: true, desc: 'KC-135R Stratotanker' },
      { callsign: 'HOMER31', type: 'P8', reg: '169010', mil: true, desc: 'P-8A Poseidon' },
      { callsign: 'HOMER32', type: 'P8', reg: '169332', mil: true, desc: 'P-8A Poseidon' },
      { callsign: 'VIPER01', type: 'F16', reg: '91-0376', mil: true, desc: 'F-16CM Fighting Falcon' },
      { callsign: 'VIPER02', type: 'F16', reg: '91-0401', mil: true, desc: 'F-16CM Fighting Falcon' },
      { callsign: 'TOXIN41', type: 'MQ9', reg: '12-4217', mil: true, desc: 'MQ-9A Reaper' },
      { callsign: 'TOXIN42', type: 'MQ9', reg: '14-4432', mil: true, desc: 'MQ-9A Reaper' },
      { callsign: 'SNTRY60', type: 'E3CF', reg: 'ZH101', mil: true, desc: 'E-3D Sentry AEW.1' },
      { callsign: 'ASCOT01', type: 'A332', reg: 'ZZ330', mil: true, desc: 'Voyager KC3' },
      { callsign: 'QUID61', type: 'C130', reg: 'ZH879', mil: true, desc: 'C-130J Hercules' },
      { callsign: 'ATLAS1', type: 'A400', reg: 'ZM401', mil: true, desc: 'A400M Atlas' },
      { callsign: 'GFA501', type: 'A320', reg: 'A9C-AB', mil: false, desc: 'Gulf Air A320' },
      { callsign: 'QTR8101', type: 'B77W', reg: 'A7-BAA', mil: false, desc: 'Qatar Airways B777' },
      { callsign: 'ETD405', type: 'B789', reg: 'A6-BLA', mil: false, desc: 'Etihad B787-9' },
      { callsign: 'UAE2903', type: 'A388', reg: 'A6-EDA', mil: false, desc: 'Emirates A380' },
      { callsign: 'SVA107', type: 'B789', reg: 'HZ-AR11', mil: false, desc: 'Saudi B787-9' },
      { callsign: 'OMA641', type: 'B738', reg: 'A40-BH', mil: false, desc: 'Oman Air B737' },
      { callsign: 'KAC301', type: 'A310', reg: '9K-AMA', mil: false, desc: 'Kuwait Airways A310' },
      { callsign: 'IAW112', type: 'B738', reg: 'YI-ASA', mil: false, desc: 'Iraqi Airways B737' },
      { callsign: 'IRM721', type: 'A306', reg: 'EP-MNB', mil: false, desc: 'Mahan Air A300' },
      { callsign: 'QSM501', type: 'A320', reg: 'A7-MBK', mil: false, desc: 'Qatar Amiri Flight' },
    ];

    return aircraft.map((ac, i) => {
      // Distribute across Persian Gulf region: lat 24-30, lon 48-56
      const lat = 24 + Math.random() * 6;
      const lon = 48 + Math.random() * 8;
      const altitude = ac.mil ? 10000 + Math.random() * 8000 : 9000 + Math.random() * 3000;
      const speed = ac.mil ? 250 + Math.random() * 300 : 380 + Math.random() * 120;

      return {
        entityType: 'aircraft',
        entityId: `ICAO-${(0xae0000 + i * 0x0811).toString(16)}`,
        displayName: ac.callsign,
        lat,
        lon,
        altitude,
        heading: Math.random() * 360,
        speed,
        confidence: 0.92,
        properties: {
          icao24: (0xae0000 + i * 0x0811).toString(16),
          callsign: ac.callsign,
          registration: ac.reg,
          aircraftType: ac.type,
          operator: ac.callsign.substring(0, 3),
          squawk: ac.mil ? '7700' : (2000 + i * 111).toString(),
          altBaro: Math.round(altitude * 3.281),
          vertRate: Math.round((Math.random() - 0.5) * 500),
          category: ac.mil ? 'A7' : 'A3',
          mil: ac.mil,
          description: ac.desc,
        },
      };
    });
  }
}
