
var speciesList;

var defaultQuery = {
		species: 'highest', 
		contaminant: 'Mercury',
		// query will automatically adjust years to min/max year
		startYear: 1900,
		endYear: new Date().getFullYear()
	}, 
	lastQuery;
	
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
// General controls/ui functions
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
	$("#species-control").change(function() { updateQuery({firedBy: "species"}); });
	$("#contaminant-control").change(function() { updateQuery({firedBy: "contaminant"}); });
	$("#start-year-control").change(function() { updateQuery({firedBy: "startYear"}); });
	$("#end-year-control").change(function() { updateQuery({firedBy: "endYear"}); });
	$("#reset-controls").click(function() {
		updateQuery({query: defaultQuery});
	});
	$("#station-select").change(function() {
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
		.prop('checked', countiesLayer.getVisible())
		.click(function() {
			countiesLayer.setVisible(!countiesLayer.getVisible());
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
}

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
// Query and data update functions
//************************************************************************************************************
function resetDefaultQuery() {
	//lastQuery = Object.assign({}, defaultQuery);
	lastQuery = {};
	for(var v in defaultQuery) {
		if(defaultQuery.hasOwnProperty(v)) {
			lastQuery[v] = defaultQuery[v];
		}
	}
}

function updateQuery(options) {
	if(!options.query) {
		// if no query supplied, use from inputs
		options.query = {
			contaminant: $("#contaminant-control").val(), 
			species: $("#species-control").val(), 
			startYear: parseInt($("#start-year-control").val()), 
			endYear: parseInt($("#end-year-control").val())
		};
	}
	// lock interface
	$("#loading-box-container-outer").show();
	$("#station-select").prop('disabled', true);
	$("#species-control").prop('disabled', true);
	$("#contaminant-control").prop('disabled', true);
	$("#start-year-control").prop('disabled', true);
	$("#end-year-control").prop('disabled', true);
	
	$.ajax({
		url: "lib/getQuery.php", 
		data: options.query, 
		dataType: "json", 
		success: function(data) {
			//console.log(options.query);
			//console.log(data);
			// update last successful query
			lastQuery = data.query;
			// update thresholds
			updateThresholds(data.thresholds);
			// update stations to match query
			loadStationsLayer(data.stations);
			if(options.firstRun) {
				// click interaction 
				// (adding this way instead of oi.interaction object means we only need to do once)
				$(map.getViewport()).on('click', function(evt) {
					var pixel = map.getEventPixel(evt.originalEvent);
					map.forEachFeatureAtPixel(pixel, function(feature) {
						return openStationDetails(feature);
					});
				});
			}
			// change inputs options down hierarchy as necessary depending on what select fired the query
			if(options.firedBy === 'species') {
				updateContaminantsSelect(data.contaminants);
				updateYearsSelect(data.years);
			} else if(options.firedBy === 'contaminants') {
				updateYearsSelect(data.years);
			} else {
				// if unknown or undefined firing event, just update everything
				updateSpeciesList();
				updateContaminantsSelect(data.contaminants);
				updateYearsSelect(data.years);
			}
			updateStationsSelect();
			// flash changes, set zoom to fit new extent
			flashQueryChanges(options.query, options.firstRun);
			if(options.firstRun) {
				zoomToStationsExtent();
			}
		}, 
		error: function(e) {
			alert(defaultErrorMessage + "(Error Query)");
		}, 
		complete: function() {
			// unlock interface
			$("#species-control").prop('disabled', false);
			$("#contaminant-control").prop('disabled', false);
			$("#start-year-control").prop('disabled', false);
			$("#end-year-control").prop('disabled', false);
			$("#station-select").prop('disabled', false);
			$("#loading-box-container-outer").hide();
			// for some reason the trigger doesn't work in the updateStationsSelect() function but works here
			$("#station-select").trigger("chosen:updated");
		}
	});
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