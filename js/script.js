const TOOLBAR_WIDTH = 300;

// List of all canvases
const canvases = [];
// For drawing the background
let backgroundCanvas;
// For drawing the user generated content
let contentCanvas;
// For drawing the toolset
let toolCanvas;

// Width of the canvases
let canvasWidth = 0;
// Height of the canvases
let canvasHeight = 0;

/*
 * TOOLS
 */

function renderToolbar() {

}

/*
 * CONTENT
 */

/*
 * BACKGROUND
 */

/*
 * GENERAL
 */

/**
 * Handle when the window is resized by resizing the canvases accordingly.
 */
function handleResize() {
  canvasWidth = document.body.clientWidth - TOOLBAR_WIDTH;
  canvasHeight = document.body.clientHeight;

  for (let i = 0; i < canvases.length; i++) {
    canvases[i].css("width", `${canvasWidth}px`);
    canvases[i].css("height", `${canvasHeight}px`);
  }
}

// On ready
$(document).ready(function() {
  // Get references to each canvas and store
  backgroundCanvas = $('#backgroundCanvas');
  contentCanvas = $('#contentCanvas');
  toolCanvas = $('#toolCanvas');

  canvases.push(backgroundCanvas);
  canvases.push(contentCanvas);
  canvases.push(toolCanvas);
  handleResize();

  $("#toolbar").draggable({ containment: "#toolbar-area" });
});

// Bind resize function
$(window).bind("resize", handleResize.bind(this));
