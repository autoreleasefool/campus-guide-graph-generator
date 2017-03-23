/************************************************
 * CONSTANTS
 ************************************************/

// Width of the properties panel
const PROPERTIES_PANEL_WIDTH = 300;

// Radius of a node
const DEFAULT_NODE_SIZE = 4;

const MENU_BASE = 0;
const MENU_NODE = 1;
const MENU_EDGE = 2;

const TOOL_SELECT = 0;
const TOOL_PAN = 1;
const TOOL_ADD = 2;
const TOOL_REMOVE = 3;
const TOOL_EDGE = 4;
const TOOL_ZOOM_IN = 5;
const TOOL_ZOOM_OUT = 6;

const NODE_TYPE_DOOR = 0;
const NODE_TYPE_STAIRS = 1;
const NODE_TYPE_ELEVATOR = 2;
const NODE_TYPE_HALL = 3;
const NODE_TYPE_ROOM = 4;

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

/************************************************
 * VARIABLES - CANVAS
 ************************************************/

// For drawing the user generated content
let canvas;
// Graphics context for the canvas
let canvasCtx;

// Width of the canvases
let canvasWidth = 0;
// Height of the canvases
let canvasHeight = 0;

let panning = false;
let panStartX = 0;
let panStartY = 0;
let panStartOffsetX = 0;
let panStartOffsetY = 0;
let panOffsetX = 0;
let panOffsetY = 0;

/************************************************
 * TOOLS
 ************************************************/

