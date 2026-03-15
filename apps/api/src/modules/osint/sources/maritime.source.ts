import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { EventEmitter } from 'events';

interface VesselState {
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

interface AISStreamMessage {
  MessageType: string;
  MetaData: {
    MMSI: number;
    MMSI_String: string;
    ShipName?: string;
    latitude: number;
    longitude: number;
    time_utc: string;
  };
  Message: {
    PositionReport?: {
      Sog: number;       // Speed over ground (knots * 10)
      Cog: number;       // Course over ground (degrees * 10)
      TrueHeading: number;
      Latitude: number;
      Longitude: number;
      NavigationalStatus: number;
      RateOfTurn: number;
      Timestamp: number;
    };
    ShipStaticData?: {
      AisVersion: number;
      ImoNumber: number;
      CallSign: string;
      Name: string;
      Type: number;
      Dimension: { A: number; B: number; C: number; D: number };
      Draught: number;
      Destination: string;
      Eta: { Month: number; Day: number; Hour: number; Minute: number };
    };
  };
}

// Flags of convenience commonly used for sanctions evasion
const FLAGS_OF_CONVENIENCE = new Set([
  'PA', 'LR', 'MH', 'BS', 'MT', 'CY', 'BM', 'VU', 'KM', 'TG',
  'HN', 'BO', 'GE', 'MD', 'TZ', 'KH', 'MN', 'SL', 'KN', 'GD',
]);

// MID prefix to country mapping (first 3 digits of MMSI)
const MID_COUNTRIES: Record<string, string> = {
  '201': 'AL', '202': 'AD', '203': 'AT', '204': 'PT', '205': 'BE',
  '206': 'BY', '207': 'BG', '208': 'VA', '209': 'CY', '210': 'CY',
  '211': 'DE', '212': 'CY', '213': 'GE', '214': 'MD', '215': 'MT',
  '216': 'AM', '218': 'DE', '219': 'DK', '220': 'DK', '224': 'ES',
  '225': 'ES', '226': 'FR', '227': 'FR', '228': 'FR', '229': 'MT',
  '230': 'FI', '231': 'FO', '232': 'GB', '233': 'GB', '234': 'GB',
  '235': 'GB', '236': 'GI', '237': 'GR', '238': 'HR', '239': 'GR',
  '240': 'GR', '241': 'GR', '242': 'MA', '243': 'HU', '244': 'NL',
  '245': 'NL', '246': 'NL', '247': 'IT', '248': 'MT', '249': 'MT',
  '250': 'IE', '251': 'IS', '252': 'LI', '253': 'LU', '254': 'MC',
  '255': 'PT', '256': 'MT', '257': 'NO', '258': 'NO', '259': 'NO',
  '261': 'PL', '263': 'PT', '264': 'RO', '265': 'SE', '266': 'SE',
  '267': 'SK', '268': 'SM', '269': 'CH', '270': 'CZ', '271': 'TR',
  '272': 'UA', '273': 'RU', '274': 'MK', '275': 'LV', '276': 'EE',
  '277': 'LT', '278': 'SI', '279': 'ME', '301': 'AI', '303': 'US',
  '304': 'AG', '305': 'AG', '306': 'CW', '307': 'AR', '308': 'BS',
  '309': 'BS', '310': 'BM', '311': 'BS', '312': 'BZ', '314': 'BB',
  '316': 'CA', '319': 'KY', '321': 'CR', '323': 'CU', '325': 'DM',
  '327': 'DO', '329': 'GP', '330': 'GD', '331': 'GL', '332': 'GT',
  '334': 'HN', '336': 'HT', '338': 'US', '339': 'JM', '341': 'KN',
  '343': 'LC', '345': 'MX', '347': 'MQ', '348': 'MS', '350': 'NI',
  '351': 'PA', '352': 'PA', '353': 'PA', '354': 'PA', '355': 'PA',
  '356': 'PA', '357': 'PA', '358': 'PR', '359': 'SV', '361': 'PM',
  '362': 'TT', '364': 'TC', '366': 'US', '367': 'US', '368': 'US',
  '369': 'US', '370': 'PA', '371': 'PA', '372': 'PA', '373': 'PA',
  '374': 'PA', '375': 'VC', '376': 'VC', '377': 'VC', '378': 'VG',
  '379': 'VI', '401': 'AF', '403': 'SA', '405': 'BD', '408': 'BH',
  '410': 'BT', '412': 'CN', '413': 'CN', '414': 'CN', '416': 'TW',
  '417': 'LK', '419': 'IN', '422': 'IR', '423': 'AZ', '425': 'IQ',
  '428': 'IL', '431': 'JP', '432': 'JP', '434': 'TM', '436': 'KZ',
  '437': 'UZ', '438': 'JO', '440': 'KR', '441': 'KR', '443': 'PS',
  '445': 'KP', '447': 'KW', '450': 'LB', '451': 'KG', '453': 'MO',
  '455': 'MV', '457': 'MN', '459': 'NP', '461': 'OM', '463': 'PK',
  '466': 'QA', '468': 'SY', '470': 'AE', '471': 'AE', '472': 'TJ',
  '473': 'YE', '475': 'AF', '477': 'HK', '478': 'BA',
  '501': 'AQ', '503': 'AU', '506': 'MM', '508': 'BN', '510': 'FM',
  '511': 'PW', '512': 'NZ', '514': 'KH', '515': 'KH', '516': 'CX',
  '518': 'CK', '520': 'FJ', '523': 'CC', '525': 'ID', '529': 'KI',
  '531': 'LA', '533': 'MY', '536': 'MP', '538': 'MH', '540': 'NC',
  '542': 'NU', '544': 'NR', '546': 'PF', '548': 'PH', '553': 'PG',
  '555': 'PN', '557': 'SB', '559': 'AS', '561': 'WS', '563': 'SG',
  '564': 'SG', '565': 'SG', '566': 'SG', '567': 'TH', '570': 'TO',
  '572': 'TV', '574': 'VN', '576': 'VU', '577': 'VU', '578': 'WF',
  '601': 'ZA', '603': 'AO', '605': 'DZ', '607': 'TF', '608': 'IO',
  '609': 'BI', '610': 'BJ', '611': 'BW', '612': 'CF', '613': 'CM',
  '615': 'CG', '616': 'KM', '617': 'CV', '618': 'AQ', '619': 'CI',
  '620': 'KM', '621': 'DJ', '622': 'EG', '624': 'ET', '625': 'ER',
  '626': 'GA', '627': 'GH', '629': 'GM', '630': 'GW', '631': 'GQ',
  '632': 'GN', '633': 'BF', '634': 'KE', '635': 'AQ', '636': 'LR',
  '637': 'LR', '638': 'SS', '642': 'LY', '644': 'LS', '645': 'MU',
  '647': 'MG', '649': 'ML', '650': 'MZ', '654': 'MR', '655': 'MW',
  '656': 'NE', '657': 'NG', '659': 'NA', '660': 'RE', '661': 'RW',
  '662': 'SD', '663': 'SN', '664': 'SC', '665': 'SH', '666': 'SO',
  '667': 'SL', '668': 'ST', '669': 'SZ', '670': 'TD', '671': 'TG',
  '672': 'TN', '674': 'TZ', '675': 'UG', '676': 'CD', '677': 'TZ',
  '678': 'ZM', '679': 'ZW',
};

// Ship type classification from AIS type code
function classifyShipType(aisType: number): string {
  if (aisType >= 70 && aisType <= 79) return 'cargo';
  if (aisType >= 80 && aisType <= 89) return 'tanker';
  if (aisType >= 60 && aisType <= 69) return 'passenger';
  if (aisType >= 40 && aisType <= 49) return 'high_speed';
  if (aisType >= 30 && aisType <= 39) return 'fishing';
  if (aisType === 50) return 'pilot';
  if (aisType === 51 || aisType === 52) return 'sar';
  if (aisType === 53) return 'port_tender';
  if (aisType === 55) return 'law_enforcement';
  if (aisType >= 20 && aisType <= 29) return 'wing_in_ground';
  if (aisType === 35) return 'military';
  return 'other';
}

// NAV status to human-readable
const NAV_STATUS: Record<number, string> = {
  0: 'Under way using engine',
  1: 'At anchor',
  2: 'Not under command',
  3: 'Restricted manoeuvrability',
  4: 'Constrained by draught',
  5: 'Moored',
  6: 'Aground',
  7: 'Engaged in fishing',
  8: 'Under way sailing',
  14: 'AIS-SART (active)',
  15: 'Not defined',
};

export class MaritimeSource extends EventEmitter {
  private readonly logger = new Logger(MaritimeSource.name);
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 20;
  private readonly baseReconnectDelay = 1000;
  private vesselBuffer: VesselState[] = [];
  private readonly bufferFlushInterval = 5000; // flush buffer every 5s
  private staticData = new Map<string, any>(); // MMSI -> static data cache

