import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

interface AircraftState {
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

interface AirplanesLiveAircraft {
  hex: string;
  flight?: string;
  r?: string;        // registration
  t?: string;        // aircraft type
  alt_baro?: number;
  alt_geom?: number;
  gs?: number;       // ground speed in knots
  track?: number;    // heading
  lat?: number;
  lon?: number;
  squawk?: string;
  emergency?: string;
  category?: string;
  nav_heading?: number;
  nac_p?: number;    // Navigation Accuracy Category - Position (GPS quality)
  nac_v?: number;    // Navigation Accuracy Category - Velocity
  nic?: number;      // Navigation Integrity Category
  sil?: number;      // Surveillance/Source Integrity Level
  gva?: number;      // Geometric Vertical Accuracy
  sda?: number;      // System Design Assurance
  seen?: number;     // seconds since last message
  seen_pos?: number; // seconds since last position
  oper?: string;     // operator
  ownOp?: string;    // owner/operator
  year?: string;     // year built
  desc?: string;     // aircraft description
  dbFlags?: number;  // database flags (1=military, 2=interesting, 4=PIA, 8=LADD)
}

export class AviationSource {
  private readonly logger = new Logger(AviationSource.name);
  private lastFetchTime = 0;
  private readonly minIntervalMs = 1000; // Airplanes.live: 1 req/sec

  // Military callsign patterns
  private readonly militaryPatterns = /^(SPAR|RCH|SAM|EXEC|MAGMA|REACH|FORGE|KING|SKULL|DOOM|VIPER|COBRA|HAWK|RAPTOR|BOXER|REAPER|DEMON|GHOST|KNIFE|TOXIN|NCHO|HOMER|FORTE|DUKE|JAKE|TOPCAT|FURY|TALON|HAVOC|IRON|STEEL|RACER|BOLT|CLAW|SNIPER|ALPHA|BRAVO)/;

  constructor(private readonly config: ConfigService) {}

  /**
   * Fetch all aircraft globally from Airplanes.live with adsb.lol failover
   */
  async fetch(): Promise<AircraftState[]> {
    const now = Date.now();
    if (now - this.lastFetchTime < this.minIntervalMs) {
      return [];
    }
    this.lastFetchTime = now;

    let rawAircraft: AirplanesLiveAircraft[] = [];

    try {
      // Primary: Airplanes.live (no auth, unfiltered including military)
      rawAircraft = await this.fetchAirplanesLive();
    } catch (err) {
      this.logger.warn(`Airplanes.live failed, trying adsb.lol: ${err}`);
      try {
        // Failover: adsb.lol (same v2 format)
        rawAircraft = await this.fetchAdsbLol();
      } catch (err2) {
        this.logger.error(`All aviation sources failed: ${err2}`);
        throw err2;
      }
    }

    return rawAircraft
      .filter(ac => ac.lat != null && ac.lon != null)
      .map(ac => this.normalize(ac));
  }

