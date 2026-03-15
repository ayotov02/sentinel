/**
 * EntityBufferManager: High-performance typed array buffer for 50K+ entities
 *
 * Entity positions live in typed arrays (NOT React state) to avoid
 * reconciliation overhead. React is notified at most 10Hz via a version
 * counter that deck.gl checks for changes.
 */

export class EntityBufferManager {
  // Typed array buffers for direct GPU upload via deck.gl binary attributes
  private _positions: Float64Array; // [lon, lat, lon, lat, ...]
  private _colors: Uint8Array; // [r, g, b, a, r, g, b, a, ...]
  private _radii: Float32Array; // [radius, radius, ...]
  private _headings: Float32Array; // [heading, heading, ...]

  // Entity lookup
  private _entityIndex: Map<string, number>;
  private _entityIds: string[];
  private _count: number;
  private _version: number;
  private _capacity: number;

  // Entity type -> color mapping
  private static readonly TYPE_COLORS: Record<
    string,
    [number, number, number, number]
  > = {
    aircraft: [59, 130, 246, 220], // blue
    vessel: [16, 185, 129, 220], // emerald
    satellite: [168, 85, 247, 220], // purple
    event: [249, 115, 22, 220], // orange
    fire: [239, 68, 68, 220], // red
    earthquake: [234, 179, 8, 220], // yellow
    outage: [236, 72, 153, 220], // pink
    notam: [148, 163, 184, 180], // slate
    weather: [34, 211, 238, 220], // cyan
  };

  private static readonly TYPE_RADII: Record<string, number> = {
    aircraft: 80,
    vessel: 100,
    satellite: 60,
    event: 150,
    fire: 120,
    earthquake: 200,
    outage: 300,
    notam: 100,
    weather: 180,
  };

  constructor(maxEntities = 100_000) {
    this._capacity = maxEntities;
    this._positions = new Float64Array(maxEntities * 2);
    this._colors = new Uint8Array(maxEntities * 4);
    this._radii = new Float32Array(maxEntities);
    this._headings = new Float32Array(maxEntities);
    this._entityIndex = new Map();
    this._entityIds = new Array(maxEntities);
    this._count = 0;
    this._version = 0;
  }

  get count(): number {
    return this._count;
  }
  get version(): number {
    return this._version;
  }

  /**
   * Upsert an entity into the buffer. Returns true if new entity.
   */
  upsert(
    entityId: string,
    lon: number,
    lat: number,
    entityType: string,
    heading?: number | null,
  ): boolean {
    let idx = this._entityIndex.get(entityId);
    const isNew = idx === undefined;

    if (isNew) {
      if (this._count >= this._capacity) return false; // Buffer full
      idx = this._count++;
      this._entityIndex.set(entityId, idx);
      this._entityIds[idx] = entityId;
    }

    // Update position
    this._positions[idx * 2] = lon;
    this._positions[idx * 2 + 1] = lat;

    // Update color based on entity type
    const color = EntityBufferManager.TYPE_COLORS[entityType] || [
      148, 163, 184, 180,
    ];
    this._colors[idx * 4] = color[0];
    this._colors[idx * 4 + 1] = color[1];
    this._colors[idx * 4 + 2] = color[2];
    this._colors[idx * 4 + 3] = color[3];

    // Update radius
    this._radii[idx] = EntityBufferManager.TYPE_RADII[entityType] || 100;

    // Update heading
    this._headings[idx] = heading ?? 0;

    this._version++;
    return isNew;
  }

  /**
   * Remove an entity by swapping with the last element (O(1) removal)
   */
  remove(entityId: string): boolean {
    const idx = this._entityIndex.get(entityId);
    if (idx === undefined) return false;

    const lastIdx = this._count - 1;
    if (idx !== lastIdx) {
      // Swap with last element
      const lastEntityId = this._entityIds[lastIdx];

      this._positions[idx * 2] = this._positions[lastIdx * 2];
      this._positions[idx * 2 + 1] = this._positions[lastIdx * 2 + 1];
      this._colors[idx * 4] = this._colors[lastIdx * 4];
      this._colors[idx * 4 + 1] = this._colors[lastIdx * 4 + 1];
      this._colors[idx * 4 + 2] = this._colors[lastIdx * 4 + 2];
      this._colors[idx * 4 + 3] = this._colors[lastIdx * 4 + 3];
      this._radii[idx] = this._radii[lastIdx];
      this._headings[idx] = this._headings[lastIdx];
      this._entityIds[idx] = lastEntityId;
      this._entityIndex.set(lastEntityId, idx);
    }

    this._entityIndex.delete(entityId);
    this._count--;
    this._version++;
    return true;
  }

  /**
   * Batch upsert from WebSocket entity updates
   */
  batchUpsert(
    entities: Array<{
      entityId: string;
      lon: number;
      lat: number;
      entityType: string;
      heading?: number | null;
    }>,
  ): void {
    for (const e of entities) {
      this.upsert(e.entityId, e.lon, e.lat, e.entityType, e.heading);
    }
  }

  /**
   * Get deck.gl ScatterplotLayer binary attribute data
   * Zero-copy: returns subarrays pointing to the same underlying buffer
   */
  getLayerData() {
    return {
      length: this._count,
      attributes: {
        getPosition: {
          value: this._positions.subarray(0, this._count * 2),
          size: 2,
        },
        getFillColor: {
          value: this._colors.subarray(0, this._count * 4),
          size: 4,
        },
        getRadius: {
          value: this._radii.subarray(0, this._count),
          size: 1,
        },
      },
    };
  }

  /**
   * Get entity ID at a given buffer index (for pick events)
   */
  getEntityIdAtIndex(index: number): string | undefined {
    if (index < 0 || index >= this._count) return undefined;
    return this._entityIds[index];
  }

  /**
   * Get buffer index for an entity ID
   */
  getIndexForEntity(entityId: string): number | undefined {
    return this._entityIndex.get(entityId);
  }

  /**
   * Get position of a specific entity
   */
  getPosition(entityId: string): [number, number] | null {
    const idx = this._entityIndex.get(entityId);
    if (idx === undefined) return null;
    return [this._positions[idx * 2], this._positions[idx * 2 + 1]];
  }

  /**
   * Check if an entity exists
   */
  has(entityId: string): boolean {
    return this._entityIndex.has(entityId);
  }

  /**
   * Get all entity IDs
   */
  getEntityIds(): string[] {
    return this._entityIds.slice(0, this._count);
  }

  /**
   * Clear all entities
   */
  clear(): void {
    this._entityIndex.clear();
    this._count = 0;
    this._version++;
  }

  /**
   * Memory stats
   */
  getStats() {
    const bytesUsed =
      this._count * 2 * 8 + // positions (Float64)
      this._count * 4 + // colors (Uint8)
      this._count * 4 + // radii (Float32)
      this._count * 4; // headings (Float32)
    return {
      count: this._count,
      capacity: this._capacity,
      bytesUsed,
      megabytesUsed: (bytesUsed / 1024 / 1024).toFixed(2),
      version: this._version,
    };
  }
}

// Singleton instance
export const entityBuffer = new EntityBufferManager(100_000);
