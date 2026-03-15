import { useCallback, useEffect, useMemo, useState } from 'react';
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
import dagre from '@dagrejs/dagre';
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
import * as api from '@/lib/api';
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

const EDGE_COLORS: Record<string, string> = {
  OWNED_BY: '#ef4444',
  MEMBER_OF: '#f59e0b',
  BASED_AT: '#10b981',
  OBSERVED_NEAR: '#6b7280',
  TRIGGERED: '#f97316',
  MENTIONED_IN: '#6b7280',
  REFERENCED_IN: '#6b7280',
  STS_TRANSFER: '#ec4899',
  CO_LOCATED: '#8b5cf6',
  SAME_OWNER: '#06b6d4',
  SAME_FLIGHT_PATH: '#3b82f6',
};

function applyDagreLayout(
  nodes: Node[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'TB',
): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep: 80, ranksep: 100 });

  nodes.forEach((node) => {
    g.setNode(node.id, { width: 180, height: 60 });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  return nodes.map((node) => {
    const pos = g.node(node.id);
    return {
      ...node,
      position: { x: pos.x - 90, y: pos.y - 30 },
    };
  });
}

// Fallback sample data when API is unavailable
const sampleNodes: Node[] = [
  { id: '1', type: 'aircraft', position: { x: 250, y: 0 }, data: { label: 'THY123', entityType: 'aircraft', confidence: 0.95 } },
  { id: '2', type: 'vessel', position: { x: 100, y: 200 }, data: { label: 'EVER GIVEN', entityType: 'vessel', confidence: 0.9 } },
  { id: '3', type: 'person', position: { x: 400, y: 200 }, data: { label: 'Gen. Smith', entityType: 'person', confidence: 0.7 } },
  { id: '4', type: 'organization', position: { x: 250, y: 350 }, data: { label: 'IRGC Navy', entityType: 'organization', confidence: 0.8 } },
  { id: '5', type: 'location', position: { x: 500, y: 350 }, data: { label: 'Bandar Abbas', entityType: 'location', confidence: 0.95 } },
  { id: '6', type: 'event', position: { x: 0, y: 350 }, data: { label: 'AIS Gap Detected', entityType: 'event', confidence: 0.88 } },
  { id: '7', type: 'document', position: { x: 650, y: 200 }, data: { label: 'SIGINT Report #4421', entityType: 'document', confidence: 1.0 } },
];

const sampleEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', label: 'OBSERVED_NEAR', animated: true, style: { stroke: '#6b7280' }, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e2-4', source: '2', target: '4', label: 'OWNED_BY', style: { stroke: '#ef4444' }, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e3-4', source: '3', target: '4', label: 'MEMBER_OF', style: { stroke: '#f59e0b' }, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e4-5', source: '4', target: '5', label: 'BASED_AT', style: { stroke: '#10b981' }, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e2-6', source: '2', target: '6', label: 'TRIGGERED', animated: true, style: { stroke: '#f97316' }, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e3-7', source: '3', target: '7', label: 'MENTIONED_IN', style: { stroke: '#6b7280' }, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e5-7', source: '5', target: '7', label: 'REFERENCED_IN', style: { stroke: '#6b7280' }, markerEnd: { type: MarkerType.ArrowClosed } },
];