function handleKeyPress(event) {
  switch (event.target.tagName.toLowerCase()) {
    case "input":
    case "textarea":
      break;
    default:
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
 */
function tryToSelectAt(x, y, floor) {
  selectedNode = null;
  selectedEdge = null;
  let newMenu = null;

  const nodes = floors[floor].nodes;
  for (let i = 0; i < nodes.length; i++) {
    if (Math.abs(nodes[i].x + panOffsetX - x) <= nodeSize && Math.abs(nodes[i].y + panOffsetY - y) <= nodeSize) {
      selectedNode = nodes[i];
      mostRecentNodeType = selectedNode.type;
      newMenu = MENU_NODE;
      break;
    }
  }

  if (selectedNode == null) {
    const edges = floors[floor].edges;
    for (let i = 0; i < edges.length; i++) {}
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
 * @param {number} x           x location of new node
 * @param {number} y           y location of new node
 * @param {number} floor       floor to add new node to
 * @param {number} type        type of new node
 * @param {boolean} withOffset true to add offset to x and y, false to ignore
 */
function addNewNode(x, y, floor, type, withOffset) {
  const newNode = {
    x: x - (withOffset ? panOffsetX : 0),
    y: y  - (withOffset ? panOffsetY : 0),
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
function removeNode(x, y, floor) {
  const nodes = floors[floor].nodes;
  for (let i = 0; i < nodes.length; i++) {
    if (Math.abs(nodes[i].x + panOffsetX - x) <= nodeSize && Math.abs(nodes[i].y + panOffsetY - y) <= nodeSize) {
      nodes.splice(i, 1);
      return;
    }
  }
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
  $('#base-floor-image').val(name);
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

function setNodeTypeColorInput(r, g, b) {
  $('#node-r').val(r);
  $('#node-g').val(g);
  $('#node-b').val(b);
}

function setNodeTypeColor(type, r, g, b) {
  nodeTypeColors[type].r = r;
  nodeTypeColors[type].g = g;
  nodeTypeColors[type].b = b;
  redraw();
}

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
      $('#base-floor').val(floors[currentFloor].name);
      updateFloorList();
      break;
    case MENU_NODE: /* Node properties */
      const node = selectedNode;
      if (node != null) {
        updateNodeType();
        // setNodeTypeColorInput(nodeTypeColors[node.type].r, nodeTypeColors[node.type].g, nodeTypeColors[node.type].b);
        $('#node-bid').val(node.bid);
        $('#node-id').val(node.id);
        $('#node-x').val(Math.round(node.x));
        $('#node-y').val(Math.round(node.y));
      }
      break;
    case MENU_EDGE: /* Edge properties */
      break;
  }
}

/************************************************
 * CANVAS
 ************************************************/

/**
 * Handles click on the canvas, based on the current tool
 */
function handleCanvasClick(event) {
  switch(currentTool) {
    default: // #tool-select
      tryToSelectAt(event.offsetX, event.offsetY, currentFloor);
      break;
    case TOOL_PAN: // #tool-pan
      break;
    case TOOL_ADD: // #tool-add
      selectedNode = addNewNode(event.offsetX, event.offsetY, currentFloor, mostRecentNodeType, true);
      setCurrentMenu(MENU_NODE);
      redraw();
      break;
    case TOOL_REMOVE: // #tool-remove
      removeNode(event.offsetX, event.offsetY, currentFloor);
      resetToBaseMenu();
      redraw();
      break;
    case TOOL_EDGE: // #tool-edge
      break;
    case TOOL_ZOOM_IN: // #tool-zoom-in
      break;
    case TOOL_ZOOM_OUT: // #tool-zoom-out
      break;
  }
}

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
      break;
    default: break; // do nothing
  }
}

function handleCanvasMouseUp(event) {
  switch (currentTool) {
    case TOOL_PAN:
      panning = false;
      break;
    case TOOL_EDGE:
      break;
    default: break; // do nothing
  }
}

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
      break;
    default: break; // do nothing
  }
}

/**
 * Gets the stroke for a node type
 *
 * @param {number} type node type
 */
function getNodeTypeStrokeStyle(type) {
  return 'black';
}

/**
 * Gets the fill for a node type
 *
 * @param {number} type node type
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

  if (floor.img) {
    let imgDrawWidth = floor.imgWidth;
    let imgDrawHeight = floor.imgHeight;
    const widthDiff = canvasWidth - floor.imgWidth;
    const heightDiff = canvasHeight - floor.imgHeight;
    const widthIsMaxDiff = Math.max(widthDiff, heightDiff) === widthDiff;
    if (widthIsMaxDiff) {
      imgDrawHeight = canvasHeight;
      imgDrawWidth = canvasHeight * (floor.imgWidth / floor.imgHeight);
    } else {
      imgDrawWidth = canvasWidth;
      imgDrawHeight = canvasWidth * (floor.imgHeight / floor.imgWidth);
    }
    canvasCtx.drawImage(floor.img, panOffsetX, panOffsetY, imgDrawWidth, imgDrawHeight);
  }

  for (let i = 0; i < floor.nodes.length; i++) {
    const node = floor.nodes[i];
    canvasCtx.strokeStyle = getNodeTypeStrokeStyle(node.type);
    canvasCtx.fillStyle = getNodeTypeFillStyle(node.type);
    canvasCtx.beginPath();
    canvasCtx.ellipse(node.x + panOffsetX, node.y + panOffsetY, nodeSize, nodeSize, 0, 0, 2 * Math.PI);
    canvasCtx.stroke();
    canvasCtx.fill();
  }

  if (selectedNode != null) {
    canvasCtx.strokeStyle = 'blue';
    canvasCtx.beginPath();
    canvasCtx.ellipse(selectedNode.x + panOffsetX, selectedNode.y + panOffsetY, nodeSize * 2, nodeSize * 2, 0, 0, 2 * Math.PI);
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
 * FILE I/O
 ************************************************/

/**
 * Handles a new floor image being set
 *
 * @param {any} e the change event
 */
function handleFloorImage(e) {
  const reader = new FileReader();
  reader.onload = function(event) {
    const img = new Image();
    img.onload = function() {
      setFloorImage(currentFloor, e.target.files[0].name, img, this.width, this.height);
      redraw();
    }
    img.src = event.target.result;
  }

  if (/image\/(png|jpe?g)/ig.test(e.target.files[0].type)) {
    reader.readAsDataURL(e.target.files[0]);
  } else {
    alert(`You\'ve selected an invalid filetype: ${e.target.files[0].type}`);
  }
}

/************************************************
 * EVENTS
 ************************************************/

// On ready
$(document).ready(function() {
  addNewFloor('First');

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

  // Altering floors
  $('#base-floors').on('click', '.floor-change', handleFloorChange);

  // Changing node properties
  $('.node-type').click(function() {
    const id = $(this).attr('id');
    const type = parseInt(id.substr(id.lastIndexOf('-') + 1));
    selectedNode.type = type;
    mostRecentNodeType = type;
    updateNodeType();
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
      redraw();
    }
  });
  $('#node-bid').on('input', (event) => {
    const node = selectedNode;
    if (node != null) {
      node.bid = event.target.value;
    }
  });
  $('#node-id').on('input', (event) => {
    const node = selectedNode;
    if (node != null) {
      node.id = event.target.value;
    }
  });
});

// Bind resize function
$(window).bind('resize', handleResize.bind(this));
