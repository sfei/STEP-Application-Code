//************************************************************************************************************
// Variables
//************************************************************************************************************
var speciesList;			// list of available species that keeps original capitalization pattern, easier to  
							// use same list that way, but requires you ensure consistency -- i.e. watch for any
							// toLowercase() or toUppercase() conflicts, or at least use a case-insenitive 
							// comparison function.
var activeControl = null;	// The active control (i.e. the visible one), which points to one of the values in 
							// the controls object below.
var controls = {			// Object holding the various control panels and common related variables.
  query: {
		name: 'query', 
		id: 'query-controls',
		element: null,
		tabId: 'control-tab-query', 
		tabElement: null
	}, 
	location: {
		name: 'station', 
		id: 'location-controls',
		element: null,
		tabId: 'control-tab-location', 
		tabElement: null
	}, 
	map: {
		name: 'map', 
		id: 'map-controls',
		element: null,
		tabId: 'control-tab-map', 
		tabElement: null
	}
};
var controlStageVertPadding = 12;
var controlStageMinHeight = 2;

//************************************************************************************************************
// General and Utility functions
//************************************************************************************************************
/**
 * Custom function to create a new window. Has a lot of useful functionality that gets commonly used, e.g. 
 * having every new window centered on the monitor, even accounting for dual monitor setups.
 * @param {event} e - Event object (useful on links where you want to keep the middle-mouse clicks and 
 *    ctrl+left-clicks as new tabs as those are filtered and ignored).
 * @param {string} url - Link URL.
 * @param {string} name - New window name.
 * @param {number} width - Width in pixels.
 * @param {number} height - Height in pixels.
 * @param {boolean} minimal - If true forces hiding of menubar, statusbar, and location (although with many 
 *    modern browsers this has no effect).
 * @returns {Window} The new window object.
 */
function newWindow(e, url, name, width, height, minimal) {
	if(!e) e = window.event;
	if(e === undefined || !(e.which === 2 || (e.which === 1 && e.ctrlKey))) {
		// center window, from http://www.xtf.dk/2011/08/center-new-popup-window-even-on.html
		// Fixes dual-screen position                         Most browsers      Firefox
		var dualScreenLeft = window.screenLeft != undefined ? window.screenLeft : screen.left;
		var dualScreenTop = window.screenTop != undefined ? window.screenTop : screen.top;
		var winWidth = window.innerWidth ? window.innerWidth : document.documentElement.clientWidth ? document.documentElement.clientWidth : screen.width;
		var winHeight = window.innerHeight ? window.innerHeight : document.documentElement.clientHeight ? document.documentElement.clientHeight : screen.height;
		var left = ((winWidth / 2) - (width / 2)) + dualScreenLeft;
		var top = ((winHeight / 2) - (height / 2)) + dualScreenTop;
		var options = "width=" + width + ", height=" + height + ", left=" + left + ", top=" + top;
		if(minimal) {
			options += ", scrollbars=yes, menubar=no, statusbar=no, location=no";
		} else {
			options += ", scrollbars=yes, menubar=yes, statusbar=yes, location=yes";
		}
		var newWin = window.open(url, '', options);
		if(!newWin || newWin.closed || typeof newWin.closed === 'undefined') {
			alert("Could not open new window, to view '" + name + "' allow an exception for this domain in your pop-up blocker's settings.");
			return null;
		} else {
			if(newWin) { newWin.focus(); }
			return newWin;
		}
	}
}

/**
 * Create (or destroy) a modal dialog with a default loading message (in this case: "Loading stations..").
 * @param {boolean} visible - True creates, false removes.
 * @param {boolean} showBackground - Whether to hve a semi-transparent div over the background (so as to 
 *    visually signify the modal status). Keep in mind in older browsers that don't support transparency it'll
 *    just grey out the entire background.
 */
function setModalAsLoading(visible, showBackground) {
	var loadingDialog = $("<div id='loading-dialog'></div>")
		.html("<img src='images/ajax-loader.gif' alt='loading' /> Loading stations..");
	setModal(visible, showBackground, loadingDialog);
}