  constructor(private readonly config: ConfigService) {
    super();
  }

  /**
   * Start persistent WebSocket connection to AISStream.io
   */
  async connect(): Promise<void> {
    const apiKey = this.config.get<string>('AISSTREAM_API_KEY');
    if (!apiKey) {
      this.logger.warn('AISSTREAM_API_KEY not set — maritime tracking disabled');
      return;
    }

    this.setupWebSocket(apiKey);

    // Flush buffered vessels periodically
    setInterval(() => {
      if (this.vesselBuffer.length > 0) {
        const batch = [...this.vesselBuffer];
        this.vesselBuffer = [];
        this.emit('batch', batch);
      }
    }, this.bufferFlushInterval);
  }

  /**
   * Fetch buffered vessels (for polling-based integration with existing osint.service.ts)
   */
  async fetch(): Promise<VesselState[]> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      const apiKey = this.config.get<string>('AISSTREAM_API_KEY');
      if (!apiKey) return [];
      this.setupWebSocket(apiKey);
      // Wait briefly for initial data
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    const batch = [...this.vesselBuffer];
    this.vesselBuffer = [];
    return batch;
  }

  disconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close(1000, 'Shutting down');
      this.ws = null;
    }
  }

  private setupWebSocket(apiKey: string): void {
    try {
      this.ws = new WebSocket('wss://stream.aisstream.io/v0/stream');

      this.ws.onopen = () => {
        this.logger.log('AISStream WebSocket connected');
        this.reconnectAttempts = 0;

        // Must send subscription within 3 seconds
        const subscription = {
          APIKey: apiKey,
          BoundingBoxes: [[[-90, -180], [90, 180]]], // Global
          FilterMessageTypes: ['PositionReport', 'ShipStaticData'],
        };
        this.ws!.send(JSON.stringify(subscription));
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const msg: AISStreamMessage = JSON.parse(event.data.toString());
          this.handleMessage(msg);
        } catch (err) {
          // Skip malformed messages
        }
      };

      this.ws.onerror = (err) => {
        this.logger.error(`AISStream WebSocket error: ${err}`);
      };

      this.ws.onclose = (event) => {
        this.logger.warn(`AISStream WebSocket closed: ${event.code} ${event.reason}`);
        this.scheduleReconnect(apiKey);
      };
    } catch (err) {
      this.logger.error(`Failed to create AISStream WebSocket: ${err}`);
      this.scheduleReconnect(apiKey);
    }
  }

  private scheduleReconnect(apiKey: string): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error('Max reconnect attempts reached for AISStream');
      return;
    }
    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts) + Math.random() * 1000,
      60000
    );
    this.reconnectAttempts++;
    this.logger.log(`Reconnecting to AISStream in ${Math.round(delay / 1000)}s (attempt ${this.reconnectAttempts})`);
    this.reconnectTimer = setTimeout(() => this.setupWebSocket(apiKey), delay);
  }

  private handleMessage(msg: AISStreamMessage): void {
    const mmsi = msg.MetaData.MMSI_String;

    if (msg.Message.ShipStaticData) {
      // Cache static data for enrichment
      this.staticData.set(mmsi, msg.Message.ShipStaticData);
      return;
    }

    if (msg.Message.PositionReport) {
      const pos = msg.Message.PositionReport;
      const staticInfo = this.staticData.get(mmsi);

      // Skip invalid positions
      if (pos.Latitude === 91 || pos.Longitude === 181) return;

      const vessel = this.normalizeVessel(mmsi, msg.MetaData, pos, staticInfo);
      this.vesselBuffer.push(vessel);
    }
  }

  private normalizeVessel(
    mmsi: string,
    meta: AISStreamMessage['MetaData'],
    pos: NonNullable<AISStreamMessage['Message']['PositionReport']>,
    staticInfo?: any,
  ): VesselState {
    const shipName = staticInfo?.Name || meta.ShipName || `MMSI-${mmsi}`;
    const midPrefix = mmsi.substring(0, 3);
    const flagCountry = MID_COUNTRIES[midPrefix] || 'UNKNOWN';
    const shipType = staticInfo ? classifyShipType(staticInfo.Type) : 'unknown';
    const isFlagOfConvenience = FLAGS_OF_CONVENIENCE.has(flagCountry);

    // Age-based confidence: recent = high, stale = lower
    const confidence = 0.95;

    return {
      entityId: `mmsi-${mmsi}`,
      entityType: 'vessel',
      displayName: shipName.trim(),
      lat: pos.Latitude,
      lon: pos.Longitude,
      altitude: null,
      heading: pos.TrueHeading !== 511 ? pos.TrueHeading : null,
      speed: pos.Sog / 10, // AIS SOG is in 1/10 knot
      confidence,
      properties: {
        mmsi,
        imo: staticInfo?.ImoNumber || null,
        callsign: staticInfo?.CallSign?.trim() || null,
        ship_type: shipType,
        ship_type_code: staticInfo?.Type || null,
        flag_country: flagCountry,
        flag_of_convenience: isFlagOfConvenience,
        destination: staticInfo?.Destination?.trim() || null,
        draught: staticInfo ? staticInfo.Draught / 10 : null,
        nav_status: NAV_STATUS[pos.NavigationalStatus] || 'Unknown',
        nav_status_code: pos.NavigationalStatus,
        rate_of_turn: pos.RateOfTurn,
        cog: pos.Cog / 10,
        length: staticInfo ? staticInfo.Dimension.A + staticInfo.Dimension.B : null,
        width: staticInfo ? staticInfo.Dimension.C + staticInfo.Dimension.D : null,
        eta: staticInfo?.Eta || null,
      },
      rawData: { position: pos, static: staticInfo || null, meta },
    };
  }
}
