import { create } from 'zustand';
import type { Entity, EntityPosition } from '@sentinel/shared';

interface EntityState {
  entities: Map<string, Entity>;
  positions: Map<string, EntityPosition>;
  selectedEntityId: string | null;
  hoveredEntityId: string | null;
  followingEntityId: string | null;

  setEntities: (entities: Entity[]) => void;
  updateEntity: (entity: Entity) => void;
  updatePosition: (position: EntityPosition) => void;
  updateBatch: (positions: EntityPosition[]) => void;
  selectEntity: (id: string | null) => void;
  hoverEntity: (id: string | null) => void;
  followEntity: (id: string | null) => void;
  getEntitiesArray: () => Entity[];
  getPositionsArray: () => EntityPosition[];
}

export const useEntityStore = create<EntityState>((set, get) => ({
  entities: new Map(),
  positions: new Map(),
  selectedEntityId: null,
  hoveredEntityId: null,
  followingEntityId: null,

  setEntities: (entities) =>
    set({ entities: new Map(entities.map((e) => [e.entityId, e])) }),

  updateEntity: (entity) =>
    set((state) => {
      const next = new Map(state.entities);
      next.set(entity.entityId, entity);
      return { entities: next };
    }),

  updatePosition: (position) =>
    set((state) => {
      const next = new Map(state.positions);
      next.set(position.entityId, position);
      return { positions: next };
    }),

  updateBatch: (positions) =>
    set((state) => {
      const next = new Map(state.positions);
      for (const p of positions) next.set(p.entityId, p);
      return { positions: next };
    }),

  selectEntity: (id) => set({ selectedEntityId: id }),
  hoverEntity: (id) => set({ hoveredEntityId: id }),
  followEntity: (id) => set({ followingEntityId: id }),
  getEntitiesArray: () => Array.from(get().entities.values()),
  getPositionsArray: () => Array.from(get().positions.values()),
}));
