/************************************************
 * CONSTANTS
 ************************************************/

// Width of the properties panel
const PROPERTIES_PANEL_WIDTH = 300;

// Radius of a node
const DEFAULT_NODE_SIZE = 4;

// Base menu identifier
const MENU_BASE = 0;
// Node menu identifier
const MENU_NODE = 1;
// Edge menu identifier
const MENU_EDGE = 2;

// Selection tool identifier
const TOOL_SELECT = 0;
// Panning tool identifier
const TOOL_PAN = 1;
// Node addition tool identifier
const TOOL_ADD = 2;
// Node removal tool identifier
const TOOL_REMOVE = 3;
// Edge manipulation tool identifier
const TOOL_EDGE = 4;
// Zoom tool identifier
const TOOL_ZOOM_IN = 5;
// Zoom tool identifier
const TOOL_ZOOM_OUT = 6;

// Nodes which represent doorways
const NODE_TYPE_DOOR = 0;
// Nodes which represent staircases
const NODE_TYPE_STAIRS = 1;
// Nodes which represent elevators
const NODE_TYPE_ELEVATOR = 2;
// Nodes which represent hallways
const NODE_TYPE_HALL = 3;
// Nodes which represent rooms
const NODE_TYPE_ROOM = 4;
// Nodes which represent streets
const NODE_TYPE_STREET = 5;
// Nodes which represent paths
const NODE_TYPE_PATH = 6;
// Nodes which represent street intersections
const NODE_TYPE_INTERSECTION = 7;

// Static canvas width for drawing images
const BASE_CANVAS_WIDTH = 800;
// Static canvas height for drawing images
const BASE_CANVAS_HEIGHT = 800;

/************************************************
 * VARIABLES - GRAPH
 ************************************************/

// The list of floors
const floors = [];
// The floor currently being edited
let currentFloor = 0;

// List of available tools
const tools = [
  '#tool-select',
  '#tool-pan',
  '#tool-add',
  '#tool-remove',
  '#tool-edge',
  '#tool-zoom-in',
  '#tool-zoom-out',
];
// Currently selected tool
let currentTool = TOOL_PAN;

// List of available menus
const menus = [
  "#base-props",
  "#node-props",
  "#edge-props",
];
// Currently shown menu
let currentMenu = MENU_BASE;

// Colors of node types
const nodeTypeColors = [
  { r: 0, g: 255, b: 0 },
  { r: 255, g: 0, b: 0 },
  { r: 255, g: 255, b: 0 },
  { r: 0, g: 0, b: 255 },
  { r: 0, g: 0, b: 0 },
  { r: 0, g: 255, b: 255 },
  { r: 255, g: 0, b: 255 },
  { r: 128, g: 128, b: 128 },
];
// Identify node types by a single character
const nodeTypeIdentifiers = [
  'D', 'S', 'E', 'H', 'R', 'T', 'P', 'I',
];
// Radius of nodes
let nodeSize = DEFAULT_NODE_SIZE;
// Most recently assigned node type
let mostRecentNodeType = NODE_TYPE_DOOR;

// The currently selected node
let selectedNode = null;
// The currently selected edge
let selectedEdge = null;

// The selected node that an edge will start from
let edgeStartNode = null;
// Target x of new edge
let newEdgeX = -1;
// Target y of new edge
let newEdgeY = -1;

/************************************************
 * VARIABLES - CANVAS
 ************************************************/

// Name of the project
let projectName = '';

// Additional details about the formatting
let projectFormat = 'floor*=^(\d).*$';

// For drawing the user generated content
let canvas;
// Graphics context for the canvas
let canvasCtx;

// Width of the canvases
let canvasWidth = 0;
// Height of the canvases
let canvasHeight = 0;

// Scaling factor
let scale = 1;

// Indicates if the canvas should record panning
let panning = false;
// Starting x location of panning
let panStartX = 0;
// Staring y location of panning
let panStartY = 0;
// Initial x offset before panning
let panStartOffsetX = 0;
// Initial y offset before panning
let panStartOffsetY = 0;
// Current x panning offset
let panOffsetX = 0;
// Current y panning offset
let panOffsetY = 0;

/************************************************
 * TOOLS
 ************************************************/

/**
 * Handles a global keypress event
 *
 * @param {any} event key event
 */
function handleKeyPress(event) {
  // Ignore key presses when creating a new edge
  if (edgeStartNode != null) {
    return;
  }

  switch (event.target.tagName.toLowerCase()) {
    case "input":
    case "textarea":
      if (event.keyCode == 27) { // ESCAPE
        const focused = document.activeElement;
        focused.blur();
      }
      break;
    default:
      // Hotkeys to switch tools
      const oldTool = currentTool;
      switch (event.keyCode) {
        case 83: case 84: currentTool = TOOL_SELECT; break; // S, T
        case 80: case 32: currentTool = TOOL_PAN; break;    // P, SPACE
        case 78: currentTool = TOOL_ADD; break;             // N
        case 82: currentTool = TOOL_REMOVE; break;          // R
        case 76: currentTool = TOOL_EDGE; break;            // L
        case 73: currentTool = TOOL_ZOOM_IN; break;         // I
        case 79: currentTool = TOOL_ZOOM_OUT; break;        // O
        case 49: case 50: case 51: case 52: case 53: case 54: case 55: case 56:
          mostRecentNodeType = event.keyCode - 49;          // 1 - 8
          break;
        case 88:                                            // X
          if (selectedEdge != null) {
            if (selectedEdge.direction === 'UD') {
              $('#edge-lr').click();
            } else {
              $('#edge-ud').click();
            }
          }
          break;
      }
      if (oldTool !== currentTool) {
        highlightCurrentTool();
      }
  }
}

/**
 * Adds a border around the currently selected tool, removes border around any others.
 */
function highlightCurrentTool() {
  for (const tool of tools) {
    if (tool === tools[currentTool]) {
      $(tool).addClass('selected-icon');
    } else {
      $(tool).removeClass('selected-icon');
    }
  }
}

/**
 * Tries to select a node, edge, or nothing.
 *
 * @param {number} x     x position of click
 * @param {number} y     y position of click
 * @param {number} floor the floor to select from
 * @param {string} type  specific item type to check for
 */
function tryToSelectAt(x, y, floor, type) {
  selectedNode = null;
  selectedEdge = null;
  let newMenu = null;

  if (type == null || type === 'node') {
    const nearest = findNearestNode(x, y, floor);
    if (nearest != null) {
      selectedNode = nearest.node;
      mostRecentNodeType = selectedNode.type;
      newMenu = MENU_NODE;
    }
  }

  if (selectedNode == null && (type == null || type === 'edge')) {
    const nearest = findNearestEdge(x, y, floor);
    if (nearest != null) {
      selectedEdge = nearest.edge;
      newMenu = MENU_EDGE;
    }
  }

  if (selectedNode == null && selectedEdge == null) {
    newMenu = MENU_BASE;
  }

  setCurrentMenu(newMenu);
  redraw();
}

/**
 * Adds a new node to the graph.
 *
 * @param {number} x     x location of new node
 * @param {number} y     y location of new node
 * @param {number} floor floor to add new node to
 * @param {number} type  type of new node
 * @returns {object} the new node added
 */
