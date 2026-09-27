import dagre from 'dagre';
import { Position } from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';

const nodeWidth = 160;
const nodeHeight = 50;
const genreNodeSize = 140;
const artistNodeSize = 120;

export const getLayoutedElements = (
  nodes: Node[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'TB'
) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  // Configure dagre layout
  dagreGraph.setGraph({ 
    rankdir: direction,
    nodesep: 40,
    edgesep: 10,
    ranksep: 80
  });

  nodes.forEach((node) => {
    let width = nodeWidth;
    let height = nodeHeight;

    if (node.type === 'genreNode') {
      width = genreNodeSize;
      height = genreNodeSize;
    } else if (node.type === 'artistNode') {
      width = artistNodeSize;
      height = 60; // pill size
    }

    dagreGraph.setNode(node.id, { width, height });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Calculate layout
  dagre.layout(dagreGraph);

  // Apply calculated positions back to nodes
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    
    // We are shifting the dagre node position (anchor=center) to the top left
    // so it matches the React Flow node anchor point (top left).
    let width = nodeWidth;
    let height = nodeHeight;
    
    if (node.type === 'genreNode') {
      width = genreNodeSize;
      height = genreNodeSize;
    } else if (node.type === 'artistNode') {
      width = artistNodeSize;
      height = 60;
    }

    return {
      ...node,
      position: {
        x: nodeWithPosition.x - width / 2,
        y: nodeWithPosition.y - height / 2,
      },
      targetPosition: direction === 'LR' ? Position.Left : Position.Top,
      sourcePosition: direction === 'LR' ? Position.Right : Position.Bottom,
    };
  });

  return { nodes: layoutedNodes, edges };
};