/**
 * Create (or destroy) a modal dialog.
 * @param {boolean} visible - True creates, false removes.
 * @param {boolean} showBackground - Whether to hve a semi-transparent div over the background (so as to 
 *    visually signify the modal status). Keep in mind in older browsers that don't support transparency it'll
 *    just grey out the entire background.
 * @param {string} content - The HTML content of the modal dialog.
 */
function setModal(visible, showBackground, content) {
	var modalContainer = $("#modal-container-outer");
	if(!visible) {
		modalContainer.hide();
	} else {
		modalContainer.find("#modal-container-inner").html(content);
		modalContainer
			.css('background-color', showBackground ? 'rgba(200, 200, 200, 0.4)' : 'transparent')
			.show();
	}
}
	
//************************************************************************************************************
// Init and activate functions
//************************************************************************************************************
/**
 * Initialize map controls. However, it does not activate them as you may want to wait until the rest of the 
 * application has loaded. Thus follow up with {@link #controlsActivate()} when ready.
 */
function controlsInit() {
	$("#notification-tab").hide();
	// make everything fancy!
	$("#species-control").chosen();
	$("#contaminant-control").chosen();
	$("#start-year-control").chosen();
	$("#end-year-control").chosen();
	$("#station-select").chosen();
	$("#counties-select").chosen();
	// cache the control groups and tabs, hide the groups
	for(var key in controls) {
		if(controls.hasOwnProperty(key)) {
			controls[key].element = $("#"+controls[key].id);
			controls[key].element.hide();
			controls[key].tabElement = $("#"+controls[key].tabId);
		}
	}
	setActiveControl(null);
	// set last query to default
	resetDefaultQuery();
}

/**
 * Actives the controls. Should be called after all data has loaded and first query has fired successfully 
 * (thus loading select data).
 * @see {@link controlsInit()}
 */
function controlsActivate() {
	// add tabs event listeners
	for(var key in controls) {
		if(controls.hasOwnProperty(key)) {
			controls[key].tabElement.on('click', setActiveControl.bind(this, key));
		}
	}
	// add query controls event listeners
	$("#species-control")
		.prop('disabled', false)
		.change(function() { updateQuery({firedBy: "species"}); })
		.trigger('chosen:updated');
	$("#contaminant-control")
		.prop('disabled', false)
		.change(function() { updateQuery({firedBy: "contaminant"}); })
		.trigger('chosen:updated');
	$("#start-year-control")
		.prop('disabled', false)
		.change(function() { updateQuery({firedBy: "startYear"}); })
		.trigger('chosen:updated');
	$("#end-year-control")
		.prop('disabled', false)
		.change(function() { updateQuery({firedBy: "endYear"}); })
		.trigger('chosen:updated');
	$("#reset-controls")
		.prop('disabled', false)
		.click(function() {
			updateQuery({query: defaultQuery});
		});
	$("#station-select")
		.prop('disabled', false)
		.change(function() {
			var selectVal = parseInt($("#station-select").val());
			if(selectVal >= 0) {
				var station = stations.getArray()[selectVal];
				zoomToStation(station);
				openStationDetails(station);
				$("#station-select").find('option:first-child')
				  .prop('selected', true)
				  .end().trigger('chosen:updated');
			}
		});
	$("#show-counties-control")
		.prop('disabled', false)
		.prop('checked', countiesLayer.getVisible())
		.click(function() {
			countiesLayer.setVisible(!countiesLayer.getVisible());
			// if turning off, reset any selected county
			if(!countiesLayer.getVisible()) {
				selectedCounty = null;
				countiesLayer.changed();
			}
		});
	$("#show-mpa-control")
		.prop('disabled', false)
		.prop('checked', mpaLayer.getVisible())
		.click(function() {
			mpaLayer.setVisible(!mpaLayer.getVisible());
		});
	// fill counties select
	var countiesSelect = $("#counties-select");
	countiesSelect.html("<option disabled value=' '></option>");
	for(var i = 0; i < countyNames.length; i++) {
		countiesSelect.append("<option value='" + countyNames[i].toLowerCase() + "'>" + countyNames[i] + "</option>");
	}
	countiesSelect
		.val('')
		.prop('disabled', false)
		.on('change', function() {
			zoomToCountyByName(countiesSelect.val()); 
			countiesSelect.find('option:first-child')
			  .prop('selected', true)
			  .end().trigger('chosen:updated');
		})
		.trigger('chosen:updated');
	// other tab buttons
	$("#zoom-stations-tab").click(function() { zoomToStations(); });
	$("#download-tab").click(function() { showDownloadDialog(); });
}