  /**
   * Fetch military aircraft specifically
   */
  async fetchMilitary(): Promise<AircraftState[]> {
    try {
      const response = await fetch('https://api.airplanes.live/v2/mil', {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return (data.ac || [])
        .filter((ac: AirplanesLiveAircraft) => ac.lat != null && ac.lon != null)
        .map((ac: AirplanesLiveAircraft) => this.normalize(ac, true));
    } catch (err) {
      this.logger.warn(`Military endpoint failed: ${err}`);
      return [];
    }
  }

  /**
   * Fetch aircraft near a specific point (for viewport-based polling)
   */
  async fetchNearPoint(lat: number, lon: number, radiusNm: number = 250): Promise<AircraftState[]> {
    try {
      const response = await fetch(
        `https://api.airplanes.live/v2/point/${lat}/${lon}/${radiusNm}`,
        { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(15000) }
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return (data.ac || [])
        .filter((ac: AirplanesLiveAircraft) => ac.lat != null && ac.lon != null)
        .map((ac: AirplanesLiveAircraft) => this.normalize(ac));
    } catch (err) {
      this.logger.warn(`Point query failed: ${err}`);
      return [];
    }
  }

  /**
   * Get GPS jamming zone data from current aircraft states
   * Returns H3 cells with GPS quality degradation metrics
   */
  getGpsJammingData(aircraft: AircraftState[]): Array<{
    h3Cell: string;
    degradedCount: number;
    totalCount: number;
    degradedRatio: number;
    severity: 'NONE' | 'POSSIBLE' | 'PROBABLE' | 'CONFIRMED';
    sampleAircraft: string[];
  }> {
    // Group aircraft by H3 cell (resolution 5, ~8.5 km edge length)
    const cellMap = new Map<string, { total: number; degraded: number; samples: string[] }>();

    for (const ac of aircraft) {
      const nacP = ac.rawData?.nac_p;
      if (nacP === undefined || nacP === null) continue;

      // Use simple lat/lon grid as H3 proxy (h3-js would be imported in real impl)
      // Grid at ~0.5 degree resolution ≈ 55km cells
      const cellKey = `${(Math.round(ac.lat * 2) / 2).toFixed(1)},${(Math.round(ac.lon * 2) / 2).toFixed(1)}`;

      const cell = cellMap.get(cellKey) || { total: 0, degraded: 0, samples: [] };
      cell.total++;
      if (nacP < 8) {
        cell.degraded++;
        if (cell.samples.length < 5) cell.samples.push(ac.entityId);
      }
      cellMap.set(cellKey, cell);
    }

    const zones: Array<any> = [];
    for (const [cell, data] of cellMap) {
      if (data.total < 3) continue; // Need minimum aircraft for meaningful analysis
      const ratio = data.degraded / data.total;
      let severity: 'NONE' | 'POSSIBLE' | 'PROBABLE' | 'CONFIRMED' = 'NONE';
      if (ratio > 0.5) severity = 'CONFIRMED';
      else if (ratio > 0.2) severity = 'PROBABLE';
      else if (ratio > 0.02) severity = 'POSSIBLE';

      zones.push({
        h3Cell: cell,
        degradedCount: data.degraded,
        totalCount: data.total,
        degradedRatio: ratio,
        severity,
        sampleAircraft: data.samples,
      });
    }

    return zones;
  }

  private async fetchAirplanesLive(): Promise<AirplanesLiveAircraft[]> {
    const response = await fetch('https://api.airplanes.live/v2/all', {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error(`Airplanes.live HTTP ${response.status}`);
    const data = await response.json();
    this.logger.debug(`Airplanes.live: ${(data.ac || []).length} aircraft`);
    return data.ac || [];
  }

  private async fetchAdsbLol(): Promise<AirplanesLiveAircraft[]> {
    const response = await fetch('https://api.adsb.lol/v2/all', {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error(`adsb.lol HTTP ${response.status}`);
    const data = await response.json();
    this.logger.debug(`adsb.lol: ${(data.ac || []).length} aircraft`);
    return data.ac || [];
  }

  private normalize(ac: AirplanesLiveAircraft, forceMilitary = false): AircraftState {
    const callsign = (ac.flight || '').trim();
    const isMilitary = forceMilitary ||
      (ac.dbFlags != null && (ac.dbFlags & 1) !== 0) ||
      this.militaryPatterns.test(callsign);

    // GPS quality-based confidence scoring
    let confidence = 0.95;
    if (ac.nac_p !== undefined) {
      if (ac.nac_p >= 8) confidence = 0.98;
      else if (ac.nac_p >= 5) confidence = 0.85;
      else if (ac.nac_p >= 1) confidence = 0.60;
      else confidence = 0.30; // NACp 0 = GPS denied
    }

    return {
      entityId: ac.hex.toLowerCase(),
      entityType: 'aircraft',
      displayName: callsign || ac.r || ac.hex.toUpperCase(),
      lat: ac.lat!,
      lon: ac.lon!,
      altitude: ac.alt_baro ?? ac.alt_geom ?? null,
      heading: ac.track ?? ac.nav_heading ?? null,
      speed: ac.gs ?? null,
      confidence,
      properties: {
        icao_hex: ac.hex,
        callsign: callsign || null,
        registration: ac.r || null,
        aircraft_type: ac.t || null,
        aircraft_desc: ac.desc || null,
        operator: ac.oper || ac.ownOp || null,
        squawk: ac.squawk || null,
        emergency: ac.emergency || null,
        category: ac.category || null,
        is_military: isMilitary,
        year_built: ac.year || null,
        alt_geom: ac.alt_geom || null,
        nac_p: ac.nac_p ?? null,
        nac_v: ac.nac_v ?? null,
        nic: ac.nic ?? null,
        sil: ac.sil ?? null,
        gva: ac.gva ?? null,
        sda: ac.sda ?? null,
        db_flags: ac.dbFlags || 0,
        seen: ac.seen ?? null,
        seen_pos: ac.seen_pos ?? null,
      },
      rawData: ac as any,
    };
  }
}
