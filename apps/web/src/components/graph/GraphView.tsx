import { useCallback, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  MarkerType,
  type NodeMouseHandler,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { GraphToolbar } from './GraphToolbar';
import { AircraftNode } from './nodes/AircraftNode';
import { VesselNode } from './nodes/VesselNode';
import { PersonNode } from './nodes/PersonNode';
import { OrgNode } from './nodes/OrgNode';
import { EventNode } from './nodes/EventNode';
import { LocationNode } from './nodes/LocationNode';
import { DocumentNode } from './nodes/DocumentNode';
import { ENTITY_COLORS } from '@/lib/constants';
import { useEntityStore } from '@/stores/entity-store';
import type { EntityType } from '@sentinel/shared';

const nodeTypes = {
  aircraft: AircraftNode,
  vessel: VesselNode,
  person: PersonNode,
  organization: OrgNode,
  event: EventNode,
  location: LocationNode,
  document: DocumentNode,
};

// Sample initial data - in production would come from API
const initialNodes: Node[] = [
  {
    id: '1',
    type: 'aircraft',
    position: { x: 250, y: 0 },
    data: {
      label: 'THY123',
      entityType: 'aircraft',
      confidence: 0.95,
    },
  },
  {
    id: '2',
    type: 'vessel',
    position: { x: 100, y: 200 },
    data: {
      label: 'EVER GIVEN',
      entityType: 'vessel',
      confidence: 0.9,
    },
  },
  {
    id: '3',
    type: 'person',
    position: { x: 400, y: 200 },
    data: {
      label: 'Gen. Smith',
      entityType: 'person',
      confidence: 0.7,
    },
  },
  {
    id: '4',
    type: 'organization',
    position: { x: 250, y: 350 },
    data: {
      label: 'IRGC Navy',
      entityType: 'organization',
      confidence: 0.8,
    },
  },
  {
    id: '5',
    type: 'location',
    position: { x: 500, y: 350 },
    data: {
      label: 'Bandar Abbas',
      entityType: 'location',
      confidence: 0.95,
    },
  },
  {
    id: '6',
    type: 'event',
    position: { x: 0, y: 350 },
    data: {
      label: 'AIS Gap Detected',
      entityType: 'event',
      confidence: 0.88,
    },
  },
  {
    id: '7',
    type: 'document',
    position: { x: 650, y: 200 },
    data: {
      label: 'SIGINT Report #4421',
      entityType: 'document',
      confidence: 1.0,
    },
  },
];

const initialEdges: Edge[] = [
  {
    id: 'e1-2',
    source: '1',
    target: '2',
    label: 'OBSERVED_NEAR',
    animated: true,
    style: { stroke: '#6b7280' },
    markerEnd: { type: MarkerType.ArrowClosed },
  },
  {
    id: 'e2-4',
    source: '2',
    target: '4',
    label: 'OWNED_BY',
    style: { stroke: '#ef4444' },
    markerEnd: { type: MarkerType.ArrowClosed },
  },
  {
    id: 'e3-4',
    source: '3',
    target: '4',
    label: 'MEMBER_OF',
    style: { stroke: '#f59e0b' },
    markerEnd: { type: MarkerType.ArrowClosed },
  },
  {
    id: 'e4-5',
    source: '4',
    target: '5',
    label: 'BASED_AT',
    style: { stroke: '#10b981' },
    markerEnd: { type: MarkerType.ArrowClosed },
  },
  {
    id: 'e2-6',
    source: '2',
    target: '6',
    label: 'TRIGGERED',
    animated: true,
    style: { stroke: '#f97316' },
    markerEnd: { type: MarkerType.ArrowClosed },
  },
  {
    id: 'e3-7',
    source: '3',
    target: '7',
    label: 'MENTIONED_IN',
    style: { stroke: '#6b7280' },
    markerEnd: { type: MarkerType.ArrowClosed },
  },
  {
    id: 'e5-7',
    source: '5',
    target: '7',
    label: 'REFERENCED_IN',
    style: { stroke: '#6b7280' },
    markerEnd: { type: MarkerType.ArrowClosed },
  },
];

export function GraphView() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const selectEntity = useEntityStore((s) => s.selectEntity);

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      selectEntity(node.id);
    },
    [selectEntity],
  );

  const miniMapNodeColor = useCallback(
    (n: Node) =>
      ENTITY_COLORS[n.data?.entityType as EntityType] || '#6b7280',
    [],
  );

  return (
    <div className="h-full w-full flex flex-col">
      <GraphToolbar />
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          className="bg-background"
          defaultEdgeOptions={{
            style: { strokeWidth: 1.5 },
            labelStyle: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' },
            labelBgStyle: {
              fill: 'hsl(var(--card))',
              fillOpacity: 0.9,
            },
          }}
        >
          <Background
            color="hsl(var(--muted-foreground))"
            gap={16}
            size={1}
            style={{ opacity: 0.15 }}
          />
          <Controls className="[&>button]:bg-card [&>button]:border-border [&>button]:text-foreground" />
          <MiniMap
            nodeColor={miniMapNodeColor}
            className="bg-card border border-border rounded-lg"
          />
        </ReactFlow>
      </div>
    </div>
  );
}
