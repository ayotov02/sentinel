import protobuf from 'protobufjs';

// ── Protobuf Schema (reflection-based) ──────────────────────

const root = new protobuf.Root();

const EntityUpdateMessage = new protobuf.Type('EntityUpdate')
  .add(new protobuf.Field('entityId', 1, 'string'))
  .add(new protobuf.Field('entityType', 2, 'string'))
  .add(new protobuf.Field('lat', 3, 'double'))
  .add(new protobuf.Field('lon', 4, 'double'))
  .add(new protobuf.Field('altitudeM', 5, 'float'))
  .add(new protobuf.Field('heading', 6, 'float'))
  .add(new protobuf.Field('speedKts', 7, 'float'))
  .add(new protobuf.Field('timestamp', 8, 'int64'))
  .add(new protobuf.Field('source', 9, 'string'))
  .add(new protobuf.Field('confidence', 10, 'float'));

const EntityBatchMessage = new protobuf.Type('EntityBatch')
  .add(EntityUpdateMessage)
  .add(new protobuf.Field('updates', 1, 'EntityUpdate', 'repeated'))
  .add(new protobuf.Field('timestamp', 2, 'int64'));

root.add(EntityBatchMessage);

// ── TypeScript Interfaces ────────────────────────────────────

export interface IEntityUpdate {
  entityId: string;
  entityType: string;
  lat: number;
  lon: number;
  altitudeM: number;
  heading: number;
  speedKts: number;
  timestamp: number;
  source: string;
  confidence: number;
}

export interface IEntityBatch {
  updates: IEntityUpdate[];
  timestamp: number;
}

// ── Encode / Decode Helpers ──────────────────────────────────

export function encodeEntityUpdate(data: IEntityUpdate): Uint8Array {
  const err = EntityUpdateMessage.verify(data);
  if (err) throw new Error(`EntityUpdate validation failed: ${err}`);
  const message = EntityUpdateMessage.create(data);
  return EntityUpdateMessage.encode(message).finish();
}

export function decodeEntityUpdate(buffer: Uint8Array): IEntityUpdate {
  const message = EntityUpdateMessage.decode(buffer);
  return EntityUpdateMessage.toObject(message, { longs: Number }) as IEntityUpdate;
}

export function encodeEntityBatch(data: IEntityBatch): Uint8Array {
  const err = EntityBatchMessage.verify(data);
  if (err) throw new Error(`EntityBatch validation failed: ${err}`);
  const message = EntityBatchMessage.create(data);
  return EntityBatchMessage.encode(message).finish();
}

export function decodeEntityBatch(buffer: Uint8Array): IEntityBatch {
  const message = EntityBatchMessage.decode(buffer);
  return EntityBatchMessage.toObject(message, { longs: Number }) as IEntityBatch;
}

export { EntityUpdateMessage, EntityBatchMessage };
