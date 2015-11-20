//************************************************************************************************************
// Variables
//************************************************************************************************************
var speciesList;
var activeControl = null;
var controls = {
	query: {
		name: "query", 
		id: "query-controls",
		element: null,
		tabId: "control-tab-query", 
		tabElement: null
	}, 
	location: {
		name: "station", 
		id: "location-controls",
		element: null,
		tabId: "control-tab-location", 
		tabElement: null
	}, 
	map: {
		name: "map", 
		id: "map-controls",
		element: null,
		tabId: "control-tab-map", 
		tabElement: null
	}
};

//************************************************************************************************************
// General and Utility functions
//************************************************************************************************************
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

function setModalAsLoading(visible, showBackground) {
	var loadingDialog = $("<div id='loading-dialog'></div>")
		.html("<img src='images/ajax-loader.gif' alt='loading' /> Loading stations..");
	setModal(visible, showBackground, loadingDialog);
}

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
function controlsInit() {
	$("#notification-tab").hide();
	// fancify the big select lists (must be done before hiding the elements)
	$("#station-select").chosen();
	$("#species-control").chosen();
	$("#counties-select").chosen();
	// cache the control groups and tabs, hide the groups
	for(var key in controls) {
		if(controls.hasOwnProperty(key)) {
			controls[key].element = $("#"+controls[key].id);
			controls[key].element.hide();
			controls[key].tabElement = $("#"+controls[key].tabId);
		}
	}
	setActiveControl("query");
	// set last query to default
	resetDefaultQuery();
}

// should be called after all data has loaded and first query has fired successfully (thus loading select data)
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
		.change(function() { updateQuery({firedBy: "species"}); });
	$("#contaminant-control")
		.prop('disabled', false)
		.change(function() { updateQuery({firedBy: "contaminant"}); });
	$("#start-year-control")
		.prop('disabled', false)
		.change(function() { updateQuery({firedBy: "startYear"}); });
	$("#end-year-control")
		.prop('disabled', false)
		.change(function() { updateQuery({firedBy: "endYear"}); });
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

function setActiveControl(controlName) {
	if(controls[controlName]) {
		var newControl = controls[controlName];
		if(newControl !== activeControl) {
			if(activeControl) {
				activeControl.element.hide();
			}
			newControl.element.show();
			activeControl = newControl;
			setActiveControlTab();
		}
	}
}

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

function updateContaminantsSelect(data) {
	var optionsHtml = "";
	for(var i = 0; i < data.length; i++) {
		optionsHtml += "<option value=\"" + data[i][0] + "\">" + data[i][0] + "</option>";
	}
	$("#contaminant-control")
		.html(optionsHtml)
		.val(lastQuery.contaminant);
	// check value, if null, just select first available
	if(!$("#contaminant-control").val()) {
		$("#contaminant-control").val(data[0][0]);
	}
}

function updateYearsSelect(data) {
	var optionsHtml = "";
	for(var i = parseInt(data['min']); i <= parseInt(data['max']); i++) {
		optionsHtml += "<option value=\"" + i + "\">" + i + "</option>";
	}
	$("#start-year-control")
		.html(optionsHtml)
		.val(lastQuery.startYear);
	if(!$("#start-year-control").val()) {
		$("#start-year-control").val(toString(data['min']));
	}
	$("#end-year-control")
		.html(optionsHtml)
		.val(lastQuery.endYear);
	if(!$("#end-year-control").val()) {
		$("#end-year-control").val(toString(data['max']));
	}
}

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