import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';

export interface AlertFilters {
  status?: string;
  severity?: string;
  alertType?: string;
}

export interface AlertRuleData {
  name: string;
  rule_type: string;
  entity_filter?: Record<string, any>;
  trigger_condition: Record<string, any>;
  severity?: string;
  notification_channels?: string[];
  created_by?: string;
}

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async findAll(filters: AlertFilters = {}): Promise<any[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(filters.status);
    }

    if (filters.severity) {
      conditions.push(`severity = $${paramIndex++}`);
      params.push(filters.severity);
    }

    if (filters.alertType) {
      conditions.push(`alert_type = $${paramIndex++}`);
      params.push(filters.alertType);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT *
      FROM alerts
      ${whereClause}
      ORDER BY created_at DESC
    `;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async findById(id: string): Promise<any> {
    const result = await this.pool.query(
      'SELECT * FROM alerts WHERE id = $1',
      [id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Alert with id ${id} not found`);
    }

    return result.rows[0];
  }

  async create(data: {
    alert_type: string;
    severity: string;
    title: string;
    description?: string;
    entity_id?: string;
    lat?: number;
    lon?: number;
    properties?: Record<string, any>;
  }): Promise<any> {
    const result = await this.pool.query(
      `INSERT INTO alerts (alert_type, severity, title, description, entity_id, lat, lon, properties)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        data.alert_type,
        data.severity,
        data.title,
        data.description ?? null,
        data.entity_id ?? null,
        data.lat ?? null,
        data.lon ?? null,
        JSON.stringify(data.properties ?? {}),
      ],
    );

    return result.rows[0];
  }

  async acknowledge(id: string, userId: string): Promise<any> {
    const result = await this.pool.query(
      `UPDATE alerts
       SET status = 'ACKNOWLEDGED',
           acknowledged_by = $2,
           acknowledged_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, userId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Alert with id ${id} not found`);
    }

    return result.rows[0];
  }

  async escalate(id: string, userId: string): Promise<any> {
    const result = await this.pool.query(
      `UPDATE alerts
       SET status = 'ESCALATED',
           acknowledged_by = $2,
           acknowledged_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, userId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Alert with id ${id} not found`);
    }

    return result.rows[0];
  }

  async dismiss(id: string, userId: string, note: string): Promise<any> {
    const result = await this.pool.query(
      `UPDATE alerts
       SET status = 'DISMISSED',
           acknowledged_by = $2,
           acknowledged_at = NOW(),
           dismiss_note = $3
       WHERE id = $1
       RETURNING *`,
      [id, userId, note],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Alert with id ${id} not found`);
    }

    return result.rows[0];
  }

  // ── Alert Rules ────────────────────────────────────────────────

  async getRules(): Promise<any[]> {
    const result = await this.pool.query(
      'SELECT * FROM alert_rules ORDER BY created_at DESC',
    );
    return result.rows;
  }

  async createRule(data: AlertRuleData): Promise<any> {
    const result = await this.pool.query(
      `INSERT INTO alert_rules (name, rule_type, entity_filter, trigger_condition, severity, notification_channels, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.name,
        data.rule_type,
        JSON.stringify(data.entity_filter ?? {}),
        JSON.stringify(data.trigger_condition),
        data.severity ?? 'MEDIUM',
        data.notification_channels ?? ['inbox'],
        data.created_by ?? null,
      ],
    );

    return result.rows[0];
  }

  async updateRule(
    id: string,
    data: Partial<AlertRuleData>,
  ): Promise<any> {
    const result = await this.pool.query(
      `UPDATE alert_rules
       SET name = COALESCE($2, name),
           rule_type = COALESCE($3, rule_type),
           entity_filter = COALESCE($4, entity_filter),
           trigger_condition = COALESCE($5, trigger_condition),
           severity = COALESCE($6, severity),
           notification_channels = COALESCE($7, notification_channels)
       WHERE id = $1
       RETURNING *`,
      [
        id,
        data.name ?? null,
        data.rule_type ?? null,
        data.entity_filter ? JSON.stringify(data.entity_filter) : null,
        data.trigger_condition ? JSON.stringify(data.trigger_condition) : null,
        data.severity ?? null,
        data.notification_channels ?? null,
      ],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Alert rule with id ${id} not found`);
    }

    return result.rows[0];
  }

  async deleteRule(id: string): Promise<void> {
    const result = await this.pool.query(
      'DELETE FROM alert_rules WHERE id = $1',
      [id],
    );

    if (result.rowCount === 0) {
      throw new NotFoundException(`Alert rule with id ${id} not found`);
    }
  }

  async toggleRule(id: string, enabled: boolean): Promise<any> {
    const result = await this.pool.query(
      `UPDATE alert_rules
       SET enabled = $2
       WHERE id = $1
       RETURNING *`,
      [id, enabled],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Alert rule with id ${id} not found`);
    }

    return result.rows[0];
  }

  // ── Rule Evaluation ────────────────────────────────────────────

  async evaluateRules(
    entity: { entity_id: string; entity_type: string; properties?: Record<string, any> },
    position?: { lat: number; lon: number },
  ): Promise<any[]> {
    const rulesResult = await this.pool.query(
      'SELECT * FROM alert_rules WHERE enabled = TRUE',
    );
    const rules = rulesResult.rows;
    const triggeredAlerts: any[] = [];

    for (const rule of rules) {
      // Apply entity filter: skip if rule targets specific entity types and this doesn't match
      const entityFilter = rule.entity_filter ?? {};
      if (
        entityFilter.entity_type &&
        entityFilter.entity_type !== entity.entity_type
      ) {
        continue;
      }

      let triggered = false;
      const condition = rule.trigger_condition;

      switch (rule.rule_type) {
        case 'geofence': {
          if (!position) break;
          // Check if entity position is within the geofence radius (meters)
          const { lat, lon, radius_m } = condition;
          if (lat == null || lon == null || radius_m == null) break;

          const distResult = await this.pool.query(
            `SELECT ST_DWithin(
              ST_SetSRID(ST_Point($1, $2), 4326)::geography,
              ST_SetSRID(ST_Point($3, $4), 4326)::geography,
              $5
            ) AS within`,
            [position.lon, position.lat, lon, lat, radius_m],
          );
          triggered = distResult.rows[0]?.within === true;
          break;
        }

        case 'attribute': {
          // Check if entity properties match the expected attribute value
          const { property, operator, value } = condition;
          if (!property || !entity.properties) break;

          const actualValue = entity.properties[property];
          switch (operator) {
            case 'eq':
              triggered = actualValue === value;
              break;
            case 'neq':
              triggered = actualValue !== value;
              break;
            case 'gt':
              triggered = actualValue > value;
              break;
            case 'lt':
              triggered = actualValue < value;
              break;
            case 'contains':
              triggered =
                typeof actualValue === 'string' &&
                actualValue.includes(value);
              break;
            case 'exists':
              triggered = actualValue !== undefined && actualValue !== null;
              break;
            default:
              triggered = actualValue === value;
          }
          break;
        }

        case 'proximity': {
          if (!position) break;
          // Check if any other entity is within the specified radius
          const { radius_m: proxRadius } = condition;
          if (proxRadius == null) break;

          const nearbyResult = await this.pool.query(
            `SELECT COUNT(*) AS nearby_count
             FROM entity_positions
             WHERE entity_id != $1
               AND time > NOW() - INTERVAL '1 hour'
               AND ST_DWithin(
                 ST_SetSRID(ST_Point(lon, lat), 4326)::geography,
                 ST_SetSRID(ST_Point($2, $3), 4326)::geography,
                 $4
               )`,
            [entity.entity_id, position.lon, position.lat, proxRadius],
          );
          triggered = parseInt(nearbyResult.rows[0]?.nearby_count, 10) > 0;
          break;
        }

        default:
          this.logger.warn(`Unknown rule type: ${rule.rule_type}`);
      }

      if (triggered) {
        // Create alert for the triggered rule
        const alert = await this.create({
          alert_type: rule.rule_type,
          severity: rule.severity,
          title: `Rule triggered: ${rule.name}`,
          description: `Rule "${rule.name}" triggered for entity ${entity.entity_id}`,
          entity_id: entity.entity_id,
          lat: position?.lat,
          lon: position?.lon,
          properties: { rule_id: rule.id, trigger_condition: rule.trigger_condition },
        });

        // Update rule's last_fired and fire_count
        await this.pool.query(
          `UPDATE alert_rules
           SET last_fired = NOW(),
               fire_count = fire_count + 1
           WHERE id = $1`,
          [rule.id],
        );

        triggeredAlerts.push(alert);
      }
    }

    return triggeredAlerts;
  }
}
