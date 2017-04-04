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
let projectName = ''

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
      // Ignore keypresses when a text input is focused
      break;
    default:
      // Hotkeys to switch tools
      const oldTool = currentTool;
      switch (event.keyCode) {
        case 83: case 84: currentTool = TOOL_SELECT; break;
        case 80: case 32: currentTool = TOOL_PAN; break;
        case 78: currentTool = TOOL_ADD; break;
        case 82: currentTool = TOOL_REMOVE; break;
        case 76: currentTool = TOOL_EDGE; break;
        case 187: currentTool = TOOL_ZOOM_IN; break;
        case 189: currentTool = TOOL_ZOOM_OUT; break;
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
  for (let i = 0; i < tools.length; i++) {
    if (i === currentTool) {
      $(tools[i]).addClass('selected-icon');
    } else {
      $(tools[i]).removeClass('selected-icon');
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
    id: '',
    bid: '',
  };
  floors[floor].nodes.push(newNode);
  return newNode;
}

/**
 * Attempts to remove a node from the graph, if there is one at the location.
 *
 * @param {number} x     x location of node to remove
 * @param {number} y     y location of node to remove
 * @param {number} floor floor to remove node from
 */
function removeNodeAt(x, y, floor) {
  const nodes = floors[floor].nodes;
  for (let i = 0; i < nodes.length; i++) {
    if (Math.abs(nodes[i].x - x) <= nodeSize / scale && Math.abs(nodes[i].y - y) <= nodeSize / scale) {
      removeNode(nodes, i, floor);
      return;
    }
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
 * Adds a new edge to the floor
 *
 * @param {object} nodeA starting node of the edge
 * @param {object} nodeB ending node of the edge
 * @param {number} floor the floor the edge is on
 */
function addNewEdge(nodeA, nodeB, floor) {
  const newEdge = {
    nodeA,
    nodeB,
    aToB: '',
    bToA: '',
    accessible: true,
    closed: false,
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

    temp = edge.aToB;
    edge.aToB = edge.bToA;
    edge.bToA = temp;
  }

  if (edge.nodeA.bid === '' && edge.nodeB.bid !== '') {
    const temp = edge.nodeA;
    edge.nodeA = edge.nodeB;
    edge.nodeB = temp;

    temp = edge.aToB;
    edge.aToB = edge.bToA;
    edge.bToA = temp;
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
  return `${node.bid}-${node.type}-${node.id} (${node.x}, ${node.y})`;
}

/**
 * Forms a name for the node.
 *
 * @param {object} node node to get name of
 * @returns {string} the name of the node
 */
function getNodeName(node) {
  return `${node.bid}-${node.type}-${node.id}`;
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
  for (let i = 0; i < menus.length; i++) {
    if (i === currentMenu) {
      $(menus[i]).removeClass("hidden-prop");
    } else {
      $(menus[i]).addClass("hidden-prop");
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

      for (let i = 0; i < floors.length; i++) {
        const nodes = floors[i].nodes;
        for (let j = 0; j < nodes.length; j++) {
          nodeTypeCount[nodes[j].type].total += 1;
          if (i === currentFloor) {
            nodeTypeCount[nodes[j].type].floor += 1;
          }
        }
        edgeCount.total += floors[i].edges.length;
        if (i === currentFloor) {
          edgeCount.floor = floors[i].edges.length;
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
        $('#node-id').val(node.id);
        $('#node-x').val(Math.round(node.x));
        $('#node-y').val(Math.round(node.y));
      }
      break;
    case MENU_EDGE: /* Edge properties */
      const edge = selectedEdge;
      if (edge != null) {
        $('#edge-node-a').val(getNodeDisplayName(edge.nodeA));
        $('#edge-node-b').val(getNodeDisplayName(edge.nodeB));
        $('#a-to-b').val(edge.aToB);
        $('#b-to-a').val(edge.bToA);
        $('#edge-accessible').val(edge.accessible);
        $('#edge-closed').prop('checked', edge.closed);
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
      setCurrentMenu(MENU_NODE);
      redraw();
      break;
    case TOOL_REMOVE:
      removeNodeAt(eventX, eventY, currentFloor);
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
        for (let i = 0; i < floor.edges.length; i++) {
          if (edgeContainsNode(floor.edges[i], startNode) && edgeContainsNode(floor.edges[i], endNode)) {
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
  for (let i = 0; i < floor.edges.length; i++) {
    const edge = floor.edges[i];
    if (edge === selectedEdge) {
      continue;
    }

    if (edge.aToB.length === 0 || edge.bToA.length === 0) {
      canvasCtx.strokeStyle = 'black';
    } else {
      canvasCtx.strokeStyle = '#8F001A';
    }

    canvasCtx.beginPath();
    canvasCtx.moveTo(convertToDrawingScale(edge.nodeA.x, panOffsetX), convertToDrawingScale(edge.nodeA.y, panOffsetY));
    canvasCtx.lineTo(convertToDrawingScale(edge.nodeB.x, panOffsetX), convertToDrawingScale(edge.nodeB.y, panOffsetY));
    canvasCtx.stroke();
  }

  // Draw nodes
  for (let i = 0; i < floor.nodes.length; i++) {
    const node = floor.nodes[i];
    canvasCtx.strokeStyle = getNodeTypeStrokeStyle(node.type);
    canvasCtx.fillStyle = node.type === NODE_TYPE_ROOM && node.id === '' ? 'black' : getNodeTypeFillStyle(node.type);
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

    for (let i = 0; i < json.floors.length; i++) {
      floors.push(json.floors[i]);
    }
  }

  if (typeof (json.nodeTypeColors) === 'object') {
    nodeTypeColors.length = 0;
    for (let i = 0; i < json.nodeTypeColors.length; i++) {
      nodeTypeColors.push(json.nodeTypeColors[i]);
    }
  }

  if (typeof (json.nodeSize) === 'number') {
    nodeSize = json.nodeSize;
  }

  if (typeof (json.projectName) === 'string') {
    projectName = json.projectName;
  }

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
  project = {};
  project.projectName = projectName;
  project.floors = JSON.parse(JSON.stringify(floors));
  for (let i = 0; i < project.floors.length; i++) {
    project.floors[i].img = null;
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
      alert('Error parsing file!');
      // Failed to parse JSON
      return;
    }

    parseProject(json);
  }

  if (/text|javascript/ig.test(e.target.files[0].type)) {
    reader.readAsText(e.target.files[0]);
  } else {
    alert(`You\'ve selected an invalid filetype: ${e.target.files[0].type}`);
  }
}

/**
 * Assigns a name to a node if it does not have one.
 *
 * @param {object} node         the node to potentially assign a name to
 * @param {array}  nodeIdCounts number of each node type created
 */
function assignNodeName(node, nodeIdCounts) {
  if (node.id === '') {
    node.id = nodeIdCounts[node.type].toString();
    nodeIdCounts[node.type]++;
  }
}

/**
 * Generates a file containing data of all the edges in the graph.
 */
function generateGraphFile() {
  const nodeIdCounts = [0, 0, 0, 0, 0];

  const edges = [];
  for (let floorIdx = 0; floorIdx < floors.length; floorIdx++) {
    const floor = floors[floorIdx];
    for (let edgeIdx = 0; edgeIdx < floor.edges.length; edgeIdx++) {
      const edge = floor.edges[edgeIdx];
      assignNodeName(edge.nodeA, nodeIdCounts);
      assignNodeName(edge.nodeB, nodeIdCounts);
      fixEdgeNodeAssignments(edge);
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

  let file = ''
  for (let i = 0; i < edges.length; i++) {
    const nameA = getNodeName(edges[i].nodeA);
    const nameB = getNodeName(edges[i].nodeB);
    const aToB = edges[i].aToB;
    const bToA = edges[i].bToA;
    const accessible = edges[i].accessible ? 'T' : 'F';
    file += `${nameA}|${nameB}|${accessible}|${aToB}|${bToA}|\n`;
  }

  download(`${projectName}.txt`, file);
}

/**
 * Generates a file containing all of the excluded edges in the graph.
 */
function generateExcludedNodesFile() {
  const edges = [];
  for (let floorIdx = 0; floorIdx < floors.length; floorIdx++) {
    const floor = floors[floorIdx];
    for (let edgeIdx = 0; edgeIdx < floor.edges.length; edgeIdx++) {
      const edge = floor.edges[edgeIdx];
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
  for (let i = 0; i < edges.length; i++) {
    file += `${getNodeName(edges[i].nodeA)} ${getNodeName(edges[i].nodeB)}\n`;
  }

  download(`${projectName}_excluded.txt`, file);
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

  // Altering floors
  $('#base-floors').on('click', '.floor-change', handleFloorChange);

  // Changing edge properties
  $('#a-to-b').on('input', (event) => {
    const edge = selectedEdge;
    if (edge != null) {
      edge.aToB = event.target.value;
    }
  })
  $('#b-to-a').on('input', (event) => {
    const edge = selectedEdge;
    if (edge != null) {
      edge.bToA = event.target.value;
    }
  })
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
    // setNodeTypeColor(mostRecentNodeType, $('#node-r').val(), $('#node-g').val(), $('#node-b').val());
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
  $('#node-id').on('input', (event) => {
    const node = selectedNode;
    if (node != null) {
      node.id = event.target.value;
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
  $('#generate-graph').click(generateGraphFile);
});

// Bind resize function
$(window).bind('resize', handleResize.bind(this));
