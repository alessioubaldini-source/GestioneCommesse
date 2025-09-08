'use strict';

import * as data from './data.js';
import * as ui from './ui.js';
import * as events from './events.js';

/**
 * Initializes the application.
 * This function loads the data, sets up event listeners, and performs the initial UI update.
 */
function init() {
  data.loadData();
  events.initEventListeners();
  ui.update();
}
// Start the application once the DOM is fully loaded.
document.addEventListener('DOMContentLoaded', init);
