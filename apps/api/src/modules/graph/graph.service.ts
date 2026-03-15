import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import neo4j, { Driver, Session } from 'neo4j-driver';

@Injectable()
export class GraphService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GraphService.name);
  private driver: Driver;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const host = this.config.get<string>('MEMGRAPH_HOST', 'localhost');
    const port = this.config.get<number>('MEMGRAPH_PORT', 7687);
    const user = this.config.get<string>('MEMGRAPH_USER', 'sentinel');
    const password = this.config.get<string>(
      'MEMGRAPH_PASSWORD',
      'sentinel_dev',
    );

    this.driver = neo4j.driver(
      `bolt://${host}:${port}`,
      neo4j.auth.basic(user, password),
    );

    this.logger.log(`Connected to Memgraph at bolt://${host}:${port}`);
  }

  async onModuleDestroy() {
    if (this.driver) {
      await this.driver.close();
      this.logger.log('Memgraph driver closed');
    }
  }

  private getSession(): Session {
    return this.driver.session();
  }

  async upsertNode(
    label: string,
    properties: Record<string, any>,
  ): Promise<any> {
    const session = this.getSession();
    try {
      const entityId = properties.entity_id;
      const props = { ...properties };
      delete props.entity_id;

      // Memgraph does not support parameterized labels in MERGE,
      // so we interpolate the label directly. Labels come from our
      // controlled enum, never from user input.
      const result = await session.run(
        `MERGE (n:Entity {entity_id: $entityId})
         SET n:${label}, n += $props
         RETURN n`,
        { entityId, props },
      );

      return result.records.map((r) => r.get('n').properties);
    } finally {
      await session.close();
    }
  }

  async createRelationship(
    sourceId: string,
    targetId: string,
    type: string,
    properties?: Record<string, any>,
  ): Promise<any> {
    const session = this.getSession();
    try {
      // Relationship types also cannot be parameterized in Cypher.
      // The type value comes from our controlled set.
      const result = await session.run(
        `MATCH (a {entity_id: $src}), (b {entity_id: $tgt})
         MERGE (a)-[r:${type}]->(b)
         SET r += $props
         RETURN r`,
        {
          src: sourceId,
          tgt: targetId,
          props: properties ?? {},
        },
      );

      return result.records.map((r) => r.get('r').properties);
    } finally {
      await session.close();
    }
  }

  async getNeighbors(entityId: string, depth = 1): Promise<any> {
    const session = this.getSession();
    try {
      const result = await session.run(
        `MATCH (n {entity_id: $id})-[r*1..${depth}]-(m)
         RETURN n, r, m`,
        { id: entityId },
      );

      const nodes = new Map<string, any>();
      const edges: any[] = [];

      for (const record of result.records) {
        const n = record.get('n');
        const m = record.get('m');
        const rels = record.get('r');

        nodes.set(n.properties.entity_id, n.properties);
        nodes.set(m.properties.entity_id, m.properties);

        for (const rel of rels) {
          edges.push({
            type: rel.type,
            properties: rel.properties,
            startNodeElementId: rel.startNodeElementId,
            endNodeElementId: rel.endNodeElementId,
          });
        }
      }

      return {
        nodes: Array.from(nodes.values()),
        edges,
      };
    } finally {
      await session.close();
    }
  }

  async shortestPath(sourceId: string, targetId: string): Promise<any> {
    const session = this.getSession();
    try {
      const result = await session.run(
        `MATCH p = shortestPath(
           (a {entity_id: $src})-[*]-(b {entity_id: $tgt})
         )
         RETURN p`,
        { src: sourceId, tgt: targetId },
      );

      if (result.records.length === 0) {
        return null;
      }

      const path = result.records[0].get('p');
      return {
        nodes: path.segments.map((s: any) => s.start.properties).concat(
          path.segments.length > 0
            ? [path.segments[path.segments.length - 1].end.properties]
            : [],
        ),
        relationships: path.segments.map((s: any) => ({
          type: s.relationship.type,
          properties: s.relationship.properties,
        })),
        length: path.length,
      };
    } finally {
      await session.close();
    }
  }

  async getPageRank(): Promise<any[]> {
    const session = this.getSession();
    try {
      const result = await session.run(
        `CALL pagerank.get()
         YIELD node, rank
         RETURN node, rank
         ORDER BY rank DESC
         LIMIT 50`,
      );

      return result.records.map((r) => ({
        node: r.get('node').properties,
        rank: r.get('rank'),
      }));
    } finally {
      await session.close();
    }
  }

  async getCommunities(): Promise<any[]> {
    const session = this.getSession();
    try {
      const result = await session.run(
        `CALL community_detection.get()
         YIELD node, community_id
         RETURN node, community_id`,
      );

      return result.records.map((r) => ({
        node: r.get('node').properties,
        communityId: r.get('community_id'),
      }));
    } finally {
      await session.close();
    }
  }

  async getSubgraph(entityIds: string[]): Promise<any> {
    const session = this.getSession();
    try {
      const result = await session.run(
        `MATCH (n)
         WHERE n.entity_id IN $ids
         OPTIONAL MATCH (n)-[r]-(m)
         WHERE m.entity_id IN $ids
         RETURN n, r, m`,
        { ids: entityIds },
      );

      const nodes = new Map<string, any>();
      const edges: any[] = [];

      for (const record of result.records) {
        const n = record.get('n');
        if (n) {
          nodes.set(n.properties.entity_id, n.properties);
        }

        const m = record.get('m');
        if (m) {
          nodes.set(m.properties.entity_id, m.properties);
        }

        const rel = record.get('r');
        if (rel) {
          edges.push({
            type: rel.type,
            properties: rel.properties,
            source: rel.startNodeElementId,
            target: rel.endNodeElementId,
          });
        }
      }

      return {
        nodes: Array.from(nodes.values()),
        edges,
      };
    } finally {
      await session.close();
    }
  }
}