function addNewNode(x, y, floor, type) {
  const newNode = {
    x,
    y,
    type,
    additional: '',
    name: '',
    bid: '',
    assignedName: false,
  };
  floors[floor].nodes.push(newNode);
  return newNode;
}

/**
 * Tries to connect a node to the nearest node of a type it can connect to on its floor
 *
 * @param {Node} node
 * @param {number} floor
 */
function attemptToConnectToNearestNode(node, floor) {
  switch (node.type) {
    case NODE_TYPE_DOOR:
    case NODE_TYPE_ELEVATOR:
    case NODE_TYPE_STAIRS:
    case NODE_TYPE_ROOM: {
      let minNode = null;
      let minDistance = Infinity;
      for (const potentialNode of floors[floor].nodes) {
        if (canNodeTypesConnect(node.type, potentialNode.type) && canNodeTypesConnect(potentialNode.type, node.type)) {
          const potentialDist = Math.sqrt(Math.pow(potentialNode.x - node.x, 2) + Math.pow(potentialNode.y - node.y, 2));
          if (potentialDist < minDistance) {
            minDistance = potentialDist;
            minNode = potentialNode;
          }
        }
      }

      if (minNode != null) {
        addNewEdge(node, minNode, floor);
      }
      break;
    }
    default:
      break;
  }
}

/**
 * Attempts to remove a node from the graph, if there is one at the location.
 *
 * @param {number} x     x location of node to remove
 * @param {number} y     y location of node to remove
 * @param {number} floor floor to remove node from
 * @returns {boolean} true if a node was removed, false otherwise
 */
function removeNodeAt(x, y, floor) {
  const nodes = floors[floor].nodes;
  const nearest = findNearestNode(x, y, floor);
  if (nearest != null) {
    removeNode(floors[floor].nodes, nearest.i, floor);
    return true;
  }

  return false;
}

/**
 * Attempts to remove an edge from the graph, if there is one at the location.
 *
 * @param {number} x     x location of edge to remove
 * @param {number} y     y location of edge to remove
 * @param {number} floor floor to remove edge from
 * @returns {boolean} true if an edge was removed, false otherwise
 */
function removeEdgeAt(x, y, floor) {
  const edges = floors[floor].edges;
  const nearest = findNearestEdge(x, y, floor);
  if (nearest != null) {
    edges.splice(nearest.i, 1);
  }
}

/**
 * Remove a node from a list, and remove any edges containing it.
 *
 * @param {array} nodes  the list of nodes to remove from`
 * @param {number} index the index of the node to remove
 * @param {number} floor the floor the node is being removed from
 */
function removeNode(nodes, index, floor) {
  const removedNode = nodes[index];
  nodes.splice(index, 1);
  const edges = floors[floor].edges;
  for (let i = 0; i < edges.length; i++) {
    if (edgeContainsNode(edges[i], removedNode)) {
      edges.splice(i, 1);
      i -= 1;
    }
  }
}

/**
 * Looks for a node at a location.
 *
 * @param {number} x     x location to look for node
 * @param {number} y     y location to look for node
 * @param {number} floor floor to select node from
 */
function findNearestNode(x, y, floor) {
  const nodes = floors[floor].nodes;
  let closestNode = -1;
  let minDistance = -1;
  for (let i = 0; i < nodes.length; i++) {
    const distance = distanceBetweenPoints(nodes[i].x, nodes[i].y, x, y);
    if (distance < minDistance || minDistance === -1) {
      minDistance = distance;
      closestNode = i;
    }
  }

  if (closestNode != -1 && minDistance <= nodeSize / scale) {
    return { node: nodes[closestNode], i: closestNode };
  } else {
    return null;
  }
}

/**
 * Looks for an edge at a location.
 *
 * @param {*} x     x location to look for edge
 * @param {*} y     y location to look for edge
 * @param {*} floor floor to select edge from
 */
function findNearestEdge(x, y, floor) {
  const edges = floors[floor].edges;
  let closestEdge = -1;
  let minDistance = -1;
  for (let i = 0; i < edges.length; i++) {
    const distance = distanceToEdge(x, y, edges[i]);
    if (distance < minDistance || minDistance === -1) {
      minDistance = distance;
      closestEdge = i;
    }
  }

  if (closestEdge != -1 && minDistance <= nodeSize / scale) {
    return { edge: edges[closestEdge], i: closestEdge };
  } else {
    return null;
  }
}

/**
 * Returns true if door nodes can be connected to nodes of the given type, false otherwise.
 */
function canDoorsConnectTo(type) {
  switch (type) {
    case NODE_TYPE_HALL:
    case NODE_TYPE_PATH:
    case NODE_TYPE_STREET:
      return true;
    default:
      return false;
  }
}

/**
 * Returns true if stair nodes can be connected to nodes of the given type, false otherwise.
 */
function canStairsConnectTo(type) {
  switch (type) {
    case NODE_TYPE_HALL:
      return true;
    default:
      return false;
  }
}

/**
 * Returns true if elevator nodes can be connected to nodes of the given type, false otherwise.
 */
function canElevatorsConnectTo(type) {
  switch (type) {
    case NODE_TYPE_HALL:
      return true;
    default:
      return false;
  }
}

/**
 * Returns true if hallway nodes can be connected to nodes of the given type, false otherwise.
 */
function canHallsConnectTo(type) {
  switch (type) {
    case NODE_TYPE_DOOR:
    case NODE_TYPE_STAIRS:
    case NODE_TYPE_ELEVATOR:
    case NODE_TYPE_HALL:
    case NODE_TYPE_ROOM:
      return true;
    default:
      return false;
  }
}

/**
 * Returns true if room nodes can be connected to nodes of the given type, false otherwise.
 */
function canRoomsConnectTo(type) {
  switch (type) {
    case NODE_TYPE_HALL:
      return true;
    default:
      return false;
  }
}

/**
 * Returns true if street nodes can be connected to nodes of the given type, false otherwise.
 */
function canStreetsConnectTo(type) {
  switch (type) {
    case NODE_TYPE_DOOR:
    case NODE_TYPE_STREET:
    case NODE_TYPE_PATH:
    case NODE_TYPE_INTERSECTION:
      return true;
    default:
      return false;
  }
}

/**
 * Returns true if path nodes can be connected to nodes of the given type, false otherwise.
 */
function canPathsConnectTo(type) {
  switch (type) {
    case NODE_TYPE_DOOR:
    case NODE_TYPE_STREET:
    case NODE_TYPE_PATH:
    case NODE_TYPE_INTERSECTION:
      return true;
    default:
      return false;
  }
}

/**
 * Returns true if intersection nodes can be connected to nodes of the given type, false otherwise.
 */
function canIntersectionsConnectTo(type) {
  switch (type) {
    case NODE_TYPE_STREET:
    case NODE_TYPE_PATH:
    case NODE_TYPE_INTERSECTION:
      return true;
    default:
      return false;
  }
}

/**
 * Checks if two node types can be connected by an edge.
 *
 * @param {number} typeA type of first node
 * @param {number} typeB type of second node
 * @returns {boolean} true if the nodes can connect, false otherwise
 */
