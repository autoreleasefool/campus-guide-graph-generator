/************************************************
 * VARIABLES
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
let currentTool = 1;

// List of available menus
const menus = [
  "#base-props",
  "#node-props",
  "#edge-props",
];
// Currently shown menu
let currentMenu = 0;

// Width of the properties panel
const PROPERTIES_PANEL_WIDTH = 300;

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

function showCurrentMenu() {
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

function redraw() {
  const floor = currentFloor;
  canvasCtx.clearRect(0, 0, canvasWidth, canvasHeight);

  if (floors[floor].img) {
    canvasCtx.drawImage(floors[floor].img, 0, 0);
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
  handleResize();

  showCurrentMenu();
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
