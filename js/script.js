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
 */
function tryToSelectAt(x, y, floor) {
  selectedNode = null;
  selectedEdge = null;
  let newMenu = null;

  const nodes = floors[floor].nodes;
  for (let i = 0; i < nodes.length; i++) {
    if (Math.abs(nodes[i].x - x) <= nodeSize / scale && Math.abs(nodes[i].y - y) <= nodeSize / scale) {
      selectedNode = nodes[i];
      mostRecentNodeType = selectedNode.type;
      newMenu = MENU_NODE;
      break;
    }
  }

  if (selectedNode == null) {
    const edges = floors[floor].edges;
    // TODO: select edge
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
function removeNode(x, y, floor) {
  const nodes = floors[floor].nodes;
  for (let i = 0; i < nodes.length; i++) {
    if (Math.abs(nodes[i].x - x) <= nodeSize / scale && Math.abs(nodes[i].y - y) <= nodeSize / scale) {
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
      $('#base-floor').val(floors[currentFloor].name);
      updateFloorList();
      break;
    case MENU_NODE: /* Node properties */
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
      removeNode(eventX, eventY, currentFloor);
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

  canvasCtx.strokeStyle = 'black';
  canvasCtx.beginPath();
  canvasCtx.moveTo(convertToDrawingScale(-canvasWidth / scale, panOffsetX), convertToDrawingScale(0, panOffsetY));
  canvasCtx.lineTo(convertToDrawingScale(canvasWidth / scale, panOffsetX), convertToDrawingScale(0, panOffsetY));
  canvasCtx.stroke();

  canvasCtx.beginPath();
  canvasCtx.moveTo(convertToDrawingScale(0, panOffsetX), convertToDrawingScale(-canvasHeight / scale, panOffsetY));
  canvasCtx.lineTo(convertToDrawingScale(0, panOffsetX), convertToDrawingScale(canvasHeight / scale, panOffsetY));
  canvasCtx.stroke();

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
    canvasCtx.drawImage(floor.img, convertToDrawingScale(0, panOffsetX), convertToDrawingScale(0, panOffsetY), imgDrawWidth * scale, imgDrawHeight * scale);
  }

  for (let i = 0; i < floor.nodes.length; i++) {
    const node = floor.nodes[i];
    canvasCtx.strokeStyle = getNodeTypeStrokeStyle(node.type);
    canvasCtx.fillStyle = getNodeTypeFillStyle(node.type);
    canvasCtx.beginPath();
    canvasCtx.ellipse(convertToDrawingScale(node.x, panOffsetX), convertToDrawingScale(node.y, panOffsetY), nodeSize, nodeSize, 0, 0, 2 * Math.PI);
    canvasCtx.stroke();
    canvasCtx.fill();
  }

  if (selectedNode != null) {
    canvasCtx.strokeStyle = 'blue';
    canvasCtx.beginPath();
    canvasCtx.ellipse(convertToDrawingScale(selectedNode.x, panOffsetX), convertToDrawingScale(selectedNode.y, panOffsetY), nodeSize * 2, nodeSize * 2, 0, 0, 2 * Math.PI);
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