function canNodeTypesConnect(typeA, typeB) {
  switch (typeA) {
    case NODE_TYPE_DOOR:
      return canDoorsConnectTo(typeB);
    case NODE_TYPE_STAIRS:
      return canStairsConnectTo(typeB);
    case NODE_TYPE_ELEVATOR:
      return canElevatorsConnectTo(typeB);
    case NODE_TYPE_HALL:
      return canHallsConnectTo(typeB);
    case NODE_TYPE_ROOM:
      return canRoomsConnectTo(typeB);
    case NODE_TYPE_STREET:
      return canStreetsConnectTo(typeB);
    case NODE_TYPE_PATH:
      return canPathsConnectTo(typeB);
    case NODE_TYPE_INTERSECTION:
      return canIntersectionsConnectTo(typeB);
  }

  throw new Error(`Invalid node type: ${typeA}`);
}

/**
 * Returns name of the node type.
 *
 * @param {number} type node type
 */
function getNodeTypeName(type) {
  switch (type) {
    case NODE_TYPE_DOOR:
      return 'Door';
    case NODE_TYPE_STAIRS:
      return 'Stairs';
    case NODE_TYPE_ELEVATOR:
      return 'Elevator';
    case NODE_TYPE_HALL:
      return 'Hallway';
    case NODE_TYPE_ROOM:
      return 'Room';
    case NODE_TYPE_STREET:
      return 'Street';
    case NODE_TYPE_PATH:
      return 'Path';
    case NODE_TYPE_INTERSECTION:
      return 'Intersection';
  }

  throw new Error(`Invalid node type: ${type}`);
}

/**
 * Adds a new edge to the floor
 *
 * @param {object} nodeA starting node of the edge
 * @param {object} nodeB ending node of the edge
 * @param {number} floor the floor the edge is on
 */
function addNewEdge(nodeA, nodeB, floor) {
  if (!(canNodeTypesConnect(nodeA.type, nodeB.type) && canNodeTypesConnect(nodeB.type, nodeA.type))) {
    alert(`${getNodeTypeName(nodeA.type)} and ${getNodeTypeName(nodeB.type)} cannot be connected.`);
    return;
  }

  const newEdge = {
    nodeA,
    nodeB,
    direction: 'LR',
    accessible: true,
    closed: false,
    aToB: true,
    bToA: true,
  };
  fixEdgeNodeAssignments(newEdge);
  floors[floor].edges.push(newEdge);
  return newEdge
}

/**
 * Assign nodes in an edge such that the one which comes first alphabetically is Node A.
 *
 * @param {object} edge edge to fix node assignments for
 */
function fixEdgeNodeAssignments(edge) {
  if (getNodeName(edge.nodeA).localeCompare(getNodeName(edge.nodeB)) > 0) {
    let temp = edge.nodeA;
    edge.nodeA = edge.nodeB;
    edge.nodeB = temp;
  }

  if (edge.nodeA.bid === '' && edge.nodeB.bid !== '') {
    const temp = edge.nodeA;
    edge.nodeA = edge.nodeB;
    edge.nodeB = temp;
  }
}

/**
 * Checks if an edge's Node A or Node B are a certain node.
 *
 * @param {object} edge the edge to look at
 * @param {object} node the node to look for
 */
function edgeContainsNode(edge, node) {
  return (edge.nodeA === node || edge.nodeB === node);
}

/**
 * Get the distance between two points.
 *
 * @param {number} x1 x location of first point
 * @param {number} y1 y location of first point
 * @param {number} x2 x location of second point
 * @param {number} y2 y location of second point
 */
function distanceBetweenPoints(x1, y1, x2, y2) {
  return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
}

/**
 * Get the distance between a point and an edge.
 *
 * @param {number} x    x location to get distance from
 * @param {number} y    y location to get distance from
 * @param {object} edge edge to find distance to
 */
function distanceToEdge(x, y, edge) {
  const p = { x, y };
  const v = { x: edge.nodeA.x, y: edge.nodeA.y };
  const w = { x: edge.nodeB.x, y: edge.nodeB.y };
  const l2 = Math.pow(v.x - w.x, 2) + Math.pow(v.y - w.y, 2);
  if (l2 == 0) {
    return distanceBetweenPoints(p.x, p.y, v.x, v.y);
  }

  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return distanceBetweenPoints(p.x, p.y, v.x + t * (w.x - v.x), v.y + t * (w.y - v.y));
}

/************************************************
 * PROPERTIES
 ************************************************/

/**
 * Sets the image of the floor.
 *
 * @param {number} floor  the floor to set the image path of
 * @param {string} name   name of the image
 * @param {any}    img    image
 * @param {number} width  image width
 * @param {number} height image height
 */
function setFloorImage(floor, name, img, width, height) {
  floors[floor].imgWidth = width;
  floors[floor].imgHeight = height;
  floors[floor].imgName = name
  floors[floor].img = img;
}

/**
 * Updates the floor list based on user input.
 */
function handleFloorChange() {
  const id = $(this).attr('id');
  const floor = parseInt(id.substr(id.lastIndexOf('-') + 1));

  if (/delete/g.test(id)) {
    if (floors.length === 1) {
      alert('You cannot delete the last floor');
      return;
    }

    floors.splice(floor, 1);
    if (currentFloor >= floors.length) {
      currentFloor = floors.length - 1;
    }
  } else if (/down/g.test(id)) {
    const floorMovingDown = floors[floor];
    floors[floor] = floors[floor + 1];
    floors[floor + 1] = floorMovingDown;
    if (currentFloor === floor ) {
      currentFloor = floor + 1;
    }
  } else if (/up/g.test(id)) {
    const floorMovingUp = floors[floor];
    floors[floor] = floors[floor - 1];
    floors[floor - 1] = floorMovingUp;
    if (currentFloor === floor ) {
      currentFloor = floor - 1;
    }
  } else if (/add/g.test(id)) {
    addNewFloor('New floor');
  } else if (/select/g.test(id)) {
    currentFloor = floor;
    resetToBaseMenu();
    redraw();
  }

  $('#base-floor').val(floors[currentFloor].name);
  updateFloorList();
}

/**
 * Updates the list of floors displayed to the user.
 */
function updateFloorList() {
  const floorListElem = $('#base-floors');
  floorListElem.empty();
  for (let i = 0; i < floors.length; i++) {
    const floorElem = $(`<li class="prop-list-item${i === currentFloor ? " selected-floor" : ""}"><p class="floor-change" id="floor-select-${i}">(${i + 1}) ${floors[i].name}</p></li>`);
    if (i > 0) {
      floorElem.append(`<i class="material-icons md-dark md-24 floor-change" id="floor-up-${i}">arrow_upward</i>`);
    }
    if (i < floors.length - 1) {
      floorElem.append(`<i class="material-icons md-dark md-24 floor-change" id="floor-down-${i}">arrow_downward</i>`);
    }
    floorElem.append(`<i class="material-icons md-red md-24 floor-change" id="floor-delete-${i}">close</i>`);
    floorListElem.append(floorElem);
  }

  floorListElem.append('<li class="prop-list-item floor-change" id="floor-add">Add new floor</p></li>');
}

/**
 * Updates the node list based on user input.
 */
function handleNodeChange() {
  const id = $(this).attr('id');
  const floor = floors[currentFloor];
  const nodeIdx = parseInt(id.substr(id.lastIndexOf('-') + 1));
  const node = floor.nodes[nodeIdx];

  if (/delete/g.test(id)) {
    nodes.splice(nodeIdx, 1);
    if (node === selectedNode) {
      selectedNode = null;
      resetToBaseMenu();
    }
  } else if (/select/g.test(id)) {
    selectedNode = node;
    setCurrentMenu(MENU_NODE);
  }

  redraw();
}

