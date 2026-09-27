import React, { useCallback, useMemo, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Controls,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { GenreNode } from './nodes/GenreNode';
import { ArtistNode } from './nodes/ArtistNode';
import { TrackNode } from './nodes/TrackNode';

interface MainCanvasProps {
  initialNodes: Node[];
  initialEdges: Edge[];
  selectedNode: Node | null;
  onNodeSelect?: (node: Node | null) => void;
  onToggleExpand?: (node: Node) => void;
  searchQuery?: string;
  isDark?: boolean;
}

export const MainCanvas: React.FC<MainCanvasProps> = ({ 
  initialNodes, 
  initialEdges, 
  selectedNode,
  onNodeSelect,
  onToggleExpand,
  searchQuery = '',
  isDark = false,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { fitView, setCenter } = useReactFlow();
  const hasInitializedCamera = useRef(false);

  // Derive highlighted nodes & edges based on selectedNode or searchQuery
  useEffect(() => {
    // Determine active focus set (selected node and its immediate neighbors)
    let focusedNodeIds: Set<string> | null = null;
    let focusedEdgeIds: Set<string> | null = null;

    if (selectedNode) {
      focusedNodeIds = new Set<string>([selectedNode.id]);
      focusedEdgeIds = new Set<string>();

      initialEdges.forEach((e) => {
        if (e.source === selectedNode.id || e.target === selectedNode.id) {
          focusedEdgeIds!.add(e.id);
          focusedNodeIds!.add(e.source);
          focusedNodeIds!.add(e.target);
        }
      });
    } else if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      focusedNodeIds = new Set<string>();
      focusedEdgeIds = new Set<string>();

      initialNodes.forEach((node) => {
        const data = node.data as any;
        const labelMatch = (data.label || '').toLowerCase().includes(q);
        const artistMatch = (data.artist || '').toLowerCase().includes(q);
        const genreMatch = (data.genre || '').toLowerCase().includes(q);

        if (labelMatch || artistMatch || genreMatch) {
          focusedNodeIds!.add(node.id);
        }
      });

      initialEdges.forEach((e) => {
        if (focusedNodeIds!.has(e.source) || focusedNodeIds!.has(e.target)) {
          focusedEdgeIds!.add(e.id);
        }
      });
    }

    // Apply highlighting/dimming to nodes
    const updatedNodes = initialNodes.map((n) => {
      const isSelected = selectedNode?.id === n.id;
      const isDimmed = focusedNodeIds !== null && !focusedNodeIds.has(n.id);

      return {
        ...n,
        data: {
          ...n.data,
          isDark,
          selected: isSelected,
          dimmed: isDimmed,
        },
      };
    });

    // Apply highlighting/dimming to edges
    const updatedEdges = initialEdges.map((e) => {
      const isHighlighted = focusedEdgeIds !== null && focusedEdgeIds.has(e.id);
      const isDimmed = focusedEdgeIds !== null && !isHighlighted;

      return {
        ...e,
        animated: isHighlighted,
        style: {
          ...e.style,
          stroke: isHighlighted 
            ? 'var(--edge-active)' 
            : isDimmed 
            ? 'var(--edge-color)' 
            : 'var(--edge-color)',
          strokeWidth: isHighlighted ? 2 : 1.2,
          opacity: isHighlighted ? 0.9 : isDimmed ? 0.08 : 0.45,
          transition: 'stroke 0.2s ease, stroke-width 0.2s ease, opacity 0.2s ease',
        },
      };
    });

    setNodes(updatedNodes);
    setEdges(updatedEdges);
  }, [initialNodes, initialEdges, selectedNode, searchQuery, isDark, setNodes, setEdges]);

  // Viewport camera management: ensure the graph fills 70-85% of screen comfortably on load and adapts intelligently
  useEffect(() => {
    if (initialNodes.length === 0) return;

    // Small delay to allow react-flow geometry measurements to settle
    const timer = setTimeout(() => {
      fitView({
        padding: 0.12, // 12% padding gives ~76-88% graph coverage
        duration: hasInitializedCamera.current ? 450 : 0,
        minZoom: 0.45,
        maxZoom: 1.25,
      });
      hasInitializedCamera.current = true;
    }, 50);

    return () => clearTimeout(timer);
  }, [initialNodes.length, fitView]);

  // Center camera when a node is selected
  useEffect(() => {
    if (selectedNode) {
      const targetNode = nodes.find((n) => n.id === selectedNode.id);
      if (targetNode && targetNode.position) {
        setCenter(
          targetNode.position.x + 80,
          targetNode.position.y + 30,
          { duration: 400, zoom: Math.max(0.75, 1) }
        );
      }
    }
  }, [selectedNode, setCenter, nodes]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (onNodeSelect) onNodeSelect(node);
      if (onToggleExpand) onToggleExpand(node);
    },
    [onNodeSelect, onToggleExpand]
  );

  const onPaneClick = useCallback(() => {
    if (onNodeSelect) onNodeSelect(null);
  }, [onNodeSelect]);

  const nodeTypes = useMemo(
    () => ({
      genreNode: GenreNode,
      artistNode: ArtistNode,
      trackNode: TrackNode,
    }),
    []
  );

  return (
    <div className="w-full h-full relative select-none">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        fitView
        fitViewOptions={{ padding: 0.12, minZoom: 0.45, maxZoom: 1.25 }}
        minZoom={0.25}
        maxZoom={2.2}
        panOnScroll={false}
        zoomOnScroll={true}
        zoomOnPinch={true}
        panOnDrag={true}
        className="bg-[var(--bg-primary)]"
      >
        <Controls 
          showInteractive={false}
          className="!bottom-6 !left-6 shadow-md"
        />
      </ReactFlow>
    </div>
  );
};
