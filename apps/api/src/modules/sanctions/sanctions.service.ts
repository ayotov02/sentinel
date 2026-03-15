import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';

export interface ScreenEntityRequest {
  name: string;
  entityType: string;
  properties?: Record<string, any>;
}

export interface SanctionsMatch {
  id: string;
  caption: string;
  schema: string;
  score: number;
  features: Record<string, any>;
  properties: Record<string, any>;
  datasets: string[];
  referents: string[];
}

export interface ScreenResult {
  query: ScreenEntityRequest;
  total: number;
  matches: SanctionsMatch[];
  screenedAt: string;
}

export interface SearchResult {
  query: string;
  total: number;
  results: SanctionsMatch[];
}

export interface BulkImportResult {
  source: string;
  inserted: number;
  updated: number;
  errors: number;
  duration_ms: number;
}

export interface SanctionsStats {
  total: number;
  bySource: Record<string, number>;
  byEntityType: Record<string, number>;
  lastUpdated: string | null;
}

@Injectable()
export class SanctionsService {
  private readonly logger = new Logger(SanctionsService.name);

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly config: ConfigService,
  ) {}

  // ── OpenSanctions Match Endpoint ─────────────────────────────

  /**
   * Screen an entity against OpenSanctions using the /match/default POST endpoint.
   * Performs fuzzy matching across all consolidated sanctions lists.
   */
  async screenEntity(
    name: string,
    entityType: string,
    properties?: Record<string, any>,
  ): Promise<ScreenResult> {
    const apiKey = this.config.get<string>('OPENSANCTIONS_API_KEY');
    if (!apiKey) {
      throw new Error('OPENSANCTIONS_API_KEY is not configured');
    }

    const apiUrl = this.config.get<string>(
      'OPENSANCTIONS_API_URL',
      'https://api.opensanctions.org',
    );

    // Map entityType to OpenSanctions schema types
    const schemaMap: Record<string, string> = {
      person: 'Person',
      organization: 'Organization',
      company: 'Company',
      vessel: 'Vessel',
      aircraft: 'Airplane',
    };

    const schema = schemaMap[entityType.toLowerCase()] || 'LegalEntity';

    // Build the query properties for matching
    const queryProperties: Record<string, string[]> = {
      name: [name],
    };

    // Map additional properties to OpenSanctions property names
    if (properties) {
      if (properties.birthDate) {
        queryProperties.birthDate = [properties.birthDate];
      }
      if (properties.nationality) {
        queryProperties.nationality = [properties.nationality];
      }
      if (properties.country) {
        queryProperties.country = [properties.country];
      }
      if (properties.idNumber) {
        queryProperties.idNumber = [properties.idNumber];
      }
      if (properties.registrationNumber) {
        queryProperties.registrationNumber = [properties.registrationNumber];
      }
      if (properties.address) {
        queryProperties.address = [properties.address];
      }
      if (properties.imoNumber) {
        queryProperties.imoNumber = [properties.imoNumber];
      }
      if (properties.mmsi) {
        queryProperties.mmsi = [properties.mmsi];
      }
      if (properties.flag) {
        queryProperties.flag = [properties.flag];
      }
      if (properties.aliases && Array.isArray(properties.aliases)) {
        queryProperties.alias = properties.aliases;
      }
    }

    const payload = {
      queries: {
        screening: {
          schema,
          properties: queryProperties,
        },
      },
    };

    this.logger.log(
      `Screening entity: "${name}" (${entityType}) against OpenSanctions`,
    );

    const response = await fetch(`${apiUrl}/match/default`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `ApiKey ${apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `OpenSanctions match API error: HTTP ${response.status} — ${errorBody}`,
      );
    }

    const data = await response.json();
    const screeningResponse = data.responses?.screening;

    const matches: SanctionsMatch[] = (screeningResponse?.results || []).map(
      (r: any) => ({
        id: r.id,
        caption: r.caption,
        schema: r.schema,
        score: r.score,
        features: r.features || {},
        properties: r.properties || {},
        datasets: r.datasets || [],
        referents: r.referents || [],
      }),
    );

    return {
      query: { name, entityType, properties },
      total: screeningResponse?.total || 0,
      matches,
      screenedAt: new Date().toISOString(),
    };
  }

  // ── OpenSanctions Search Endpoint ────────────────────────────

  /**
   * Full-text search via OpenSanctions /search/default endpoint.
   */
  async searchSanctions(query: string): Promise<SearchResult> {
    const apiKey = this.config.get<string>('OPENSANCTIONS_API_KEY');
    if (!apiKey) {
      throw new Error('OPENSANCTIONS_API_KEY is not configured');
    }

    const apiUrl = this.config.get<string>(
      'OPENSANCTIONS_API_URL',
      'https://api.opensanctions.org',
    );

    const encodedQuery = encodeURIComponent(query);

    this.logger.log(
      `Searching OpenSanctions for: "${query}"`,
    );

    const response = await fetch(
      `${apiUrl}/search/default?q=${encodedQuery}&limit=50`,
      {
        method: 'GET',
        headers: {
          Authorization: `ApiKey ${apiKey}`,
        },
        signal: AbortSignal.timeout(30000),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `OpenSanctions search API error: HTTP ${response.status} — ${errorBody}`,
      );
    }

    const data = await response.json();

    const results: SanctionsMatch[] = (data.results || []).map((r: any) => ({
      id: r.id,
      caption: r.caption,
      schema: r.schema,
      score: r.score,
      features: r.features || {},
      properties: r.properties || {},
      datasets: r.datasets || [],
      referents: r.referents || [],
    }));

    return {
      query,
      total: data.total || 0,
      results,
    };
  }

  // ── OFAC SDN XML Bulk Import ─────────────────────────────────

  /**
   * Download the OFAC SDN XML from US Treasury, parse all entries,
   * and upsert them into the sanctions_entries table.
   */
  async bulkImportOFAC(): Promise<BulkImportResult> {
    const startTime = Date.now();
    let inserted = 0;
    let updated = 0;
    let errors = 0;

    const sdnUrl = 'https://www.treasury.gov/ofac/downloads/sdn.xml';

    this.logger.log('Starting OFAC SDN XML download...');

    const response = await fetch(sdnUrl, {
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      throw new Error(`OFAC SDN download failed: HTTP ${response.status}`);
    }

    const xmlText = await response.text();
    this.logger.log(`OFAC SDN XML downloaded: ${xmlText.length} bytes`);

    // Parse SDN XML — the format uses <sdnEntry> elements
    const entries = this.parseOfacSdnXml(xmlText);
    this.logger.log(`Parsed ${entries.length} OFAC SDN entries`);

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      for (const entry of entries) {
        try {
          const result = await client.query(
            `INSERT INTO sanctions_entries (source, source_id, entity_type, name, aliases, nationality, properties, list_type, listed_date, last_updated)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
             ON CONFLICT (source, source_id) DO UPDATE SET
               name = EXCLUDED.name,
               aliases = EXCLUDED.aliases,
               nationality = EXCLUDED.nationality,
               properties = EXCLUDED.properties,
               list_type = EXCLUDED.list_type,
               listed_date = EXCLUDED.listed_date,
               last_updated = NOW()
             RETURNING (xmax = 0) AS is_insert`,
            [
              'OFAC',
              entry.sourceId,
              entry.entityType,
              entry.name,
              entry.aliases,
              entry.nationality,
              JSON.stringify(entry.properties),
              'SDN',
              entry.listedDate,
            ],
          );

          if (result.rows[0]?.is_insert) {
            inserted++;
          } else {
            updated++;
          }
        } catch (err) {
          errors++;
          this.logger.warn(
            `Failed to upsert OFAC entry ${entry.sourceId}: ${err}`,
          );
        }
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    const duration = Date.now() - startTime;
    this.logger.log(
      `OFAC import complete: ${inserted} inserted, ${updated} updated, ${errors} errors in ${duration}ms`,
    );

    return {
      source: 'OFAC',
      inserted,
      updated,
      errors,
      duration_ms: duration,
    };
  }

  // ── UN Consolidated Sanctions XML Bulk Import ────────────────

  /**
   * Download the UN Security Council consolidated sanctions XML,
   * parse all individuals and entities, and upsert into sanctions_entries.
   */
  async bulkImportUN(): Promise<BulkImportResult> {
    const startTime = Date.now();
    let inserted = 0;
    let updated = 0;
    let errors = 0;

    const unUrl =
      'https://scsanctions.un.org/resources/xml/en/consolidated.xml';

    this.logger.log('Starting UN consolidated sanctions XML download...');

    const response = await fetch(unUrl, {
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      throw new Error(`UN sanctions download failed: HTTP ${response.status}`);
    }

    const xmlText = await response.text();
    this.logger.log(`UN sanctions XML downloaded: ${xmlText.length} bytes`);

    const entries = this.parseUnConsolidatedXml(xmlText);
    this.logger.log(`Parsed ${entries.length} UN sanctions entries`);

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      for (const entry of entries) {
        try {
          const result = await client.query(
            `INSERT INTO sanctions_entries (source, source_id, entity_type, name, aliases, nationality, properties, list_type, listed_date, last_updated)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
             ON CONFLICT (source, source_id) DO UPDATE SET
               name = EXCLUDED.name,
               aliases = EXCLUDED.aliases,
               nationality = EXCLUDED.nationality,
               properties = EXCLUDED.properties,
               list_type = EXCLUDED.list_type,
               listed_date = EXCLUDED.listed_date,
               last_updated = NOW()
             RETURNING (xmax = 0) AS is_insert`,
            [
              'UN',
              entry.sourceId,
              entry.entityType,
              entry.name,
              entry.aliases,
              entry.nationality,
              JSON.stringify(entry.properties),
              entry.listType,
              entry.listedDate,
            ],
          );

          if (result.rows[0]?.is_insert) {
            inserted++;
          } else {
            updated++;
          }
        } catch (err) {
          errors++;
          this.logger.warn(
            `Failed to upsert UN entry ${entry.sourceId}: ${err}`,
          );
        }
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    const duration = Date.now() - startTime;
    this.logger.log(
      `UN import complete: ${inserted} inserted, ${updated} updated, ${errors} errors in ${duration}ms`,
    );

    return {
      source: 'UN',
      inserted,
      updated,
      errors,
      duration_ms: duration,
    };
  }

  // ── Stats ────────────────────────────────────────────────────

  /**
   * Return aggregate counts of sanctions entries per source and entity type.
   */
  async getStats(): Promise<SanctionsStats> {
    const totalResult = await this.pool.query(
      'SELECT COUNT(*)::int AS total FROM sanctions_entries',
    );

    const bySourceResult = await this.pool.query(
      'SELECT source, COUNT(*)::int AS count FROM sanctions_entries GROUP BY source ORDER BY count DESC',
    );

    const byTypeResult = await this.pool.query(
      'SELECT entity_type, COUNT(*)::int AS count FROM sanctions_entries GROUP BY entity_type ORDER BY count DESC',
    );

    const lastUpdatedResult = await this.pool.query(
      'SELECT MAX(last_updated) AS last_updated FROM sanctions_entries',
    );

    const bySource: Record<string, number> = {};
    for (const row of bySourceResult.rows) {
      bySource[row.source] = row.count;
    }

    const byEntityType: Record<string, number> = {};
    for (const row of byTypeResult.rows) {
      byEntityType[row.entity_type] = row.count;
    }

    return {
      total: totalResult.rows[0]?.total || 0,
      bySource,
      byEntityType,
      lastUpdated: lastUpdatedResult.rows[0]?.last_updated || null,
    };
  }

  // ── Ingest-time Screening ────────────────────────────────────

  /**
   * Automatically screen a newly ingested entity against sanctions lists.
   * If a high-confidence match is found, creates an alert in the alerts table.
   */
  async checkEntityOnIngest(
    entityId: string,
    displayName: string,
    entityType: string,
  ): Promise<{ matched: boolean; matchCount: number; alertId?: string }> {
    this.logger.log(
      `Auto-screening entity on ingest: "${displayName}" (${entityId})`,
    );

    // First: check local sanctions_entries via trigram fuzzy match
    const localResult = await this.pool.query(
      `SELECT id, source, source_id, name, entity_type, aliases,
              similarity(name, $1) AS sim
       FROM sanctions_entries
       WHERE name % $1
       ORDER BY sim DESC
       LIMIT 10`,
      [displayName],
    );

    let matched = false;
    let matchCount = localResult.rows.length;
    let alertId: string | undefined;

    // If local matches found with high similarity, create an alert immediately
    if (localResult.rows.length > 0 && localResult.rows[0].sim >= 0.5) {
      matched = true;
      const topMatch = localResult.rows[0];

      const alertResult = await this.pool.query(
        `INSERT INTO alerts (alert_type, severity, title, description, entity_id, properties)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [
          'sanctions_match',
          topMatch.sim >= 0.85 ? 'CRITICAL' : topMatch.sim >= 0.7 ? 'HIGH' : 'MEDIUM',
          `Sanctions match: ${displayName}`,
          `Entity "${displayName}" (${entityId}) matched sanctions entry "${topMatch.name}" from ${topMatch.source} list with ${(topMatch.sim * 100).toFixed(1)}% similarity.`,
          entityId,
          JSON.stringify({
            sanctions_source: topMatch.source,
            sanctions_source_id: topMatch.source_id,
            sanctions_name: topMatch.name,
            similarity: topMatch.sim,
            entity_type: topMatch.entity_type,
            local_match_count: localResult.rows.length,
            local_matches: localResult.rows.slice(0, 5).map((r: any) => ({
              source: r.source,
              name: r.name,
              similarity: r.sim,
            })),
          }),
        ],
      );

      alertId = alertResult.rows[0].id;
      this.logger.warn(
        `Sanctions alert created for "${displayName}": matched "${topMatch.name}" (${topMatch.source}) with ${(topMatch.sim * 100).toFixed(1)}% similarity`,
      );
    }

    // Also screen against OpenSanctions API if configured (non-blocking enrichment)
    const apiKey = this.config.get<string>('OPENSANCTIONS_API_KEY');
    if (apiKey) {
      try {
        const screenResult = await this.screenEntity(
          displayName,
          entityType,
        );

        if (screenResult.matches.length > 0) {
          matchCount += screenResult.matches.length;

          const topApiMatch = screenResult.matches[0];

          // If we haven't already created an alert from local match, create one from API match
          if (!matched && topApiMatch.score >= 0.5) {
            matched = true;

            const alertResult = await this.pool.query(
              `INSERT INTO alerts (alert_type, severity, title, description, entity_id, properties)
               VALUES ($1, $2, $3, $4, $5, $6)
               RETURNING id`,
              [
                'sanctions_match',
                topApiMatch.score >= 0.85 ? 'CRITICAL' : topApiMatch.score >= 0.7 ? 'HIGH' : 'MEDIUM',
                `Sanctions match: ${displayName}`,
                `Entity "${displayName}" (${entityId}) matched OpenSanctions entry "${topApiMatch.caption}" with ${(topApiMatch.score * 100).toFixed(1)}% confidence. Datasets: ${topApiMatch.datasets.join(', ')}.`,
                entityId,
                JSON.stringify({
                  opensanctions_id: topApiMatch.id,
                  opensanctions_caption: topApiMatch.caption,
                  opensanctions_score: topApiMatch.score,
                  opensanctions_datasets: topApiMatch.datasets,
                  opensanctions_schema: topApiMatch.schema,
                  api_match_count: screenResult.matches.length,
                }),
              ],
            );

            alertId = alertResult.rows[0].id;
            this.logger.warn(
              `OpenSanctions alert created for "${displayName}": matched "${topApiMatch.caption}" with ${(topApiMatch.score * 100).toFixed(1)}% score`,
            );
          } else if (matched && alertId) {
            // Enrich existing alert with OpenSanctions API data
            await this.pool.query(
              `UPDATE alerts
               SET properties = properties || $2::jsonb
               WHERE id = $1`,
              [
                alertId,
                JSON.stringify({
                  opensanctions_id: topApiMatch.id,
                  opensanctions_caption: topApiMatch.caption,
                  opensanctions_score: topApiMatch.score,
                  opensanctions_datasets: topApiMatch.datasets,
                  api_match_count: screenResult.matches.length,
                }),
              ],
            );
          }
        }
      } catch (err) {
        this.logger.error(
          `OpenSanctions API screening failed for "${displayName}": ${err}`,
        );
        // Non-fatal — local screening results still stand
      }
    }

    return { matched, matchCount, alertId };
  }

  // ── XML Parsers ──────────────────────────────────────────────

  /**
   * Parse OFAC SDN XML into structured entries.
   * OFAC SDN XML uses <sdnEntry> elements under <sdnList>.
   */
  private parseOfacSdnXml(xml: string): Array<{
    sourceId: string;
    entityType: string;
    name: string;
    aliases: string[];
    nationality: string | null;
    properties: Record<string, any>;
    listedDate: string | null;
  }> {
    const entries: Array<{
      sourceId: string;
      entityType: string;
      name: string;
      aliases: string[];
      nationality: string | null;
      properties: Record<string, any>;
      listedDate: string | null;
    }> = [];

    // Extract <sdnEntry>...</sdnEntry> blocks
    const entryRegex = /<sdnEntry>([\s\S]*?)<\/sdnEntry>/gi;
    let entryMatch: RegExpExecArray | null;

    while ((entryMatch = entryRegex.exec(xml)) !== null) {
      const block = entryMatch[1];

      const uid = this.extractXmlTag(block, 'uid');
      if (!uid) continue;

      const sdnType = this.extractXmlTag(block, 'sdnType');
      const firstName = this.extractXmlTag(block, 'firstName') || '';
      const lastName = this.extractXmlTag(block, 'lastName') || '';
      const title = this.extractXmlTag(block, 'title');
      const remarks = this.extractXmlTag(block, 'remarks');

      const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
      if (!fullName) continue;

      // Determine entity type
      let entityType = 'unknown';
      if (sdnType) {
        const t = sdnType.toLowerCase();
        if (t === 'individual') entityType = 'person';
        else if (t === 'entity') entityType = 'organization';
        else if (t === 'vessel') entityType = 'vessel';
        else if (t === 'aircraft') entityType = 'aircraft';
        else entityType = t;
      }

      // Extract aliases from <aka> blocks
      const aliases: string[] = [];
      const akaRegex = /<aka>([\s\S]*?)<\/aka>/gi;
      let akaMatch: RegExpExecArray | null;
      while ((akaMatch = akaRegex.exec(block)) !== null) {
        const akaBlock = akaMatch[1];
        const akaFirst = this.extractXmlTag(akaBlock, 'firstName') || '';
        const akaLast = this.extractXmlTag(akaBlock, 'lastName') || '';
        const akaName = [akaFirst, akaLast].filter(Boolean).join(' ').trim();
        if (akaName && akaName !== fullName) {
          aliases.push(akaName);
        }
      }

      // Extract nationality from <nationality> blocks
      let nationality: string | null = null;
      const nationalityMatch = /<nationality>([\s\S]*?)<\/nationality>/i.exec(block);
      if (nationalityMatch) {
        nationality =
          this.extractXmlTag(nationalityMatch[1], 'country') ||
          nationalityMatch[1].trim();
      }

      // Extract address info
      const addresses: string[] = [];
      const addressRegex = /<address>([\s\S]*?)<\/address>/gi;
      let addrMatch: RegExpExecArray | null;
      while ((addrMatch = addressRegex.exec(block)) !== null) {
        const addrBlock = addrMatch[1];
        const city = this.extractXmlTag(addrBlock, 'city');
        const country = this.extractXmlTag(addrBlock, 'country');
        const parts = [city, country].filter(Boolean);
        if (parts.length > 0) addresses.push(parts.join(', '));
      }

      // Extract ID numbers
      const ids: Array<{ type: string; number: string; country?: string }> = [];
      const idRegex = /<id>([\s\S]*?)<\/id>/gi;
      let idMatch: RegExpExecArray | null;
      while ((idMatch = idRegex.exec(block)) !== null) {
        const idBlock = idMatch[1];
        const idType = this.extractXmlTag(idBlock, 'idType');
        const idNumber = this.extractXmlTag(idBlock, 'idNumber');
        const idCountry = this.extractXmlTag(idBlock, 'idCountry');
        if (idType && idNumber) {
          ids.push({
            type: idType,
            number: idNumber,
            country: idCountry || undefined,
          });
        }
      }

      // Extract date of birth from <dateOfBirthItem>
      let dateOfBirth: string | null = null;
      const dobMatch = /<dateOfBirthItem>([\s\S]*?)<\/dateOfBirthItem>/i.exec(block);
      if (dobMatch) {
        dateOfBirth = this.extractXmlTag(dobMatch[1], 'dateOfBirth');
      }

      // Extract program list
      const programs: string[] = [];
      const programRegex = /<program>([\s\S]*?)<\/program>/gi;
      let progMatch: RegExpExecArray | null;
      while ((progMatch = programRegex.exec(block)) !== null) {
        const prog = progMatch[1].trim();
        if (prog) programs.push(prog);
      }

      entries.push({
        sourceId: uid,
        entityType,
        name: fullName,
        aliases,
        nationality,
        properties: {
          title: title || undefined,
          remarks: remarks || undefined,
          addresses: addresses.length > 0 ? addresses : undefined,
          identifications: ids.length > 0 ? ids : undefined,
          date_of_birth: dateOfBirth || undefined,
          programs: programs.length > 0 ? programs : undefined,
          sdn_type: sdnType || undefined,
        },
        listedDate: null, // SDN XML doesn't include listing date per entry
      });
    }

    return entries;
  }

  /**
   * Parse UN Security Council consolidated sanctions XML.
   * The UN XML uses <INDIVIDUAL> and <ENTITY> elements under <CONSOLIDATED_LIST>.
   */
  private parseUnConsolidatedXml(xml: string): Array<{
    sourceId: string;
    entityType: string;
    name: string;
    aliases: string[];
    nationality: string | null;
    properties: Record<string, any>;
    listType: string;
    listedDate: string | null;
  }> {
    const entries: Array<{
      sourceId: string;
      entityType: string;
      name: string;
      aliases: string[];
      nationality: string | null;
      properties: Record<string, any>;
      listType: string;
      listedDate: string | null;
    }> = [];

    // Parse individuals
    const individualRegex = /<INDIVIDUAL>([\s\S]*?)<\/INDIVIDUAL>/gi;
    let match: RegExpExecArray | null;

    while ((match = individualRegex.exec(xml)) !== null) {
      const block = match[1];
      const parsed = this.parseUnEntry(block, 'person');
      if (parsed) entries.push(parsed);
    }

    // Parse entities
    const entityRegex = /<ENTITY>([\s\S]*?)<\/ENTITY>/gi;

    while ((match = entityRegex.exec(xml)) !== null) {
      const block = match[1];
      const parsed = this.parseUnEntry(block, 'organization');
      if (parsed) entries.push(parsed);
    }

    return entries;
  }

  private parseUnEntry(
    block: string,
    entityType: string,
  ): {
    sourceId: string;
    entityType: string;
    name: string;
    aliases: string[];
    nationality: string | null;
    properties: Record<string, any>;
    listType: string;
    listedDate: string | null;
  } | null {
    const dataid = this.extractXmlTag(block, 'DATAID');
    if (!dataid) return null;

    // Build name from parts
    const firstName = this.extractXmlTag(block, 'FIRST_NAME') || '';
    const secondName = this.extractXmlTag(block, 'SECOND_NAME') || '';
    const thirdName = this.extractXmlTag(block, 'THIRD_NAME') || '';
    const fourthName = this.extractXmlTag(block, 'FOURTH_NAME') || '';

    let name = [firstName, secondName, thirdName, fourthName]
      .filter(Boolean)
      .join(' ')
      .trim();

    // For entities, use the FIRST_NAME field which contains the full name
    if (!name) {
      name = this.extractXmlTag(block, 'NAME_ORIGINAL_SCRIPT') || '';
    }
    if (!name) return null;

    // Extract aliases
    const aliases: string[] = [];
    const aliasRegex = /<INDIVIDUAL_ALIAS>([\s\S]*?)<\/INDIVIDUAL_ALIAS>/gi;
    let aliasMatch: RegExpExecArray | null;
    while ((aliasMatch = aliasRegex.exec(block)) !== null) {
      const aliasName = this.extractXmlTag(aliasMatch[1], 'ALIAS_NAME');
      if (aliasName && aliasName !== name) {
        aliases.push(aliasName);
      }
    }

    // Also check ENTITY_ALIAS
    const entityAliasRegex = /<ENTITY_ALIAS>([\s\S]*?)<\/ENTITY_ALIAS>/gi;
    while ((aliasMatch = entityAliasRegex.exec(block)) !== null) {
      const aliasName = this.extractXmlTag(aliasMatch[1], 'ALIAS_NAME');
      if (aliasName && aliasName !== name) {
        aliases.push(aliasName);
      }
    }

    // Nationality
    const nationalityBlock = /<NATIONALITY>([\s\S]*?)<\/NATIONALITY>/i.exec(block);
    const nationality = nationalityBlock
      ? this.extractXmlTag(nationalityBlock[1], 'VALUE') || null
      : null;

    // Listed date
    const listedDate = this.extractXmlTag(block, 'LISTED_ON') || null;

    // UN list reference
    const unListType = this.extractXmlTag(block, 'UN_LIST_TYPE') || 'UN';
    const referenceNumber = this.extractXmlTag(block, 'REFERENCE_NUMBER');

    // Comments / designation
    const comments = this.extractXmlTag(block, 'COMMENTS1');

    // Date of birth
    const dobBlock = /<INDIVIDUAL_DATE_OF_BIRTH>([\s\S]*?)<\/INDIVIDUAL_DATE_OF_BIRTH>/i.exec(block);
    const dateOfBirth = dobBlock
      ? this.extractXmlTag(dobBlock[1], 'DATE') ||
        this.extractXmlTag(dobBlock[1], 'YEAR')
      : null;

    // Place of birth
    const pobBlock = /<INDIVIDUAL_PLACE_OF_BIRTH>([\s\S]*?)<\/INDIVIDUAL_PLACE_OF_BIRTH>/i.exec(block);
    const placeOfBirth = pobBlock
      ? [
          this.extractXmlTag(pobBlock[1], 'CITY'),
          this.extractXmlTag(pobBlock[1], 'STATE_PROVINCE'),
          this.extractXmlTag(pobBlock[1], 'COUNTRY'),
        ]
          .filter(Boolean)
          .join(', ')
      : null;

    // Addresses
    const addresses: string[] = [];
    const addrRegex = /<INDIVIDUAL_ADDRESS>([\s\S]*?)<\/INDIVIDUAL_ADDRESS>/gi;
    let addrMatch: RegExpExecArray | null;
    while ((addrMatch = addrRegex.exec(block)) !== null) {
      const parts = [
        this.extractXmlTag(addrMatch[1], 'STREET'),
        this.extractXmlTag(addrMatch[1], 'CITY'),
        this.extractXmlTag(addrMatch[1], 'COUNTRY'),
      ].filter(Boolean);
      if (parts.length > 0) addresses.push(parts.join(', '));
    }

    // Also check ENTITY_ADDRESS
    const entityAddrRegex = /<ENTITY_ADDRESS>([\s\S]*?)<\/ENTITY_ADDRESS>/gi;
    while ((addrMatch = entityAddrRegex.exec(block)) !== null) {
      const parts = [
        this.extractXmlTag(addrMatch[1], 'STREET'),
        this.extractXmlTag(addrMatch[1], 'CITY'),
        this.extractXmlTag(addrMatch[1], 'COUNTRY'),
      ].filter(Boolean);
      if (parts.length > 0) addresses.push(parts.join(', '));
    }

    return {
      sourceId: dataid,
      entityType,
      name,
      aliases,
      nationality,
      properties: {
        reference_number: referenceNumber || undefined,
        comments: comments || undefined,
        date_of_birth: dateOfBirth || undefined,
        place_of_birth: placeOfBirth || undefined,
        addresses: addresses.length > 0 ? addresses : undefined,
      },
      listType: unListType,
      listedDate,
    };
  }

  /**
   * Extract text content of an XML tag. Returns null if not found.
   */
  private extractXmlTag(xml: string, tagName: string): string | null {
    const regex = new RegExp(
      `<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`,
      'i',
    );
    const match = regex.exec(xml);
    if (!match) return null;

    const value = match[1]
      .trim()
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");

    return value || null;
  }
}