/**
 * Updates the list of nodes displayed to the user.
 */
function updateNodeList() {
  const nodeListElem = $('#node-list');
  nodeListElem.empty();
  const floor = floors[currentFloor];
  for (let i = 0; i < floor.nodes.length; i++) {
    const node = floor.nodes[i];
    const nodeElem = $(`<li class="prop-list-item${selectedNode === node ? " selected-node" : ""}"><p class="node-change" id="node=select-${i}">${getNodeDisplayName(node)}</p></li>`);
    nodeElem.append(`<i class="material-icons md-red md-24 node-change" id="node-delete-${i}>close</i>"`);
    nodeListElem.append(nodeElem);
  }
}

/**
 * Forms a display name for the node.
 *
 * @param {object} node node to get name of
 * @returns {string} the name of the node
 */
function getNodeDisplayName(node) {
  return `${getNodeName(node)} (${node.x}, ${node.y})`;
}

/**
 * Forms a name for the node.
 *
 * @param {object} node node to get name of
 * @returns {string} the name of the node
 */
function getNodeName(node) {
  let name = '';
  if (node.bid) {
    name += `B${node.bid.trim()}-`;
  }
  return `${name}${nodeTypeIdentifiers[node.type]}${node.name.trim()}`;
}

/**
 * Calculates the distance between two nodes.
 *
 * @param {object} nodeA first node
 * @param {object} nodeB second node
 * @returns {number} the distance between the nodes
 */
function getDistanceBetweenNodes(nodeA, nodeB) {
  return Math.sqrt(Math.pow(nodeB.x - nodeA.x, 2) + Math.pow(nodeB.y - nodeA.y, 2));
}

/************************************************
 * MENUS
 ************************************************/

/**
 * Clears selection and shows base menu.
 */
function resetToBaseMenu() {
  selectedEdge = null;
  selectedNode = null;
  setCurrentMenu(MENU_BASE);
}

/**
 * Add a floor to the project.
 *
 * @param {string} name name of the new floor
 * @returns {object} the new floor
 */
function addNewFloor(name) {
  const newFloor = {
    name,
    img: null,
    imgName: '',
    nodes: [],
    edges: [],
    imgWidth: -1,
    imgHeight: -1,
  };

  floors.push(newFloor);
  return newFloor;
}

/**
 * Sets the slider values for color input.
 *
 * @param {number} r red color value
 * @param {number} g green color value
 * @param {number} b blue color value
 */
function setNodeTypeColorInput(r, g, b) {
  $('#node-r').val(r);
  $('#node-g').val(g);
  $('#node-b').val(b);
}

/**
 * Sets the color for nodes of a certain type.
 *
 * @param {number} type type to set color for
 * @param {number} r    red color value
 * @param {number} g    green color value
 * @param {number} b    blue color value
 */
function setNodeTypeColor(type, r, g, b) {
  nodeTypeColors[type].r = r;
  nodeTypeColors[type].g = g;
  nodeTypeColors[type].b = b;
  $(`#node-type-${type}`).css({ color: getNodeTypeFillStyle(type) });
  redraw();
}

/**
 * Displays the selected node type and its colors in the sliders.
 */
function updateNodeType() {
  const node = selectedNode;
  if (node == null) {
    return;
  }

  for (let i = 0; i < nodeTypeColors.length; i++) {
    if (node.type === i) {
      $(`#node-type-${i}`).addClass('selected-icon');
    } else {
      $(`#node-type-${i}`).removeClass('selected-icon');
    }
  }

  setNodeTypeColorInput(nodeTypeColors[node.type].r, nodeTypeColors[node.type].g, nodeTypeColors[node.type].b);
}

/**
 * Sets the current menu in the side bar, hides all others.
 */
function setCurrentMenu(menu) {
  currentMenu = menu;
  for (const menu of menus) {
    if (menu === menus[currentMenu]) {
      $(menu).removeClass("hidden-prop");
    } else {
      $(menu).addClass("hidden-prop");
    }
  }

  populateMenu(currentMenu);
}

/**
 * Populates data in the menu.
 *
 * @param {number} menu the menu to populate
 */
function populateMenu(menu) {
  switch (menu) {
    default: /* Base properties */
      const nodeTypeCount = [];
      let edgeCount = { floor: 0, total: 0 };

      for (let i = 0; i < nodeTypeColors.length; i++) {
        nodeTypeCount.push({ floor: 0, total: 0 });
      }

      for (const floor of floors) {
        for (const node of floor.nodes) {
          nodeTypeCount[node.type].total += 1;
          if (floor === floors[currentFloor]) {
            nodeTypeCount[node.type].floor += 1;
          }

        }
        edgeCount.total += floor.edges.length;
        if (floor === floors[currentFloor]) {
          edgeCount.floor = floor.edges.length;
        }
      }

      const nodeCount = { floor: 0, total: 0 };
      for (let i = 0; i < nodeTypeColors.length; i++) {
        const nodeTypeCountElem = $(`#node-count-${i}`);
        nodeTypeCountElem.find('.floor').html(nodeTypeCount[i].floor);
        nodeTypeCountElem.find('.all').html(nodeTypeCount[i].total);
        nodeCount.floor += nodeTypeCount[i].floor;
        nodeCount.total += nodeTypeCount[i].total;
      }

      const nodeCountElem = $('#node-count-total');
      nodeCountElem.find('.floor').html(nodeCount.floor);
      nodeCountElem.find('.all').html(nodeCount.total);

      const edgeCountElem = $('#edge-count');
      edgeCountElem.find('.floor').html(edgeCount.floor);
      edgeCountElem.find('.all').html(edgeCount.total);

      $('#base-floor').val(floors[currentFloor].name);
      $('#base-floor-image').val(floors[currentFloor].imgName);
      updateFloorList();
      break;
    case MENU_NODE: /* Node properties */
      updateNodeList();
      const node = selectedNode;
      if (node != null) {
        updateNodeType();
        $('#node-bid').val(node.bid);
        $('#node-name').val(node.name);
        $('#node-additional').val(node.additional);
        $('#node-x').val(Math.round(node.x));
        $('#node-y').val(Math.round(node.y));
        $('#node-name').focus();
      }
      break;
    case MENU_EDGE: /* Edge properties */
      const edge = selectedEdge;
      if (edge != null) {
        $('#edge-node-a').val(getNodeDisplayName(edge.nodeA));
        $('#edge-node-b').val(getNodeDisplayName(edge.nodeB));
        $('#edge-accessible').prop('checked', edge.accessible);
        $('#edge-closed').prop('checked', edge.closed);
        $('#edge-a-to-b').prop('checked', edge.aToB);
        $('#edge-b-to-a').prop('checked', edge.bToA);
        $('#edge-lr').removeClass('selected-icon');
        $('#edge-ud').removeClass('selected-icon');
        $(`#edge-${edge.direction.toLowerCase()}`).addClass('selected-icon')
      }
      break;
  }
}

/************************************************
 * CANVAS
 ************************************************/

/**
 * Converts a value to the pointer scale.
 *
 * @param {number} val    the value to convert
 * @param {number} offset the offset (x or y)
 * @returns {number} a value converted according to the pointer scale
 */
function convertToPointerScale(val, offset) {
  return (val - offset) / scale;
}