export function GraphView() {
  const [nodes, setNodes, onNodesChange] = useNodesState(sampleNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(sampleEdges);
  const [communityColors, setCommunityColors] = useState<Record<string, string>>({});
  const selectEntity = useEntityStore((s) => s.selectEntity);

  // Load graph data from API
  useEffect(() => {
    async function loadGraph() {
      try {
        const pageRank = await api.getPageRank();
        if (!pageRank || pageRank.length === 0) return;

        // Get subgraph for top entities
        const topIds = pageRank.slice(0, 20).map((e: any) => e.entityId);
        const subgraph = await api.getSubgraph(topIds);
        if (!subgraph?.nodes?.length) return;

        const apiNodes: Node[] = subgraph.nodes.map((n: any, i: number) => ({
          id: n.entityId,
          type: n.entityType in nodeTypes ? n.entityType : 'document',
          position: { x: (i % 5) * 200, y: Math.floor(i / 5) * 150 },
          data: {
            label: n.displayName || n.entityId,
            entityType: n.entityType,
            confidence: n.confidence || 0.8,
          },
        }));

        const apiEdges: Edge[] = (subgraph.edges || []).map((e: any, i: number) => ({
          id: `e-${i}`,
          source: e.sourceEntityId,
          target: e.targetEntityId,
          label: e.relationshipType,
          style: { stroke: EDGE_COLORS[e.relationshipType] || '#6b7280' },
          markerEnd: { type: MarkerType.ArrowClosed },
          animated: e.relationshipType === 'OBSERVED_NEAR' || e.relationshipType === 'TRIGGERED',
        }));

        // Apply dagre layout to API nodes
        const laid = applyDagreLayout(apiNodes, apiEdges);
        setNodes(laid);
        setEdges(apiEdges);
      } catch {
        // Keep sample data on API failure
      }
    }
    loadGraph();
  }, []);

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      selectEntity(node.id);
    },
    [selectEntity],
  );

  const handleToolbarAction = useCallback(
    async (action: string) => {
      switch (action) {
        case 'Dagre Layout': {
          const laid = applyDagreLayout(nodes, edges, 'TB');
          setNodes(laid);
          break;
        }
        case 'Force Layout': {
          const laid = applyDagreLayout(nodes, edges, 'LR');
          setNodes(laid);
          break;
        }
        case 'Shortest Path': {
          if (nodes.length >= 2) {
            try {
              const result = await api.getShortestPath(nodes[0].id, nodes[nodes.length - 1].id);
              if (result?.path) {
                const pathIds = new Set(result.path.map((p: any) => p.entityId));
                setEdges((eds) =>
                  eds.map((e) => ({
                    ...e,
                    animated: pathIds.has(e.source) && pathIds.has(e.target),
                    style: {
                      ...e.style,
                      strokeWidth: pathIds.has(e.source) && pathIds.has(e.target) ? 3 : 1.5,
                    },
                  })),
                );
              }
            } catch {
              console.error('Shortest path query failed');
            }
          }
          break;
        }
        case 'Detect Communities': {
          try {
            const communities = await api.getCommunities();
            if (communities?.length) {
              const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
              const colorMap: Record<string, string> = {};
              communities.forEach((c: any, i: number) => {
                (c.members || []).forEach((m: string) => {
                  colorMap[m] = colors[i % colors.length];
                });
              });
              setCommunityColors(colorMap);
              setNodes((nds) =>
                nds.map((n) => ({
                  ...n,
                  style: colorMap[n.id]
                    ? { border: `2px solid ${colorMap[n.id]}`, borderRadius: 8 }
                    : n.style,
                })),
              );
            }
          } catch {
            console.error('Community detection failed');
          }
          break;
        }
        case 'Export PNG': {
          // Trigger React Flow's built-in export
          const el = document.querySelector('.react-flow__viewport') as HTMLElement;
          if (el) {
            const { toPng } = await import('html-to-image');
            const dataUrl = await toPng(el).catch(() => null);
            if (dataUrl) {
              const a = document.createElement('a');
              a.href = dataUrl;
              a.download = `graph-${Date.now()}.png`;
              a.click();
            }
          }
          break;
        }
      }
    },
    [nodes, edges, setNodes, setEdges],
  );

  const miniMapNodeColor = useCallback(
    (n: Node) =>
      communityColors[n.id] ||
      ENTITY_COLORS[n.data?.entityType as EntityType] ||
      '#6b7280',
    [communityColors],
  );

  return (
    <div className="h-full w-full flex flex-col">
      <GraphToolbar onAction={handleToolbarAction} />
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
