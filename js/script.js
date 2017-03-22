/************************************************
 * CONSTANTS
 ************************************************/

// Width of the properties panel
const PROPERTIES_PANEL_WIDTH = 300;

// Radius of a node
const NODE_SIZE = 4;

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
const floors = [
  {
    name: 'First',
    img: null,
    imgName: '',
    nodes: [],
    edges: [],
  },
];
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

/************************************************
 * TOOLS
 ************************************************/

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
  let selectedNode = null;
  let selectedEdge = null;
  let newMenu = null;

  const nodes = floors[floor].nodes;
  for (let i = 0; i < nodes.length; i++) {
    if (Math.abs(nodes[i].x - x) <= NODE_SIZE && Math.abs(nodes[i].y - y) <= NODE_SIZE) {
      selectedNode = nodes[i];
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
 * @param {number} x     x location of new node
 * @param {number} y     y location of new node
 * @param {number} floor floor to add new node to
 * @param {number} type  type of new node
 */
function addNewNode(x, y, floor, type) {
  const newNode = { x, y, type };
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
    if (Math.abs(nodes[i].x - x) <= NODE_SIZE && Math.abs(nodes[i].y - y) <= NODE_SIZE) {
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
 * @param {number} floor the floor to set the image path of
 * @param {string} name  name of the image
 * @param {any}    img   image
 */
function setFloorImage(floor, name, img) {
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
      currentFloor -= 1;
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
    floors.push({
      name: 'New floor',
      img: null,
      imgName: '',
      nodes: [],
      edges: [],
    });
  } else if (/select/g.test(id)) {
    currentFloor = floor;
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
    case 0: /* Base properties */
      $('#base-floor').val(floors[currentFloor].name);
      updateFloorList();
      break;
    case 1: /* Node properties */
      break;
    case 2: /* Edge properties */
      break;
    default: /* Nothing */
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
    case 1: // #tool-pan
      break;
    case 2: // #tool-add
      selectedNode = addNewNode(event.offsetX, event.offsetY, currentFloor, mostRecentNodeType);
      setCurrentMenu(MENU_NODE);
      redraw();
      break;
    case 3: // #tool-remove
      removeNode(event.offsetX, event.offsetY, currentFloor);
      redraw();
      resetToBaseMenu();
      break;
    case 4: // #tool-edge
      break;
    case 5: // #tool-zoom-in
      break;
    case 6: // #tool-zoom-out
      break;
  }
}

function handleCanvasMouseDown(event) {
  switch (currentTool) {
    case 1:
      break;
    case 4:
      break;
    default: break; // do nothing
  }
}

function handleCanvasMouseUp(event) {
  switch (currentTool) {
    case 1:
      break;
    case 4:
      break;
    default: break; // do nothing
  }
}

function handleCanvasMouseMove(event) {
  switch (currentTool) {
    case 1:
      break;
    case 4:
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
  switch (type) {
    case 0: return 'green';   // Doorway
    case 1: return 'red';     // Staircase
    case 2: return 'yellow';  // Elevator
    case 3: return 'blue';    // Hallway
    default: return 'black';  // Room
  }
}

/**
 * Clears the canvas and redraws image, nodes ,and edges
 */
function redraw() {
  const floor = floors[currentFloor];
  canvasCtx.clearRect(0, 0, canvasWidth, canvasHeight);

  if (floor.img) {
    canvasCtx.drawImage(floor.img, 0, 0);
  }

  for (let i = 0; i < floor.nodes.length; i++) {
    const node = floor.nodes[i];
    canvasCtx.strokeStyle = getNodeTypeStrokeStyle(node.type);
    canvasCtx.fillStyle = getNodeTypeFillStyle(node.type);
    canvasCtx.beginPath();
    canvasCtx.ellipse(node.x, node.y, NODE_SIZE, NODE_SIZE, 0, 0, 2 * Math.PI);
    canvasCtx.stroke();
    canvasCtx.fill();
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
      setFloorImage(currentFloor, e.target.files[0].name, img);
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
});

// Bind resize function
$(window).bind('resize', handleResize.bind(this));