/**
 * Converts a value to the drawing scale.
 *
 * @param {number} val    the value to convert
 * @param {number} offset the offset (x or y)
 * @returns {number} a value converted according to the drawing scale
 */
function convertToDrawingScale(val, offset) {
  return val * scale + offset;
}

/**
 * Handles click on the canvas, based on the current tool
 */
function handleCanvasClick(event) {
  const eventX = convertToPointerScale(event.offsetX, panOffsetX);
  const eventY = convertToPointerScale(event.offsetY, panOffsetY);
  switch(currentTool) {
    default:
      tryToSelectAt(eventX, eventY, currentFloor);
      break;
    case TOOL_PAN:
      break;
    case TOOL_ADD:
      selectedNode = addNewNode(eventX, eventY, currentFloor, mostRecentNodeType);
      attemptToConnectToNearestNode(selectedNode, currentFloor);
      setCurrentMenu(MENU_NODE);
      redraw();
      break;
    case TOOL_REMOVE:
      removeNodeAt(eventX, eventY, currentFloor) || removeEdgeAt(eventX, eventY, currentFloor);
      resetToBaseMenu();
      redraw();
      break;
    case TOOL_EDGE:
      break;
    case TOOL_ZOOM_IN:
      scale = scale * 1.25;
      redraw();
      break;
    case TOOL_ZOOM_OUT:
      scale = scale * 0.75;
      redraw();
      break;
  }
}

/**
 * Handles mouse down events on the canvas.
 *
 * @param {any} event the event
 */
function handleCanvasMouseDown(event) {
  switch (currentTool) {
    case TOOL_PAN:
      panStartOffsetX = panOffsetX;
      panStartOffsetY = panOffsetY;
      panStartX = event.offsetX;
      panStartY = event.offsetY;
      panning = true;
      break;
    case TOOL_EDGE:
      newEdgeX = convertToPointerScale(event.offsetX, panOffsetX);
      newEdgeY = convertToPointerScale(event.offsetY, panOffsetY);
      edgeStartNode = findNearestNode(convertToPointerScale(event.offsetX, panOffsetX), convertToPointerScale(event.offsetY, panOffsetY), currentFloor);
      if (edgeStartNode != null) {
        edgeStartNode = edgeStartNode.node;
      }
      redraw();
      break;
    default: break; // do nothing
  }
}

/**
 * Handles mouse up events on the canvas.
 *
 * @param {any} event the event
 */
function handleCanvasMouseUp(event) {
  switch (currentTool) {
    case TOOL_PAN:
      panning = false;
      break;
    case TOOL_EDGE:
      if (edgeStartNode != null) {
        const floor = floors[currentFloor];
        const startNode = edgeStartNode;
        let endNode = findNearestNode(convertToPointerScale(event.offsetX, panOffsetX), convertToPointerScale(event.offsetY, panOffsetY), currentFloor);
        edgeStartNode = null;

        if (endNode == null) {
          redraw();
          return;
        } else {
          endNode = endNode.node;
        }

        // Check to make sure the edge is unique
        for (const edge of floor.edges) {
          if (edgeContainsNode(edge, startNode) && edgeContainsNode(edge, endNode)) {
            redraw();
            return;
          }
        }

        selectedEdge = addNewEdge(startNode, endNode, currentFloor);
        setCurrentMenu(MENU_EDGE);
        redraw();
      }
      break;
    default: break; // do nothing
  }
}

/**
 * Handles mouse movement events on the canvas.
 *
 * @param {any} event the event
 */
function handleCanvasMouseMove(event) {
  switch (currentTool) {
    case TOOL_PAN:
      if (panning) {
        panOffsetX = panStartOffsetX + (event.offsetX - panStartX);
        panOffsetY = panStartOffsetY + (event.offsetY - panStartY);
        redraw();
      }
      break;
    case TOOL_EDGE:
      selectedNode = null;
      if (edgeStartNode != null) {
        newEdgeX = convertToPointerScale(event.offsetX, panOffsetX);
        newEdgeY = convertToPointerScale(event.offsetY, panOffsetY);
        redraw();
      }
      break;
    default: break; // do nothing
  }
}

/**
 * Gets the stroke for a node type
 *
 * @param {number} type node type
 * @returns {string} the stroke for the node type
 */
function getNodeTypeStrokeStyle(type) {
  return 'black';
}

/**
 * Gets the fill for a node type
 *
 * @param {number} type node type
 * @returns {string} the fill for a node type
 */
function getNodeTypeFillStyle(type) {
  const color = nodeTypeColors[type];
  return `rgb(${color.r}, ${color.g}, ${color.b})`;
}

/**
 * Clears the canvas and redraws image, nodes ,and edges
 */
