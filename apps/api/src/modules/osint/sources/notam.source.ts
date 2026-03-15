import { ConfigService } from '@nestjs/config';

export class NotamSource {
  private readonly apiKey?: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = config.get('FAA_NOTAM_API_KEY');
  }

  async fetch(): Promise<any[]> {
    if (!this.apiKey) return this.getMockData();

    // FAA NOTAM API (ICAO format)
    const locations = 'LLBG,OLBA,OSDI,OJAI,ORBI,OERK,OTBD,OMDB,OIIE,LTBA';
    const url = `https://external-api.faa.gov/notamapi/v1/notams?icaoLocation=${locations}&notamType=N,R,A`;
    const res = await fetch(url, {
      headers: {
        'client_id': this.apiKey,
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error(`NOTAM API HTTP ${res.status}`);
    const data = await res.json() as any;

    return (data.items || []).map((n: any) => {
      const coords = this.parseNotamCoordinates(n.icaoMessage);
      return {
        entityType: 'event',
        entityId: `NOTAM-${n.id}`,
        displayName: `NOTAM: ${n.icaoLocation || 'Unknown'} - ${n.classification || 'N/A'}`,
        lat: coords?.lat || null,
        lon: coords?.lon || null,
        confidence: 0.95,
        properties: {
          subtype: 'notam',
          notam_id: n.id,
          classification: n.classification,
          location: n.icaoLocation,
          effectiveStart: n.effectiveStart,
          effectiveEnd: n.effectiveEnd,
          text: n.icaoMessage,
          type: n.notamType,
          scenario: n.scenario,
        },
        rawData: n,
      };
    }).filter((e: any) => e.lat != null && e.lon != null);
  }

  private parseNotamCoordinates(message: string): { lat: number; lon: number } | null {
    if (!message) return null;
    // Match ICAO coordinate format: ddmmN/dddmmE or similar
    const match = message.match(/(\d{4})([NS])(\d{5})([EW])/);
    if (!match) return null;

    let lat = parseInt(match[1].substring(0, 2)) + parseInt(match[1].substring(2, 4)) / 60;
    if (match[2] === 'S') lat = -lat;
    let lon = parseInt(match[3].substring(0, 3)) + parseInt(match[3].substring(3, 5)) / 60;
    if (match[4] === 'W') lon = -lon;

    return { lat, lon };
  }

  private getMockData(): any[] {
    const now = new Date();
    const in24h = new Date(now.getTime() + 86400000);
    const in48h = new Date(now.getTime() + 172800000);
    const in7d = new Date(now.getTime() + 604800000);

    const notams = [
      {
        id: 'A0012/24',
        classification: 'AIRSPACE',
        location: 'LLBG',
        locationName: 'Ben Gurion International Airport',
        lat: 32.0094,
        lon: 34.8781,
        effectiveStart: now.toISOString(),
        effectiveEnd: in7d.toISOString(),
        text: 'TEMPORARY RESTRICTED AREA ACTIVATED. R-101A FL000-FL200. MILITARY OPERATIONS IN PROGRESS. CONTACT TEL AVIV ACC ON 126.3 FOR CLEARANCE. RISK OF ANTI-AIRCRAFT ACTIVITY.',
      },
      {
        id: 'A0045/24',
        classification: 'AIRSPACE',
        location: 'OSDI',
        locationName: 'Damascus International Airport',
        lat: 33.4115,
        lon: 36.5156,
        effectiveStart: now.toISOString(),
        effectiveEnd: in48h.toISOString(),
        text: 'DAMASCUS FIR AIRSPACE RESTRICTED FL000-UNL. ALL CIVIL AVIATION OPERATIONS SUSPENDED UNTIL FURTHER NOTICE. MILITARY ACTIVITY IN PROGRESS. NOTAM REPLACES A0039/24.',
      },
      {
        id: 'C0189/24',
        classification: 'NAVIGATION',
        location: 'OLBA',
        locationName: 'Beirut Rafic Hariri International Airport',
        lat: 33.8209,
        lon: 35.4884,
        effectiveStart: now.toISOString(),
        effectiveEnd: in24h.toISOString(),
        text: 'ILS RWY 16 U/S. VOR/DME APPROACH RWY 16 AVAILABLE. MINIMUM VISIBILITY 3000M. LOW LEVEL WIND SHEAR REPORTED ON FINAL APPROACH.',
      },
      {
        id: 'B0301/24',
        classification: 'AIRSPACE',
        location: 'OJAI',
        locationName: 'Queen Alia International Airport, Amman',
        lat: 31.7226,
        lon: 35.9932,
        effectiveStart: now.toISOString(),
        effectiveEnd: in7d.toISOString(),
        text: 'TEMPORARY DANGER AREA D-40 ACTIVATED. SURFACE TO FL350. MILITARY EXERCISE EAGER LION. UNMANNED AERIAL VEHICLE OPERATIONS. LATERAL LIMITS: 31N035E - 32N036E - 32N037E - 31N037E.',
      },
      {
        id: 'A0567/24',
        classification: 'AERODROME',
        location: 'ORBI',
        locationName: 'Baghdad International Airport',
        lat: 33.2625,
        lon: 44.2346,
        effectiveStart: now.toISOString(),
        effectiveEnd: in48h.toISOString(),
        text: 'RWY 15R/33L CLSD FOR REPAIR WORKS. SINGLE RUNWAY OPS RWY 15L/33R IN EFFECT. EXPECT DELAYS. TAXIWAY ALPHA BETWEEN A3 AND A7 CLSD.',
      },
      {
        id: 'D0078/24',
        classification: 'AIRSPACE',
        location: 'OERK',
        locationName: 'King Khalid International Airport, Riyadh',
        lat: 24.9576,
        lon: 46.6988,
        effectiveStart: now.toISOString(),
        effectiveEnd: in24h.toISOString(),
        text: 'TEMPORARY RESTRICTED AREA ESTABLISHED RADIUS 30NM CENTERED ON 2458N04642E. FL000-FL600. HEAD OF STATE MOVEMENT. ALL ACFT CONTACT RIYADH ACC ON 124.3.',
      },
      {
        id: 'E0234/24',
        classification: 'AIRSPACE',
        location: 'OTBD',
        locationName: 'Doha Hamad International Airport',
        lat: 25.2731,
        lon: 51.6082,
        effectiveStart: in24h.toISOString(),
        effectiveEnd: in7d.toISOString(),
        text: 'UNMANNED AIRCRAFT SYSTEM (UAS) OPERATIONS WITHIN 5NM RADIUS OF DOHA ACC. FL000-FL050. OPERATORS MUST OBTAIN APPROVAL FROM QATAR CAA. ENHANCED SURVEILLANCE IN EFFECT.',
      },
      {
        id: 'F0091/24',
        classification: 'NAVIGATION',
        location: 'OMDB',
        locationName: 'Dubai International Airport',
        lat: 25.2528,
        lon: 55.3644,
        effectiveStart: now.toISOString(),
        effectiveEnd: in48h.toISOString(),
        text: 'GPS INTERFERENCE REPORTED WITHIN 50NM OF OMDB. PILOTS SHOULD MONITOR RAW DATA AND REPORT ANY ANOMALIES TO ATC. POSSIBLE JAMMING ACTIVITY DETECTED.',
      },
      {
        id: 'G0445/24',
        classification: 'AIRSPACE',
        location: 'OIIE',
        locationName: 'Tehran Imam Khomeini International Airport',
        lat: 35.4161,
        lon: 51.1522,
        effectiveStart: now.toISOString(),
        effectiveEnd: in7d.toISOString(),
        text: 'TEHRAN FIR: DANGER AREA D-71 ACTIVATED FL000-UNL. BALLISTIC MISSILE TEST FIRING. AREA BOUNDED BY 3500N05000E - 3600N05100E - 3600N05300E - 3500N05200E. AVOID AREA.',
      },
      {
        id: 'H0112/24',
        classification: 'AIRSPACE',
        location: 'LTBA',
        locationName: 'Istanbul Ataturk Airport',
        lat: 40.9769,
        lon: 28.8146,
        effectiveStart: now.toISOString(),
        effectiveEnd: in24h.toISOString(),
        text: 'TURKISH NAVAL EXERCISE AREA ACTIVATED. SEA SURFACE TO FL100. BLACK SEA AREA BOUNDED BY 4130N02830E - 4200N02900E - 4200N03000E - 4130N02930E. LIVE FIRING IN PROGRESS.',
      },
    ];

    return notams.map((n) => ({
      entityType: 'event',
      entityId: `NOTAM-${n.id}`,
      displayName: `NOTAM: ${n.locationName} - ${n.classification}`,
      lat: n.lat,
      lon: n.lon,
      confidence: 0.95,
      properties: {
        subtype: 'notam',
        notam_id: n.id,
        classification: n.classification,
        location: n.location,
        effectiveStart: n.effectiveStart,
        effectiveEnd: n.effectiveEnd,
        text: n.text,
      },
    }));
  }
}
