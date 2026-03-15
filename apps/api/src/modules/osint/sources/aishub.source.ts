import { ConfigService } from '@nestjs/config';

export class AisHubSource {
  private readonly apiKey?: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = config.get('AISHUB_API_KEY');
  }

  async fetch(): Promise<any[]> {
    if (!this.apiKey) return this.getMockData();

    // AISHub API - bounding box for Mediterranean + Suez
    const url = `https://data.aishub.net/ws.php?username=${this.apiKey}&format=1&output=json&compress=0&latmin=25&latmax=45&lonmin=-5&lonmax=45`;
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`AISHub HTTP ${res.status}`);
    const data = await res.json() as any;

    const records = Array.isArray(data) && data.length > 1 ? data[1] : [];
    return records.map((v: any) => ({
      entityType: 'vessel',
      entityId: `MMSI-${v.MMSI}`,
      displayName: v.NAME?.trim() || `MMSI-${v.MMSI}`,
      lat: v.LATITUDE,
      lon: v.LONGITUDE,
      altitude: 0,
      heading: v.HEADING === 511 ? null : v.HEADING,
      speed: v.SOG / 10, // SOG in 1/10 knot
      confidence: 0.88,
      properties: {
        mmsi: v.MMSI,
        imo: v.IMO,
        shipType: v.TYPE,
        destination: v.DEST?.trim(),
        draught: v.DRAUGHT ? v.DRAUGHT / 10 : null,
        navStatus: v.NAVSTAT,
        eta: v.ETA,
        length: v.A + v.B,
        width: v.C + v.D,
      },
      rawData: v,
    })).filter((e: any) => e.lat != null && e.lon != null);
  }

  private getMockData(): any[] {
    const vessels = [
      { name: 'EVER GIVEN', mmsi: 353136000, imo: 9811000, type: 70, dest: 'ROTTERDAM', draught: 16.0, len: 400, wid: 59 },
      { name: 'MSC OSCAR', mmsi: 353804000, imo: 9703318, type: 70, dest: 'HAMBURG', draught: 15.5, len: 395, wid: 59 },
      { name: 'MAERSK MCKINNEY', mmsi: 220417000, imo: 9619907, type: 70, dest: 'SINGAPORE', draught: 14.8, len: 399, wid: 59 },
      { name: 'CMA CGM MARCO POLO', mmsi: 215178000, imo: 9454436, type: 70, dest: 'PORT SAID', draught: 15.2, len: 396, wid: 54 },
      { name: 'COSCO UNIVERSE', mmsi: 477000100, imo: 9795610, type: 70, dest: 'PIRAEUS', draught: 14.5, len: 400, wid: 59 },
      { name: 'HMM ALGECIRAS', mmsi: 440119000, imo: 9863297, type: 70, dest: 'SUEZ CANAL', draught: 16.5, len: 400, wid: 61 },
      { name: 'HAPAG LLOYD EXPRESS', mmsi: 218330000, imo: 9806079, type: 70, dest: 'JEDDAH', draught: 13.5, len: 366, wid: 51 },
      { name: 'ONE INNOVATION', mmsi: 431501480, imo: 9786228, type: 70, dest: 'COLOMBO', draught: 14.0, len: 364, wid: 51 },
      { name: 'FRONT ALTA', mmsi: 258000600, imo: 9824758, type: 80, dest: 'RAS TANURA', draught: 21.5, len: 333, wid: 60 },
      { name: 'EURONAV SUEZMX', mmsi: 205678000, imo: 9709115, type: 80, dest: 'FUJAIRAH', draught: 20.8, len: 274, wid: 48 },
      { name: 'NISSOS SCHINOUSSA', mmsi: 241086000, imo: 9356073, type: 80, dest: 'BASRAH', draught: 17.3, len: 274, wid: 46 },
      { name: 'SUEZ FORTUNE', mmsi: 538006888, imo: 9800217, type: 80, dest: 'AIN SUKHNA', draught: 16.1, len: 250, wid: 44 },
      { name: 'BLUE MARLIN', mmsi: 249019000, imo: 9186338, type: 58, dest: 'JEBEL ALI', draught: 12.5, len: 217, wid: 63 },
      { name: 'DOCKWISE VANGUARD', mmsi: 244910580, imo: 9618783, type: 58, dest: 'PORT SAID', draught: 11.0, len: 275, wid: 70 },
      { name: 'PEARL OF QATAR', mmsi: 466320000, imo: 9636121, type: 75, dest: 'DOHA', draught: 8.5, len: 310, wid: 40 },
      { name: 'AL MARJAN', mmsi: 470398000, imo: 9349681, type: 41, dest: 'ABU DHABI', draught: 6.2, len: 105, wid: 18 },
      { name: 'SEAWISE GIANT', mmsi: 354400000, imo: 7381154, type: 80, dest: 'KHARG ISLAND', draught: 24.6, len: 458, wid: 69 },
      { name: 'BRITISH PIONEER', mmsi: 235098745, imo: 9621172, type: 80, dest: 'MILFORD HAVEN', draught: 15.2, len: 249, wid: 44 },
      { name: 'MSC ISTANBUL', mmsi: 636019312, imo: 9839284, type: 70, dest: 'ISTANBUL', draught: 14.0, len: 366, wid: 51 },
      { name: 'MED STAR', mmsi: 636092345, imo: 9432120, type: 70, dest: 'GENOVA', draught: 12.8, len: 294, wid: 32 },
      { name: 'AEGEAN BREEZE', mmsi: 239876123, imo: 9245112, type: 80, dest: 'TRIESTE', draught: 14.2, len: 243, wid: 42 },
      { name: 'PACIFIC VOYAGER', mmsi: 538007721, imo: 9790345, type: 80, dest: 'MARSEILLE', draught: 17.0, len: 274, wid: 48 },
      { name: 'NILE CARRIER', mmsi: 622123456, imo: 9512344, type: 70, dest: 'ALEXANDRIA', draught: 10.5, len: 190, wid: 28 },
      { name: 'ADRIATIC QUEEN', mmsi: 247321000, imo: 9398712, type: 60, dest: 'VENICE', draught: 7.0, len: 252, wid: 30 },
      { name: 'LIBYAN SPIRIT', mmsi: 642011234, imo: 9345011, type: 80, dest: 'ZAWIYA', draught: 13.8, len: 244, wid: 42 },
      { name: 'CRETE STAR', mmsi: 240567000, imo: 9489231, type: 60, dest: 'HERAKLION', draught: 6.5, len: 178, wid: 25 },
      { name: 'BOSPHORUS BRIDGE', mmsi: 271001234, imo: 9845632, type: 70, dest: 'MERSIN', draught: 11.2, len: 260, wid: 35 },
      { name: 'RED SEA GUARDIAN', mmsi: 403567890, imo: 9701123, type: 80, dest: 'YANBU', draught: 18.1, len: 290, wid: 50 },
      { name: 'SICILIAN EXPRESS', mmsi: 247098765, imo: 9512890, type: 70, dest: 'PALERMO', draught: 9.8, len: 200, wid: 30 },
      { name: 'MALTA FORTUNE', mmsi: 215830000, imo: 9623478, type: 70, dest: 'VALLETTA', draught: 11.0, len: 228, wid: 32 },
      { name: 'CYPRUS MERCHANT', mmsi: 212456000, imo: 9401234, type: 70, dest: 'LIMASSOL', draught: 10.2, len: 185, wid: 28 },
      { name: 'ANTALYA SPIRIT', mmsi: 271045678, imo: 9567234, type: 80, dest: 'CEYHAN', draught: 16.0, len: 274, wid: 48 },
      { name: 'GULF PIONEER', mmsi: 470123456, imo: 9698321, type: 80, dest: 'MINA AL AHMADI', draught: 19.5, len: 330, wid: 58 },
      { name: 'ADEN TRADER', mmsi: 473567890, imo: 9543210, type: 70, dest: 'ADEN', draught: 9.0, len: 172, wid: 25 },
      { name: 'DJIBOUTI EXPRESS', mmsi: 636087654, imo: 9612345, type: 70, dest: 'DJIBOUTI', draught: 10.5, len: 210, wid: 30 },
      { name: 'HORN NAVIGATOR', mmsi: 538004321, imo: 9745678, type: 80, dest: 'MOGADISHU', draught: 12.0, len: 228, wid: 32 },
      { name: 'CAIRO STAR', mmsi: 622098765, imo: 9521098, type: 60, dest: 'DAMIETTA', draught: 8.0, len: 195, wid: 26 },
      { name: 'TUNIS CARRIER', mmsi: 672012345, imo: 9432167, type: 70, dest: 'LA GOULETTE', draught: 9.2, len: 188, wid: 27 },
      { name: 'ALGIERS FORTUNE', mmsi: 605123456, imo: 9510234, type: 80, dest: 'ARZEW', draught: 14.5, len: 260, wid: 43 },
      { name: 'TANGIER MERCHANT', mmsi: 242567890, imo: 9601234, type: 70, dest: 'TANGER MED', draught: 11.5, len: 225, wid: 32 },
    ];

    // Shipping lanes: Mediterranean, Suez approaches, Red Sea
    const routes = [
      { latMin: 31.0, latMax: 31.5, lonMin: 31.5, lonMax: 32.5 }, // Suez Canal approaches
      { latMin: 33.0, latMax: 36.0, lonMin: 15.0, lonMax: 28.0 }, // Central Mediterranean
      { latMin: 36.0, latMax: 42.0, lonMin: 5.0, lonMax: 20.0 },  // Western Mediterranean
      { latMin: 12.0, latMax: 20.0, lonMin: 40.0, lonMax: 45.0 }, // Red Sea / Bab el-Mandeb
      { latMin: 28.0, latMax: 31.0, lonMin: 32.0, lonMax: 34.0 }, // Gulf of Suez
    ];

    const navStatuses = [0, 0, 0, 0, 0, 0, 0, 5, 7, 8]; // Mostly underway, some at anchor/moored

    return vessels.map((v, i) => {
      const route = routes[i % routes.length];
      const lat = route.latMin + Math.random() * (route.latMax - route.latMin);
      const lon = route.lonMin + Math.random() * (route.lonMax - route.lonMin);
      const heading = Math.random() * 360;
      const speed = v.type === 80 ? 10 + Math.random() * 6 : 14 + Math.random() * 10; // tankers slower
      const navStatus = navStatuses[i % navStatuses.length];

      return {
        entityType: 'vessel',
        entityId: `MMSI-${v.mmsi}`,
        displayName: v.name,
        lat,
        lon,
        altitude: 0,
        heading: navStatus === 5 || navStatus === 1 ? null : heading,
        speed: navStatus === 5 || navStatus === 1 ? 0 : speed,
        confidence: 0.88,
        properties: {
          mmsi: v.mmsi,
          imo: v.imo,
          shipType: v.type,
          destination: v.dest,
          draught: v.draught,
          navStatus,
          eta: new Date(Date.now() + Math.random() * 7 * 86400000).toISOString(),
          length: v.len,
          width: v.wid,
        },
      };
    });
  }
}