function redraw() {
  const floor = floors[currentFloor];
  canvasCtx.clearRect(0, 0, canvasWidth, canvasHeight);
  canvasCtx.font="14px San Francisco";

  canvasCtx.lineWidth = 2;
  canvasCtx.strokeStyle = 'black';
  canvasCtx.beginPath();
  canvasCtx.moveTo(0, convertToDrawingScale(0, panOffsetY));
  canvasCtx.lineTo(canvasWidth, convertToDrawingScale(0, panOffsetY));
  canvasCtx.stroke();

  canvasCtx.beginPath();
  canvasCtx.moveTo(convertToDrawingScale(0, panOffsetX), 0);
  canvasCtx.lineTo(convertToDrawingScale(0, panOffsetX), canvasHeight);
  canvasCtx.stroke();

  if (floor.img) {
    let imgDrawWidth = floor.imgWidth;
    let imgDrawHeight = floor.imgHeight;
    const widthDiff = BASE_CANVAS_WIDTH - floor.imgWidth;
    const heightDiff = BASE_CANVAS_HEIGHT - floor.imgHeight;
    const widthIsMaxDiff = Math.max(widthDiff, heightDiff) === widthDiff;
    if (widthIsMaxDiff) {
      imgDrawHeight = BASE_CANVAS_HEIGHT;
      imgDrawWidth = BASE_CANVAS_HEIGHT * (floor.imgWidth / floor.imgHeight);
    } else {
      imgDrawWidth = BASE_CANVAS_WIDTH;
      imgDrawHeight = BASE_CANVAS_WIDTH * (floor.imgHeight / floor.imgWidth);
    }
    canvasCtx.drawImage(floor.img, convertToDrawingScale(0, panOffsetX), convertToDrawingScale(0, panOffsetY), imgDrawWidth * scale, imgDrawHeight * scale);
  }

  // Draw edges
  canvasCtx.lineWidth = 2;
  for (const edge of floor.edges) {
    if (edge === selectedEdge) {
      continue;
    }

    if (edge.direction === 'LR') {
      canvasCtx.strokeStyle = 'black';
    } else if (edge.direction === 'UD') {
      canvasCtx.strokeStyle = '#8F001A';
    } else {
      throw new Error(`Invalid edge direction. Not 'LR' or 'UD': ${edge.direction}`);
    }

    canvasCtx.beginPath();
    canvasCtx.moveTo(convertToDrawingScale(edge.nodeA.x, panOffsetX), convertToDrawingScale(edge.nodeA.y, panOffsetY));
    canvasCtx.lineTo(convertToDrawingScale(edge.nodeB.x, panOffsetX), convertToDrawingScale(edge.nodeB.y, panOffsetY));
    canvasCtx.stroke();
  }

  // Draw nodes
  for (const node of floor.nodes) {
    canvasCtx.strokeStyle = getNodeTypeStrokeStyle(node.type);
    canvasCtx.fillStyle = node.type === NODE_TYPE_ROOM && node.name === '' ? 'black' : getNodeTypeFillStyle(node.type);
    canvasCtx.beginPath();
    canvasCtx.ellipse(convertToDrawingScale(node.x, panOffsetX), convertToDrawingScale(node.y, panOffsetY), nodeSize, nodeSize, 0, 0, 2 * Math.PI);
    canvasCtx.stroke();
    canvasCtx.fill();
  }

  canvasCtx.lineWidth = 2;
  canvasCtx.strokeStyle = 'blue';

  // Draw selected node
  if (selectedNode != null) {
    canvasCtx.beginPath();
    canvasCtx.ellipse(convertToDrawingScale(selectedNode.x, panOffsetX), convertToDrawingScale(selectedNode.y, panOffsetY), nodeSize * 2, nodeSize * 2, 0, 0, 2 * Math.PI);
    canvasCtx.stroke();
  }

   // Draw selected edge
  if (selectedEdge != null) {
    canvasCtx.lineWidth = 4;
    canvasCtx.strokeStyle = 'blue';
    canvasCtx.beginPath();
    canvasCtx.moveTo(convertToDrawingScale(selectedEdge.nodeA.x, panOffsetX), convertToDrawingScale(selectedEdge.nodeA.y, panOffsetY));
    canvasCtx.lineTo(convertToDrawingScale(selectedEdge.nodeB.x, panOffsetX), convertToDrawingScale(selectedEdge.nodeB.y, panOffsetY));
    canvasCtx.stroke();

    canvasCtx.lineWidth = 2;
    canvasCtx.beginPath();
    canvasCtx.ellipse(convertToDrawingScale(selectedEdge.nodeA.x, panOffsetX), convertToDrawingScale(selectedEdge.nodeA.y, panOffsetY), nodeSize * 2, nodeSize * 2, 0, 0, 2 * Math.PI);
    canvasCtx.stroke();
    canvasCtx.beginPath();
    canvasCtx.ellipse(convertToDrawingScale(selectedEdge.nodeB.x, panOffsetX), convertToDrawingScale(selectedEdge.nodeB.y, panOffsetY), nodeSize * 2, nodeSize * 2, 0, 0, 2 * Math.PI);
    canvasCtx.stroke();

    canvasCtx.fillStyle = 'black';
    canvasCtx.fillText(getNodeDisplayName(selectedEdge.nodeA), convertToDrawingScale(selectedEdge.nodeA.x, panOffsetX) + 10, convertToDrawingScale(selectedEdge.nodeA.y, panOffsetY) - 10);
    canvasCtx.fillText(getNodeDisplayName(selectedEdge.nodeB), convertToDrawingScale(selectedEdge.nodeB.x, panOffsetX) + 10, convertToDrawingScale(selectedEdge.nodeB.y, panOffsetY) - 10);
  }

  // Draw edge being created
  if (edgeStartNode != null) {
    canvasCtx.strokeStyle = 'red';
    canvasCtx.lineWidth = 2;
    canvasCtx.beginPath();
    canvasCtx.ellipse(convertToDrawingScale(edgeStartNode.x, panOffsetX), convertToDrawingScale(edgeStartNode.y, panOffsetY), nodeSize * 2, nodeSize * 2, 0, 0, 2 * Math.PI);
    canvasCtx.stroke();

    canvasCtx.lineWidth = 4;
    canvasCtx.strokeStyle = 'green';
    canvasCtx.beginPath();
    canvasCtx.moveTo(convertToDrawingScale(edgeStartNode.x, panOffsetX), convertToDrawingScale(edgeStartNode.y, panOffsetY));
    canvasCtx.lineTo(convertToDrawingScale(newEdgeX, panOffsetX), convertToDrawingScale(newEdgeY, panOffsetY));
    canvasCtx.stroke();
  }
}

/**
 * Handle when the window is resized by resizing the canvases accordingly.
 */
function handleResize() {
  canvasWidth = document.body.clientWidth - PROPERTIES_PANEL_WIDTH;
  canvasHeight = document.body.clientHeight;
  canvas.css('width', `${canvasWidth}px`)
      .css('height', `${canvasHeight}px`)
      .attr('width', `${canvasWidth}px`)
      .attr('height', `${canvasHeight}px`);
  redraw();
}

/************************************************
 * GRAPH GENERATOR
 ************************************************/

 /**
 * Find a node with a certain name, or return null.
 *
 * @param {array}  nodes list of nodes
 * @param {string} name  name to find
 * @returns {Node} the found node, or null
 */
 function findNodeByName(nodes, name) {
   for (const node of nodes) {
     if (getNodeName(node) === name) {
       return node;
     }
   }

   return null;
 }

/**
 * Parses a JSON object and set the project properties.
 */
function parseProject(json) {
  selectedEdge = null;
  selectedNode = null;
  edgeStartNode = null;

  if (typeof (json.floors) === 'object') {
    while(floors.length > 0) {
      floors.pop();
    }

    for (const floor of json.floors) {
      for (const edge of floor.edges) {
        edge.nodeA = findNodeByName(floor.nodes, edge.nodeA);
        edge.nodeB = findNodeByName(floor.nodes, edge.nodeB);
        if (!(canNodeTypesConnect(edge.nodeA.type, edge.nodeB.type) && canNodeTypesConnect(edge.nodeB.type, edge.nodeA.type))) {
          throw new Error(`Invalid project provided! ${getNodeTypeName(edge.nodeA.type)} cannot connect to ${getNodeTypeName(edge.nodeB.type)}`)
        }
      }
      floors.push(floor);
    }
  }

  if (typeof (json.nodeTypeColors) === 'object') {
    nodeTypeColors.length = 0;
    for (const color of json.nodeTypeColors) {
      nodeTypeColors.push(color);
    }
  }

  if (typeof (json.nodeSize) === 'number') {
    nodeSize = json.nodeSize;
  }

  if (typeof (json.projectName) === 'string') {
    projectName = json.projectName;
    $('#base-name').val(projectName);
  }

  if (typeof (json.projectFormat) === 'string') {
    projectFormat = json.projectFormat;
    $('#base-format').val(projectFormat);
  }

  clearGeneratedNodeNames();
  currentFloor = 0;
  currentTool = TOOL_PAN;
  highlightCurrentTool();
  resetToBaseMenu();
  redraw();
}

/**
 * Stores the project properties in a JSON object and then converts the object
 * to a string and returns it.
 */
function projectToString() {
  assignAllNodeNames();
  project = { floors, projectName, projectFormat };

  project.floors = JSON.parse(JSON.stringify(project.floors));
  for (const floor of project.floors) {
    floor.img = null;
    for (const edge of floor.edges) {
      if (!(canNodeTypesConnect(edge.nodeA.type, edge.nodeB.type) && canNodeTypesConnect(edge.nodeB.type, edge.nodeA.type))) {
        alert(`Invalid project generated! ${getNodeTypeName(edge.nodeA.type)} cannot connect to ${getNodeTypeName(edge.nodeB.type)}`)
      }
      edge.nodeA = getNodeName(edge.nodeA);
      edge.nodeB = getNodeName(edge.nodeB);
    }
  }

  project.nodeTypeColors = nodeTypeColors;
  project.nodeSize = nodeSize;
  return JSON.stringify(project, null, 2);
}

