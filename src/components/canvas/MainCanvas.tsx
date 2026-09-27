import React, { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Edge,
  type Node,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { GenreNode } from './nodes/GenreNode';
import { ArtistNode } from './nodes/ArtistNode';
import { TrackNode } from './nodes/TrackNode';

interface MainCanvasProps {
  initialNodes: Node[];
  initialEdges: Edge[];
  onNodeSelect?: (node: Node | null) => void;
}

export const MainCanvas: React.FC<MainCanvasProps> = ({ initialNodes, initialEdges, onNodeSelect }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  React.useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (onNodeSelect) onNodeSelect(node);
    
    const connectedEdges = initialEdges.filter(e => e.source === node.id || e.target === node.id);
    const connectedNodeIds = new Set(connectedEdges.map(e => e.source === node.id ? e.target : e.source));
    connectedNodeIds.add(node.id);

    setNodes(nds => nds.map(n => ({
      ...n,
      style: { opacity: connectedNodeIds.has(n.id) ? 1 : 0.2 },
    })));

    setEdges(eds => eds.map(e => ({
      ...e,
      animated: connectedNodeIds.has(e.source) && connectedNodeIds.has(e.target),
      style: { ...e.style, opacity: connectedNodeIds.has(e.source) && connectedNodeIds.has(e.target) ? 1 : 0.1 },
    })));
  }, [initialEdges, setNodes, setEdges, onNodeSelect]);

  const onPaneClick = useCallback(() => {
    if (onNodeSelect) onNodeSelect(null);
    setNodes(nds => nds.map(n => ({ ...n, style: { opacity: 1 } })));
    setEdges(eds => eds.map(e => ({ ...e, animated: true, style: { ...e.style, opacity: 1 } })));
  }, [onNodeSelect, setNodes, setEdges]);

  const nodeTypes = useMemo(() => ({
    genreNode: GenreNode,
    artistNode: ArtistNode,
    trackNode: TrackNode,
  }), []);

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        fitView
        className="bg-slate-950"
      >
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} color="#334155" />
        <Controls className="bg-slate-800 text-slate-300 border-slate-700 fill-slate-300" />
        <MiniMap 
          nodeColor="#334155"
          maskColor="rgba(15, 23, 42, 0.7)"
          className="bg-slate-900 border border-slate-700 rounded-lg"
        />
      </ReactFlow>
    </div>
  );
};