//************************************************************************************************************
// General UI functions
//************************************************************************************************************
/**
 * Set css to display the proper tab with the active style (and the rest with inactive). Takes no properties. 
 * Is automatically run on switching tabs with {@link #setActiveControl(controlName)} so does not have to be 
 * explicitly called.
 */
function setActiveControlTab() {
	for(var key in controls) {
		if(controls.hasOwnProperty(key)) {
			if(controls[key] === activeControl) {
				controls[key].tabElement
				  .removeClass("control-tab")
				  .addClass("control-tab-active");
			} else {
				controls[key].tabElement
				  .removeClass("control-tab-active")
				  .addClass("control-tab");
			}
		}
	}
};

/**
 * Set active control by the control panel's name.
 * @param {string} controlName - Name of the control to set as active. If no match to any control panel 
 *    specified in global {@link #controls} object, does nothing.
 */
function setActiveControl(controlName) {
	var stageDiv = $("#controls-stage");
	var closing = controlName == null || controlName == undefined || controls[controlName] == activeControl;
	if(closing || controls[controlName]) {
		var newControl = (!closing) ? controls[controlName] : null;
		// get height as either closed or height of the new element
		var oldHeight = stageDiv.height();
		var newHeight = (!closing) ? newControl.element.height() : controlStageMinHeight;
		var padding = (!closing) ? controlStageVertPadding : 0;
		// hide active element
		if(activeControl != null) { activeControl.element.hide(); }
		// animate height change
		stageDiv
			.height(oldHeight)
			.animate(
				{'height': newHeight + 2*padding}, 
				'fast', 
				function() {
					stageDiv.height('auto');
					stageDiv.css('padding', padding+'px 0');
				}
			);
		// also animate moving the zoom control
		$(".ol-zoom").animate({'top': newHeight+60}, 'fast');
		// show new control (or don't if closing)
		if(!closing) {
			newControl.element.show();
			activeControl = newControl;
		} else {
			activeControl = null;
		} 
		// set tabs
		setActiveControlTab();
	}
}

/**
 * Flash the notification tab.
 * @param {string} message - The notification message.
 * @param {number} millis - How long the message stays on screen (not including 700 ms to animation the show 
 *    and hide).
 */
function flashNotification(message, millis) {
	$("#notification-tab")
	  .html(message)
	  .slideDown(200);
	setTimeout(function() {
		$("#notification-tab").slideUp(500);
	}, millis);
}

//************************************************************************************************************
// Query ui and controls
//************************************************************************************************************
/**
 * Check query against the last successful query. Generally this is done after a query, using a copy of the 
 * query object before the query function returns and overwrites the last successful query (which is modified
 * server-side to be valid). Any changes from the query initially specified are flashed in the appropriate 
 * query controls (to signify they had to be modified to return a valid query).
 * @param {Object} query - Query object.
 * @param {boolean} firstRun - If true, inhibits flashing. Obviously used for the first/initial query which 
 *    is not user-specified and done to populate the initial map.
 */
function flashQueryChanges(query, firstRun) {
	// store in list so we can fire them fairly simultaneously
	var elements = [];
	if(query.contaminant !== lastQuery.contaminant) {
		elements.push($("#contaminant-control"));
	}
	if(query.startYear !== lastQuery.startYear) {
		elements.push($("#start-year-control"));
	}
	if(query.endYear !== lastQuery.endYear) {
		elements.push($("#end-year-control"));
	}
	if(elements.length > 0 && !firstRun) {
		// flash select boxes
		elements.forEach(function(el) {
			el.animate({backgroundColor: "#5070aa"}, 200)
				.animate({backgroundColor: "#fff"}, 500);
		});
		// throw an alert
		var msg = "Filters updated to match query results.";
		flashNotification(msg, 3000);
	}
}