/**
 * Prompts the user to download the project.
 */
function saveProject() {
  download(`${projectName}.gg`, projectToString());
}

/**
 * Prompts the user to load a project from their local file system.
 */
function loadProject(e) {
  const reader = new FileReader();
  reader.onload = function(event) {
    let json = null;
    try {
      json = JSON.parse(event.target.result);
    } catch (e) {
      alert(`Error parsing file! Error: ${e}`);
      // Failed to parse JSON
      return;
    }

    parseProject(json);
  }

  reader.readAsText(e.target.files[0]);
}

/**
 * Assigns a name to a node if it does not have one.
 *
 * @param {object} node         the node to potentially assign a name to
 * @param {array}  nodeIdCounts number of each node type created
 * @param {object} takenNames
 */
function assignNodeName(node, nodeIdCounts, takenNames) {
  if (node.name === '') {
    let potentialName = '';
    do {
      potentialName = nodeIdCounts[node.type].toString();
      nodeIdCounts[node.type]++;
    } while (takenNames[potentialName] === true);

    node.name = potentialName
    node.assignedName = true;
    takenNames[node.name] = true;
  }
}

/**
 * Assign sequential names to nodes which are missing names.
 */
function assignAllNodeNames() {
  // Get existing names of nodes
  const takenNames = {};
  for (const floor of floors) {
    for (const node of floor.nodes) {
      if (node.name !== '') {
        takenNames[node.name] = true;
      }
    }
  }

  // Assign names to nodes without names
  const nodeNameCounts = [];
  for (const type of nodeTypeColors) {
    nodeNameCounts.push(0);
  }

  for (const floor of floors) {
    for (const node of floor.nodes) {
      assignNodeName(node, nodeNameCounts, takenNames);
    }
  }
}

/**
 * Remove assigned names on nodes on all floors.
 */
function clearGeneratedNodeNames() {
  for (const floor of floors) {
    for (const node of floor.nodes) {
      if (node.assignedName === true) {
        node.name = '';
        node.assignedName = false;
      }
    }
  }
}

/**
 * Generates a file containing data of all the edges in the graph.
 *
 * @param {boolean} shouldDownload false to disable downloading of file
 */
function generateEdgeFile(shouldDownload = true) {
  assignAllNodeNames();

  const adjacencies = {};

  const edges = [];
  for (const floor of floors) {
    for (const edge of floor.edges) {
      fixEdgeNodeAssignments(edge);
      if (!(canNodeTypesConnect(edge.nodeA.type, edge.nodeB.type) && canNodeTypesConnect(edge.nodeB.type, edge.nodeA.type))) {
        alert(`Invalid project generated! ${getNodeTypeName(edge.nodeA.type)} cannot connect to ${getNodeTypeName(edge.nodeB.type)}`)
      }
      edges.push(edge);
    }
  }

  edges.sort((a, b) => {
    const aVsA = getNodeName(a.nodeA).toLowerCase().localeCompare(getNodeName(b.nodeA).toLowerCase());
    if (aVsA === 0) {
      return getNodeName(a.nodeB).toLowerCase().localeCompare(getNodeName(b.nodeB).toLowerCase());
    } else {
      return aVsA;
    }
  });

  for (const edge of edges) {
    const relevantCoord = edge.direction === 'LR' ? 'x' : 'y';
    const aToBDirection = edge.nodeA[relevantCoord] < edge.nodeB[relevantCoord]
        ? edge.direction.charAt(1)
        : edge.direction.charAt(0);
    const bToADirection = aToBDirection === edge.direction.charAt(0)
        ? edge.direction.charAt(0)
        : edge.direction.charAt(1);

    const nameA = getNodeName(edge.nodeA);
    const nameB = getNodeName(edge.nodeB);
    const distance = getDistanceBetweenNodes(edge.nodeA, edge.nodeB);
    const accessible = edge.accessible ? 'T' : 'F';

    if (edge.aToB) {
      if (!(nameA in adjacencies)) {
        adjacencies[nameA] = [];
      }
      adjacencies[nameA].push(`${nameB}:${aToBDirection}:${distance.toFixed(2)}:${accessible}`);
    }
    if (edge.bToA) {
      if (!(nameB in adjacencies)) {
        adjacencies[nameB] = [];
      }
      adjacencies[nameB].push(`${nameA}:${bToADirection}:${distance.toFixed(2)}:${accessible}`);
    }
  }

  let file = ''
  for (const node in adjacencies) {
    if (adjacencies.hasOwnProperty(node)) {
      file += `${node}|${adjacencies[node].join()}\n`;
    }
  }

  if (shouldDownload) {
    download(`${projectName}_edges.txt`, file);
  }

  return file;
}

/**
 * Generates a file containing all of the nodes details.
 *
 * @param {boolean} shouldDownload false to disable downloading of file
 */
function generateNodeFile(shouldDownload = true) {
  assignAllNodeNames();

  const streets = new Map();
  let nodes = {};
  for (const floor of floors) {
    for (const node of floor.nodes){
      switch (node.type) {
        case NODE_TYPE_DOOR:
          if (projectName === 'OUT') {
            nodes[getNodeName(node)] = `${Math.round(node.x)},${Math.round(node.y)}`
          }
          break;
        case NODE_TYPE_INTERSECTION:
        case NODE_TYPE_STREET: {
          const hashedDirections = [];
          const directions = node.additional.split(',');
          for (const direction of directions) {
            const hashedNames = [];
            const names = direction.split(':');
            for (const name of names) {
              if (name.length === 0) {
                continue;
              }

              if (!streets.has(name)) {
                streets.set(name, streets.size);
              }
              hashedNames.push(streets.get(name));
            }
            hashedDirections.push(hashedNames.join(':'));
          }
          nodes[getNodeName(node)] = hashedDirections.join();
          break;
        }
        default:
          break;
      }
    }
  }

  let file = '';
  for (const node in nodes) {
    if (nodes.hasOwnProperty(node)) {
      file += `${node}|${nodes[node]}\n`;
    }
  }

  file += '[STREETS]\n';
  const sortedStreets = Array.from(streets.keys()).sort();
  for (const street of sortedStreets) {
    file += `${streets.get(street)}|${street}\n`;
  }

  if (shouldDownload) {
    download(`${projectName}_nodes.txt`, file);
  }

  return file;
}

/**
 * Generates a file containing all of the excluded edges in the graph.
 *
 * @param {boolean} shouldDownload false to disable downloading of file
 */
function generateExcludedNodesFile(shouldDownload = true) {
  assignAllNodeNames();
  const edges = [];
  for (const floor of floors) {
    for (const edge of floor.edges) {
      fixEdgeNodeAssignments(edge);
      if (edge.closed) {
        edges.push(edge);
      }
    }
  }

  edges.sort((a, b) => {
    const aVsA = getNodeName(a.nodeA).toLowerCase().localeCompare(getNodeName(b.nodeA).toLowerCase());
    if (aVsA === 0) {
      return getNodeName(a.nodeB).toLowerCase().localeCompare(getNodeName(b.nodeB).toLowerCase());
    } else {
      return aVsA;
    }
  });

  let file = ''
  for (const edge of edges) {
    file += `${getNodeName(edge.nodeA)}-${getNodeName(edge.nodeB)}\n`;
  }

  if (shouldDownload) {
    download(`${projectName}_excluded.txt`, file);
  }

  return file;
}

