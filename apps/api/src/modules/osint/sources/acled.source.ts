import { ConfigService } from '@nestjs/config';

export class AcledSource {
  private readonly apiKey?: string;
  private readonly email?: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = config.get('ACLED_API_KEY');
    this.email = config.get('ACLED_EMAIL');
  }

  async fetch(): Promise<any[]> {
    if (!this.apiKey || !this.email) return this.getMockData();

    const since = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const url = `https://api.acleddata.com/acled/read?key=${this.apiKey}&email=${this.email}&event_date=${since}&event_date_where=%3E%3D&limit=500`;
    const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new Error(`ACLED HTTP ${res.status}`);
    const data = await res.json() as any;

    return (data.data || []).map((ev: any) => ({
      entityType: 'event',
      entityId: `ACLED-${ev.data_id}`,
      displayName: `${ev.event_type}: ${ev.location}`,
      lat: parseFloat(ev.latitude),
      lon: parseFloat(ev.longitude),
      confidence: ev.geo_precision === 1 ? 0.95 : ev.geo_precision === 2 ? 0.75 : 0.5,
      properties: {
        event_date: ev.event_date,
        disorder_type: ev.disorder_type,
        event_type: ev.event_type,
        sub_event_type: ev.sub_event_type,
        country: ev.country,
        admin1: ev.admin1,
        admin2: ev.admin2,
        location: ev.location,
        source: ev.source,
        notes: ev.notes,
        fatalities: parseInt(ev.fatalities) || 0,
        actor1: ev.actor1,
        actor2: ev.actor2,
        inter1: ev.inter1,
        inter2: ev.inter2,
        interaction: ev.interaction,
      },
      rawData: ev,
    })).filter((e: any) => !isNaN(e.lat) && !isNaN(e.lon));
  }

  private getMockData(): any[] {
    const events = [
      {
        id: 'ACL-2024-001', eventDate: '2024-11-14', disorderType: 'Political violence',
        eventType: 'Battles', subEventType: 'Armed clash',
        country: 'Syria', admin1: 'Aleppo', location: 'Al-Bab',
        lat: 36.3712, lon: 37.5142, fatalities: 4,
        actor1: 'Syrian Democratic Forces', actor2: 'Turkish-backed Forces',
        notes: 'Armed clashes between SDF and TFSA elements near Al-Bab resulted in multiple casualties.',
      },
      {
        id: 'ACL-2024-002', eventDate: '2024-11-14', disorderType: 'Political violence',
        eventType: 'Violence against civilians', subEventType: 'Attack',
        country: 'Yemen', admin1: 'Hodeidah', location: 'Hodeidah Port',
        lat: 14.7980, lon: 42.9540, fatalities: 2,
        actor1: 'Houthi Movement', actor2: 'Civilians',
        notes: 'Shelling near Hodeidah port area resulted in civilian casualties and damage to port infrastructure.',
      },
      {
        id: 'ACL-2024-003', eventDate: '2024-11-13', disorderType: 'Political violence',
        eventType: 'Explosions/Remote violence', subEventType: 'Air/drone strike',
        country: 'Iraq', admin1: 'Ninawa', location: 'Tal Afar',
        lat: 36.3753, lon: 42.4497, fatalities: 0,
        actor1: 'Coalition Forces', actor2: 'IS',
        notes: 'Coalition airstrike targeting suspected IS hideout southwest of Tal Afar. No civilian casualties reported.',
      },
      {
        id: 'ACL-2024-004', eventDate: '2024-11-13', disorderType: 'Demonstrations',
        eventType: 'Protests', subEventType: 'Peaceful protest',
        country: 'Lebanon', admin1: 'Beirut', location: 'Martyrs Square',
        lat: 33.8938, lon: 35.5018, fatalities: 0,
        actor1: 'Protesters', actor2: '',
        notes: 'Large-scale peaceful demonstration in central Beirut demanding government accountability and economic reforms.',
      },
      {
        id: 'ACL-2024-005', eventDate: '2024-11-13', disorderType: 'Political violence',
        eventType: 'Battles', subEventType: 'Government regains territory',
        country: 'Somalia', admin1: 'Mudug', location: 'Galkayo',
        lat: 6.7694, lon: 47.4308, fatalities: 7,
        actor1: 'Somali National Army', actor2: 'Al-Shabaab',
        notes: 'SNA forces backed by AMISOM conducted clearing operation near Galkayo, retaking control of two villages.',
      },
      {
        id: 'ACL-2024-006', eventDate: '2024-11-12', disorderType: 'Political violence',
        eventType: 'Explosions/Remote violence', subEventType: 'Shelling/artillery/missile attack',
        country: 'Libya', admin1: 'Tripolitania', location: 'Misrata',
        lat: 32.3754, lon: 15.0925, fatalities: 1,
        actor1: 'LNA', actor2: 'GNA Forces',
        notes: 'Sporadic shelling reported in outskirts of Misrata targeting military positions.',
      },
      {
        id: 'ACL-2024-007', eventDate: '2024-11-12', disorderType: 'Political violence',
        eventType: 'Violence against civilians', subEventType: 'Abduction/forced disappearance',
        country: 'Sudan', admin1: 'North Darfur', location: 'El Fasher',
        lat: 13.6300, lon: 25.3500, fatalities: 0,
        actor1: 'RSF', actor2: 'Civilians',
        notes: 'Reports of forced disappearances targeting aid workers and journalists in El Fasher area.',
      },
      {
        id: 'ACL-2024-008', eventDate: '2024-11-12', disorderType: 'Political violence',
        eventType: 'Battles', subEventType: 'Armed clash',
        country: 'Ethiopia', admin1: 'Amhara', location: 'Gondar',
        lat: 12.6030, lon: 37.4521, fatalities: 11,
        actor1: 'Fano Militia', actor2: 'Ethiopian National Defense Force',
        notes: 'Intense clashes between Fano militia and ENDF forces north of Gondar city center.',
      },
      {
        id: 'ACL-2024-009', eventDate: '2024-11-11', disorderType: 'Political violence',
        eventType: 'Explosions/Remote violence', subEventType: 'Suicide bomb',
        country: 'Nigeria', admin1: 'Borno', location: 'Maiduguri',
        lat: 11.8311, lon: 13.1510, fatalities: 15,
        actor1: 'ISWAP', actor2: 'Civilians',
        notes: 'Suicide bombing at busy market area in Maiduguri. Multiple civilian casualties reported.',
      },
      {
        id: 'ACL-2024-010', eventDate: '2024-11-11', disorderType: 'Political violence',
        eventType: 'Battles', subEventType: 'Armed clash',
        country: 'DRC', admin1: 'North Kivu', location: 'Goma',
        lat: -1.6585, lon: 29.2206, fatalities: 3,
        actor1: 'M23', actor2: 'FARDC',
        notes: 'Exchange of fire between M23 rebels and FARDC forces near Goma outskirts.',
      },
      {
        id: 'ACL-2024-011', eventDate: '2024-11-11', disorderType: 'Political violence',
        eventType: 'Explosions/Remote violence', subEventType: 'Remote explosive/landmine/IED',
        country: 'Mali', admin1: 'Mopti', location: 'Douentza',
        lat: 15.0000, lon: -2.9500, fatalities: 5,
        actor1: 'JNIM', actor2: 'Malian Armed Forces',
        notes: 'IED detonation targeting military convoy on Douentza-Gao highway.',
      },
      {
        id: 'ACL-2024-012', eventDate: '2024-11-10', disorderType: 'Demonstrations',
        eventType: 'Riots', subEventType: 'Violent demonstration',
        country: 'Tunisia', admin1: 'Tunis', location: 'Tunis',
        lat: 36.8065, lon: 10.1815, fatalities: 0,
        actor1: 'Protesters', actor2: 'Police Forces',
        notes: 'Violent clashes erupted during anti-austerity protests in central Tunis.',
      },
      {
        id: 'ACL-2024-013', eventDate: '2024-11-10', disorderType: 'Political violence',
        eventType: 'Battles', subEventType: 'Armed clash',
        country: 'Mozambique', admin1: 'Cabo Delgado', location: 'Mocimboa da Praia',
        lat: -11.3481, lon: 40.3550, fatalities: 8,
        actor1: 'ASWJ', actor2: 'Mozambican Armed Forces',
        notes: 'Insurgent attack on military outpost near Mocimboa da Praia.',
      },
      {
        id: 'ACL-2024-014', eventDate: '2024-11-10', disorderType: 'Political violence',
        eventType: 'Strategic developments', subEventType: 'Arrests',
        country: 'Egypt', admin1: 'Cairo', location: 'Cairo',
        lat: 30.0444, lon: 31.2357, fatalities: 0,
        actor1: 'Egyptian Security Forces', actor2: 'Muslim Brotherhood',
        notes: 'Security forces arrested several suspected Muslim Brotherhood members in predawn raids across Cairo.',
      },
      {
        id: 'ACL-2024-015', eventDate: '2024-11-09', disorderType: 'Political violence',
        eventType: 'Explosions/Remote violence', subEventType: 'Air/drone strike',
        country: 'Pakistan', admin1: 'Khyber Pakhtunkhwa', location: 'North Waziristan',
        lat: 32.9176, lon: 70.1480, fatalities: 6,
        actor1: 'Pakistani Military', actor2: 'TTP',
        notes: 'Military conducted precision airstrikes against TTP positions in North Waziristan tribal district.',
      },
      {
        id: 'ACL-2024-016', eventDate: '2024-11-09', disorderType: 'Political violence',
        eventType: 'Violence against civilians', subEventType: 'Attack',
        country: 'Burkina Faso', admin1: 'Sahel', location: 'Djibo',
        lat: 14.1000, lon: -1.6300, fatalities: 12,
        actor1: 'JNIM', actor2: 'Civilians',
        notes: 'Armed militants attacked village near Djibo, targeting civilians and burning homes.',
      },
      {
        id: 'ACL-2024-017', eventDate: '2024-11-09', disorderType: 'Political violence',
        eventType: 'Battles', subEventType: 'Armed clash',
        country: 'Central African Republic', admin1: 'Haute-Kotto', location: 'Bria',
        lat: 6.5364, lon: 21.9876, fatalities: 3,
        actor1: 'CPC', actor2: 'FACA',
        notes: 'CPC coalition forces clashed with FACA and Russian-backed PMC outside Bria.',
      },
      {
        id: 'ACL-2024-018', eventDate: '2024-11-08', disorderType: 'Demonstrations',
        eventType: 'Protests', subEventType: 'Peaceful protest',
        country: 'Iran', admin1: 'Tehran', location: 'Tehran',
        lat: 35.6892, lon: 51.3890, fatalities: 0,
        actor1: 'Protesters', actor2: '',
        notes: 'Small-scale protests by labor unions demanding unpaid wages outside Ministry of Labor.',
      },
      {
        id: 'ACL-2024-019', eventDate: '2024-11-08', disorderType: 'Political violence',
        eventType: 'Explosions/Remote violence', subEventType: 'Air/drone strike',
        country: 'Afghanistan', admin1: 'Nangarhar', location: 'Jalalabad',
        lat: 34.4309, lon: 70.4514, fatalities: 9,
        actor1: 'IS-K', actor2: 'Taliban Forces',
        notes: 'Multiple explosions reported near Jalalabad targeting Taliban security checkpoints.',
      },
      {
        id: 'ACL-2024-020', eventDate: '2024-11-08', disorderType: 'Political violence',
        eventType: 'Battles', subEventType: 'Armed clash',
        country: 'Cameroon', admin1: 'Far North', location: 'Mora',
        lat: 11.0461, lon: 14.1494, fatalities: 2,
        actor1: 'Boko Haram', actor2: 'Cameroonian Military',
        notes: 'Boko Haram fighters ambushed military patrol near Mora, close to Nigerian border.',
      },
    ];

    return events.map((ev) => ({
      entityType: 'event',
      entityId: ev.id,
      displayName: `${ev.eventType}: ${ev.location}, ${ev.country}`,
      lat: ev.lat,
      lon: ev.lon,
      confidence: 0.85,
      properties: {
        event_date: ev.eventDate,
        disorder_type: ev.disorderType,
        event_type: ev.eventType,
        sub_event_type: ev.subEventType,
        country: ev.country,
        admin1: ev.admin1,
        location: ev.location,
        actor1: ev.actor1,
        actor2: ev.actor2,
        notes: ev.notes,
        fatalities: ev.fatalities,
        source: 'ACLED',
      },
    }));
  }
}