/**
 * Updates {@link #speciesList} from server to grab all unique species and the updates the species control. 
 * Strings come in their original values (i.e. not standarized in upper/lower case). Really only needs to be 
 * called once. Asynchronous ajax call.
 */
function updateSpeciesList() {
	$.ajax({
		url: "lib/getAllSpecies.php", 
		dataType: "json", 
		success: function(data) {
			speciesList = data;
			updateSpeciesSelect();
		}, 
		error: function(e) {
			alert(defaultErrorMessage + "(Error SpeciesList)");
		}
	});
}

/**
 * Update the species control (the select list), including adding highest/lowest average options first. Takes 
 * no parameters, instead uses {@link #speciesList} global var to population options. Select values are kept 
 * as is (that is, not upper/lower-cased).
 */
function updateSpeciesSelect() {
	var optionsHtml = "<option value=\"highest\">Species with Highest Avg Concentration</option>"
		+ "<option value=\"lowest\">Species with Lowest Avg Concentration</option>";
	for(var i = 0; i < speciesList.length; i++) {
		optionsHtml += "<option value=\"" + speciesList[i][0] + "\">" + speciesList[i][0] + "</option>";
	}
	$("#species-control")
		.html(optionsHtml)
		.val(lastQuery.species)
		.trigger("chosen:updated");
}

/**
 * Update the contaminants control (the contaminants list).
 * @param {Object[]} data - Query results for the list of contaminants. Expects an array of single-length 
 *    arrays. E.g. [ ['Mercury'], ['DDT'] ] as that's just how the raw SQL query is returned. Select values  
 *    are kept as is (that is, not upper/lower-cased).
 */
function updateContaminantsSelect(data) {
	var optionsHtml = "";
	for(var i = 0; i < data.length; i++) {
		optionsHtml += "<option value=\"" + data[i][0] + "\">" + data[i][0] + "</option>";
	}
	var controlDiv = $("#contaminant-control")
		.html(optionsHtml)
		.val(lastQuery.contaminant);
	// check value, if null, just select first available
	if(!controlDiv.val()) {
		controlDiv.val(data[0][0]);
	}
	controlDiv.trigger('chosen:updated');
}

/**
 * Updates the year controls (start and end year lists).
 * @param {Object[]} data - Query results for the min and max year.
 * @param {number} data[].min - Earliest year with data.
 * @param {number} data[].max - Latest year with data.
 */
function updateYearsSelect(data) {
	var optionsHtml = "";
	for(var i = parseInt(data['min']); i <= parseInt(data['max']); i++) {
		optionsHtml += "<option value=\"" + i + "\">" + i + "</option>";
	}
	var startDiv = $("#start-year-control")
		.html(optionsHtml)
		.val(lastQuery.startYear);
	if(!startDiv.val()) {
		startDiv.val(toString(data['min']));
	}
	startDiv.trigger('chosen:updated');
	var endDiv = $("#end-year-control")
		.html(optionsHtml)
		.val(lastQuery.endYear);
	if(!endDiv.val()) {
		endDiv.val(toString(data['max']));
	}
	endDiv.trigger('chosen:updated');
}

/**
 * Update the stations controls (stations list). Takes no parameters. Uses global {@link #stations} to 
 * populate values. Select values are numeric rather than the station name.
 */
function updateStationsSelect() {
	var optionsHtml = "<option disabled value=' '></option>";
	for(var i = 0; i < stations.getLength(); i++) {
		var stationName = stations.item(i).get("name");
		optionsHtml += "<option value=" + i + ">" + stationName + "</option>";
	}
	$("#station-select")
	  .html(optionsHtml)
	  .val(-1)
	  .trigger("chosen:updated");
}