/**
 * Generates all graph details and download.
 */
function generateAllFiles() {
  let file = '';
  file += '[FORMAT]\n';
  file += `${projectFormat}\n`;
  file += '[EDGES]\n';
  file += generateEdgeFile(false);
  file += '[NODES]\n';
  file += generateNodeFile(false);
  file += '[EXCLUDED]\n';
  file += generateExcludedNodesFile(false);
  download(`${projectName}_graph.txt`, file);
}

/************************************************
 * FILE I/O
 ************************************************/

/**
 * Handles a new floor image being set
 *
 * @param {any} e the change event
 */
function handleFloorImage(e) {
  const totalFiles = e.target.files.length;
  for (let i = 0; i < totalFiles; i++) {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = function() {
        if (totalFiles == 1) {
          setFloorImage(currentFloor, e.target.files[i].name, img, this.width, this.height);
          $('#base-floor-image').val(e.target.files[i].name);
          redraw();
        } else {
          if (i < floors.length) {
            setFloorImage(i, e.target.files[i].name, img, this.width, this.height);
          } else {
            addNewFloor(`New floor ${i}`);
            setFloorImage(i, e.target.files[i].name, img, this.width, this.height);
            updateFloorList();
          }

          if (i == currentFloor) {
            $('#base-floor-image').val(e.target.files[i].name);
            redraw();
          }
        }
      }
      img.src = event.target.result;
    }

    if (/image\/(png|jpe?g)/ig.test(e.target.files[i].type)) {
      reader.readAsDataURL(e.target.files[i]);
    } else {
      alert(`You\'ve selected an invalid filetype: ${e.target.files[i].type}`);
    }
  }
}

/**
 * Prompts the user to download a text file.
 *
 * @param {string} filename name of file for download
 * @param {string} text     content of file
 */
function download(filename, text) {
  const pom = document.createElement('a');
  pom.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  pom.setAttribute('download', filename);

  if (document.createEvent) {
    const event = document.createEvent('MouseEvents');
    event.initEvent('click', true, true);
    pom.dispatchEvent(event);
  }
  else {
    pom.click();
  }
}

/************************************************
 * EVENTS
 ************************************************/

// On ready
$(document).ready(function() {
  addNewFloor('First');

  for (let i = 0; i < nodeTypeColors.length; i++) {
    $(`#node-type-${i}`).css({ color: getNodeTypeFillStyle(i) });
  }

  window.addEventListener('keydown', handleKeyPress, false);

  canvas = $('#contentCanvas');
  canvasCtx = document.getElementById('contentCanvas').getContext('2d');
  canvas.click(handleCanvasClick);
  canvas.mousedown(handleCanvasMouseDown);
  canvas.mouseup(handleCanvasMouseUp);
  canvas.mousemove(handleCanvasMouseMove);
  handleResize();

  setCurrentMenu(MENU_BASE);
  highlightCurrentTool();

  $('#toolbar').draggable({ containment: '#toolbar-area' });

  // Handle selecting new tool
  $('.tool').click(function() {
    currentTool = tools.indexOf(`#${$(this).attr('id')}`);
    highlightCurrentTool();
  });

  // Handle user selecting new image
  document.getElementById('floor-image').addEventListener('change', handleFloorImage, false);
  $('.prop-folder').click(function() {
    document.getElementById($(this).attr('for')).click();
  });

  // Update floor name
  $('#base-floor').on('input', (event) => {
    floors[currentFloor].name = event.target.value;
    updateFloorList();
  })

  $('#base-name').on('input', (event) => {
    projectName = event.target.value;
  });

  $('#base-format').on('input', (event) => {
    projectFormat = event.target.value;
  });

  // Altering floors
  $('#base-floors').on('click', '.floor-change', handleFloorChange);

  // Changing edge properties
  $('.edge-direction').click(function() {
    const id = $(this).attr('id');
    const direction = id.substr(id.lastIndexOf('-') + 1);
    selectedEdge.direction = direction.toUpperCase();
    $('#edge-lr').removeClass('selected-icon');
    $('#edge-ud').removeClass('selected-icon');
    $(`#edge-${direction}`).addClass('selected-icon')
  });
  $('#edge-accessible').change(function() {
    const edge = selectedEdge;
    if (edge != null) {
      edge.accessible = this.checked;
    }
  });
  $('#edge-closed').change(function() {
    const edge = selectedEdge;
    if (edge != null) {
      edge.closed = this.checked;
    }
  });
  $('#edge-a-to-b').change(function() {
    const edge = selectedEdge;
    if (edge != null) {
      edge.aToB = this.checked;
    }
  });
  $('#edge-b-to-a').change(function() {
    const edge = selectedEdge;
    if (edge != null) {
      edge.bToA = this.checked;
    }
  });

  // Changing node properties
  $('#node-list').on('click', '.node-change', handleNodeChange);
  $('.node-type').click(function() {
    const id = $(this).attr('id');
    const type = parseInt(id.substr(id.lastIndexOf('-') + 1));
    selectedNode.type = type;
    mostRecentNodeType = type;
    updateNodeType();
    updateNodeList();
    redraw();
  });
  $('.node-color').change(function() {
    setNodeTypeColor(mostRecentNodeType, $('#node-r').val(), $('#node-g').val(), $('#node-b').val());
  });
  $('#node-size').on('input', (event) => {
    nodeSize = event.target.value || DEFAULT_NODE_SIZE;
    if (nodeSize < 0) {
      nodeSize = DEFAULT_NODE_SIZE;
    }
    redraw();
  });
  $('#node-x').on('input', (event) => {
    const node = selectedNode;
    if (node != null) {
      let x = node.x;
      try {
        x = parseFloat(event.target.value || '0');
      } catch (e) {}
      node.x = x;
      updateNodeList();
      redraw();
    }
  });
  $('#node-y').on('input', (event) => {
    const node = selectedNode;
    if (node != null) {
      let y = node.y;
      try {
        y = parseFloat(event.target.value || '0');
      } catch (e) {}
      node.y = y;
      updateNodeList();
      redraw();
    }
  });
  $('#node-bid').on('input', (event) => {
    const node = selectedNode;
    if (node != null) {
      node.bid = event.target.value;
      updateNodeList();
    }
  });
  $('#node-name').on('input', (event) => {
    const node = selectedNode;
    if (node != null) {
      node.name = event.target.value;
      updateNodeList();
    }
  });
  $('#node-additional').on('input', (event) => {
    const node = selectedNode;
    if (node != null) {
      node.additional = event.target.value;
      updateNodeList();
    }
  });

  // Handle user loading project
  document.getElementById('load-project').addEventListener('change', loadProject, false);
  $('#load').click(function() {
    document.getElementById('load-project').click();
  });

  // Import/export
  $('#save').click(saveProject);
  $('#generate-excluded').click(generateExcludedNodesFile);
  $('#generate-edges').click(generateEdgeFile);
  $('#generate-nodes').click(generateNodeFile);
  $('#clear-generated-names').click(clearGeneratedNodeNames);
  $('#generate-all').click(generateAllFiles);
});

// Bind resize function
$(window).bind('resize', handleResize.bind(this));
