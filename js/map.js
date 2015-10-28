
var defaultErrorMessage = "This site is experiencing some technical difficulties. Please try again later. ";

var map,							// openlayers map object
	mapProjection = 'EPSG:3857';	// web mercator wgs84
var dragging = false;				// necessary for grab cursor animations

var baseLayerArray;					// array of loaded baselayers (stored this way for base layers switching)

var stations,						// stations data as ol.Collection instance
	stationLayer, 
	stationInteraction;				// hover interactions stored globally so it can be removed/reapplied
	
var thresholds;
var markerFactory;

var //countiesGeoserverURL = "http://mapservices.sfei.org/geoserver/ecoatlas/wms/kml?layers=ecoatlas:counties_simplify&mode=download", 
	//countiesGeoserverURL = "http://stepls.sfei.me/ecoatlas/wms/kml?layers=ecoatlas:counties_simplify&mode=download", 
	countiesGeoserverURL = "data/counties.kml", // due to cross-origin request being denied we'll use locally stored file for now
	countiesLayer,
	countiesHidden = true;

var defaultQuery = {
		species: 'highest', 
		contaminant: 'Mercury',
		// query will automatically adjust years to min/max year
		startYear: 1900,
		endYear: new Date().getFullYear()
	}, 
	lastQuery;
	
var stationDetails = null;


//************************************************************************************************************
// Pre-init functions
//************************************************************************************************************
// check browser type - adapted from http://stackoverflow.com/questions/9847580/how-to-detect-safari-chrome-ie-firefox-and-opera-browser
var browserType = {
	isOpera: !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0, 
	isFirefox: typeof InstallTrigger !== 'undefined', 
	isSafari: Object.prototype.toString.call(window.HTMLElement).indexOf('Constructor') > 0, 
	isChrome: !!window.chrome && !this.isOpera, 
	isIE: /*@cc_on!@*/false || !!document.documentMode
};
// only chrome seems to handle hover interactions smoothly for OpenLayers-3
var enableHoverInteractions = browserType.isChrome;

window.onload = init;

//************************************************************************************************************
// Init functions (mostly to do with setting up the map object
//************************************************************************************************************
function init() {
	// initalize tooltip and dialog
	$("#station-tooltip").hide();
	var legend = $("#legend-container").draggable({containment: "parent"});
	legend.mouseup(function(evt) {
			legend.switchClass("grabbing", "grab");
		})
		.mousedown(function(evt) {
			legend.switchClass("grab", "grabbing");
		});
	
	// create map and view
	map = new ol.Map({ target: "map-view" });
	map.setView(
		new ol.View({
			center: ol.proj.fromLonLat([-119, 38]),
			zoom: 7,
			minZoom: 6,
			maxZoom: 14, 
			// map bounds
			extent: ol.proj.transformExtent(
				[-130, 31, -110, 44], 
				'EPSG:4326',
				mapProjection
			)
		})
	);
	// grabbing cursor functionality since it's not default to open layers 3
	$('#map-view')
		.mouseup(function() {
			dragging = false;
			$('#Map').switchClass("grabbing", "grab");
		})
		.mousedown(function() {
			dragging = true;
			$('#Map').switchClass("grab", "grabbing");
		});
	// mouse pointer location (mainly only used for debugging, so currently commented out)
//	map.addControl(new ol.control.MousePosition({
//		coordinateFormat: ol.coordinate.createStringXY(2),
//		projection: 'EPSG:4326',
//		target: document.getElementById("lat-long-display")
//	}));
		
	// create base layers in a layer group
	baseLayerArray = [
		new ol.layer.Tile({
			source: new ol.source.XYZ({
				url: "http://a.tile.thunderforest.com/landscape/{z}/{x}/{y}.png", 
				attributions: [new ol.Attribution({
					html: "Map tiles by <a href='http://thunderforest.com/' target='_blank'>Thunderforest</a>"
				})]
			})
		}), 
		new ol.layer.Tile({
			source: new ol.source.XYZ({
				url: "http://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}", 
				attributions: [new ol.Attribution({
					html: "Map tiles by <a href='http://ESRI.com/' target='_blank'>ESRI</a>"
				})]
			})
		}), 
		new ol.layer.Tile({
			source: new ol.source.XYZ({
				url: "http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", 
				attributions: [new ol.Attribution({
					html: "Map tiles by <a href='http://ESRI.com/' target='_blank'>ESRI</a>"
				})]
			})
		})
	];
	var baseLayerGroup = new ol.layer.Group({
		layers: baseLayerArray
	});
	baseLayerGroup.setZIndex(0);
	// set ESRI topo to default (adjust select option to match)
	var baseLayers = baseLayerGroup.get("layers");
	baseLayers.item(0).setVisible(false);
	baseLayers.item(2).setVisible(false);
	$("#base-layer-control").val(1);
	map.setLayerGroup(baseLayerGroup);
	
	// create marker factory
	markerFactory = new MarkerFactory({
		shapeFunction: function(feature) {
			var watertype = feature.get("waterType");
			if(watertype === "lake_reservoir") {
				return markerFactory.shapes.circle;
			} else if(watertype === "coast") {
				return markerFactory.shapes.triangle;
			} else {
				return markerFactory.shapes.diamond;
			}
		}
	});
	// start by cloning the default query values to the lastQuery
	resetDefaultQuery();
	// populate query options and load stations but firing an initial query
	updateQuery({
		query: defaultQuery, 
		firstRun: true	// special option, this will add the click-interaction to features (so just done once)
	});
	// add controls
	$("#species-control").change(function() { updateQuery({firedBy: "species"}); });
	$("#contaminant-control").change(function() { updateQuery({firedBy: "contaminant"}); });
	$("#start-year-control").change(function() { updateQuery({firedBy: "startYear"}); });
	$("#end-year-control").change(function() { updateQuery({firedBy: "endYear"}); });
	$("#reset-controls").click(function() {
		updateQuery({query: defaultQuery});
	});
	
	// load counties layer
	countiesLayer = new ol.layer.Vector({
		title: 'CA Counties', 
		source: new ol.source.Vector({
			url: countiesGeoserverURL, 
			format: new ol.format.KML({
				extractStyles: false
			})
		}), 
		style: new ol.style.Style({
			image: null, 
			fill: null, 
			stroke: new ol.style.Stroke({
				color: '#222',
				width: 1.5
			})
		})
	});
	countiesLayer.setZIndex(1);
	$("#show-counties-control").click(toggleCountiesLayer);
}


//************************************************************************************************************
// Map controls and functionalities
//************************************************************************************************************
/** Base layers are changed just by comparing to the given index in the base layer group
 * @param {Number} baseLayerIndex */
function changeBaseLayer(baseLayerIndex) {
	if(baseLayerIndex === undefined || baseLayerIndex === null) {
		baseLayerIndex = parseInt($("#base-layer-control").val());
	}
	if(baseLayerIndex < 0 || baseLayerIndex >= baseLayerArray.length) { 
		baseLayerIndex = 0; 
	}
	for(var i = 0; i < baseLayerArray.length; i++) {
		baseLayerArray[i].setVisible(baseLayerIndex === i);
	}
}

function toggleCountiesLayer() {
	if(countiesHidden) {
		map.addLayer(countiesLayer);
	} else {
		map.removeLayer(countiesLayer);
	}
	countiesHidden = !countiesHidden;
}

function openStationDetails(feature) {
//	var details = "<p style='font-size:12px;'>";
//	var keys = feature.getKeys();
//	for(var k = 0; k < keys.length; k++) {
//		details += keys[k] + ": " + feature.get(keys[k]) + "<br />";
//	}
//	details += "</p>";
//	$('#station-details-dialog')
//	  .html(details)
//	  .dialog({ 
//		  title: feature.get('name'),
//		  width: 350
//	  });
	var options = {
		query: lastQuery,
		station: feature.get('name')
	};
	if(!stationDetails) {
		stationDetails = new StationDetails(options);
	} else {
		stationDetails.open(options);
	}
	return true;
}

/** (Re)load stations layers onto the map
 * @param {Array} data Array of the query results */
function loadStationsLayer(data) {
	// remove existing (if applicable)
	if(stationLayer !== null) {
		map.removeLayer(stationLayer);
		map.removeInteraction(stationInteraction);
	}
	// create array of ol.Features from data (since it's not technically geographic)
	var featArray = new Array();
	for(var i = 0; i < data.length; i++) {
		featArray.push(
			new ol.Feature({
				geometry: new ol.geom.Point(
					ol.proj.fromLonLat(
						[parseFloat(data[i].long), parseFloat(data[i].lat)], 
						mapProjection
					)
				),
				type: "station", // necessary due to way highlighted features come from "null" layer
				name: data[i].name, 
				waterType: data[i].waterType, 
				value: data[i].value, 
				advisoryName: data[i].advisoryName, 
				advisoryUrl: data[i].advisoryUrl
			})
		);
	}
	stations = new ol.Collection(featArray);
	// load and add features
	stationLayer = new ol.layer.Vector({
		title: 'Stations', 
		source: new ol.source.Vector({
			features: stations
		}), 
		style: function(feature) {
			return markerFactory.createLayerStyle(feature);
		}
	});
	stationLayer.setZIndex(2);
	map.addLayer(stationLayer);
	// hover interaction
	if(enableHoverInteractions || featArray.length < 200) {
		stationInteraction = new ol.interaction.Select({
			condition: ol.events.condition.pointerMove, 
			layers: [stationLayer], 
			// hover highlight feature
			style: function(feature) {
				return markerFactory.createHighlightStyle(feature);
			}
		});
		// hover tooltip
		stationInteraction.on("select", function(evt) {
			if(!dragging) {
				var features = evt.selected;
				if(features[0]) {
					$("#map-view").css("cursor", "pointer");
					$("#station-tooltip").html(features[0].get("name"))
					  .css({
						top: evt.mapBrowserEvent.pixel[1]-10,
						left: evt.mapBrowserEvent.pixel[0]+15
					  }).show();
				} else {
					$("#map-view").css("cursor", "");
					$("#station-tooltip").hide();
				}
			}
		});
		map.addInteraction(stationInteraction);
	}
}

function zoomToStationsExtent() {
	var extent = stationLayer.getSource().getExtent();
	if(extent && isFinite(extent[0]) && isFinite(extent[1]) && isFinite(extent[2]) && isFinite(extent[3])) {
		map.getView().fit(extent, map.getSize());
	}
}

// mainly only used for debugging
function hideRandomFeatures(layer) {
	var featureSource = layer.getSource();
	if(featureSource.getState() === 'ready') {
		var features = featureSource.getFeatures();
		for(var i = 0; i < features.length; i++) {
			if(Math.random() > 0.5) {
				features[i].setStyle(nullStyle);
			}
		}
	}
}

// mainly only used for debugging
function moveAllPoints(layer, deltax, deltay) {
	var featureSource = layer.getSource();
	if(featureSource.getState() === 'ready') {
		var features = featureSource.getFeatures();
		for(var i = 0; i < features.length; i++) {
			features[i].getGeometry().translate(deltax, deltay);
			features[i].setStyle(createLayerStyle(features[i])[0]);
		}
	}
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
						if(feature.get("type") === "station") {
							return openStationDetails(feature);
						}
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
			flashQueryChanges(options.query, options.firstRun);
			zoomToStationsExtent();
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
			$("#loading-box-container-outer").hide();
		}
	});
}

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
		// this was actually getting really annoying so I commented it out
//		var msg = "No data resulted for ";
//		if(query.species === 'highest' || query.species === 'lowest') {
//			msg += "species with " + query.species + " avg concentration of " + query.contaminant; 
//		} else {
//			msg += query.contaminant + " in " + query.species;
//		}
//		msg += " from " + query.startYear + "-" + query.endYear + "\n\n";
//		msg += "Query adjusted to: ";
//		if(lastQuery.species === 'highest' || lastQuery.species === 'lowest') {
//			msg += "species with " + lastQuery.species + " avg concentration of " + lastQuery.contaminant; 
//		} else {
//			msg += lastQuery.contaminant + " in " + lastQuery.species;
//		}
//		msg += " from " + lastQuery.startYear + "-" + lastQuery.endYear + "\n\n";
//		alert(msg);
	}
}

function updateSpeciesList() {
	$.ajax({
		url: "lib/getAllSpecies.php", 
		dataType: "json", 
		success: function(data) {
			updateSpeciesSelect(data);
		}, 
		error: function(e) {
			alert(defaultErrorMessage + "(Error SpeciesList)");
		}
	});
}

function updateSpeciesSelect(data) {
	var optionsHtml = "<option value=\"highest\">Species with Highest Avg Concentration</option>"
		+ "<option value=\"lowest\">Species with Lowest Avg Concentration</option>";
	for(var i = 0; i < data.length; i++) {
		optionsHtml += "<option value=\"" + data[i][0].toLowerCase() + "\">" + data[i][0] + "</option>";
	}
	$("#species-control")
		.html(optionsHtml)
		.val(lastQuery.species.toLowerCase());
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
	// right now just gets list of stations
	var optionsHtml = "<option value=\"-1\" disabled>Select location</option>";
	for(var i = 0; i < stations.getLength(); i++) {
		var stationName = stations.item(i).get("name");
		optionsHtml += "<option value= + i + >" + stationName + "</option>";
	}
	// TODO create stations control
}


//************************************************************************************************************
// Legend and marker style functions (part of them, core of is is in marketFactory.js)
//************************************************************************************************************

function updateThresholds(data, validate) {
	thresholds = data;
	// while it should be encoded properly, ensure proper type conversion
	for(var i = 0; i < thresholds.length; i++) {
		thresholds[i].value = parseFloat(thresholds[i].value);
	}
	// for user inputs thresholds need to validate
	if(validate) {
		var uniqueValues = [];
		thresholds = thresholds
			.filter(function(item) {
				// values must be positive, non-zero
				if(item.value <= 0) { return false; }
				// no duplicate values
				if(uniqueValues.hasOwnProperty(item.value)) { return false; }
				uniqueValues[item.value] = true;
				return;})
			.sort(function(a,b) {
				// ensure ascending order
				return b.value - a.value;
			});
		// remove any comments
		for(var i = 0; i < thresholds.length; i++) {
			thresholds[i].comments = "";
		}
	}
	updateThresholdStyles();
	updateLegend();
}
	
function updateThresholdStyles() {
	var numThresholds = thresholds.length;
	var stretchFactor = 3; // for a nice gradient instead of just solid colors
	// set the style function (see MarkerFactory.js)
	markerFactory.setStyle({
		resolution: numThresholds*stretchFactor,
		valueFunction: function(feature) {
			// calculate color index
			var iColor = 0;
			var value = feature.get("value");
			if(value > thresholds[0].value) {
				for(var i = 0; i < numThresholds; i++) {
					iColor += i;
					if(value > thresholds[i].value) {
						iColor += (value - thresholds[i].value)/thresholds[i].value;
						break;
					}
				}
			}
			iColor /= numThresholds;
			return iColor;
		}
	});
	// get the color values for each threshold
	for(var i = 0; i < numThresholds; i++) {
		thresholds[i].color = markerFactory.hexMap[(1+i)*stretchFactor];
	}
}

function updateLegend() {
	var title;
	var capitalizeSpecies = "<span style='text-transform:capitalize;'>" + lastQuery.species + "</span>";
	if(lastQuery.species === 'highest' || lastQuery.species === 'lowest') {
		title = capitalizeSpecies + " Average " + lastQuery.contaminant + " Concentration for Any Species"; 
	} else {
		title = lastQuery.contaminant + " Concentrations in " + capitalizeSpecies;
	}
	title += " (" + thresholds[0].units + ")";
	var table = $("#legend-table");
	table.html("<div class='legend-table-row' style='text-align:center;font-size:16px;font-weight:bolder;margin:4px 0px;'>" + title + "</div><hr />");
	// do legend in descending order
	for(var i = thresholds.length-1; i >= -1; i--) {
		var row = "<div class='legend-table-row'>";
		var threshold = (i >= 0) ? thresholds[i] : { color:markerFactory.hexMap[0], value:0, units:thresholds[0].units, comments:"None" };
		row += "<div class='legend-table-cell' style='width:26px;clear:left;border-radius:4px;background-color:" + threshold.color + ";'>&nbsp;</div>";
		row += "<div class='legend-table-cell' style='width:70px;margin-right:10px;text-align:right;'>" + ((i === thresholds.length-1) ? "+" : "") + threshold.value + " " + threshold.units + "</div>";
		row += "<div class='legend-table-cell' style='display:table;width:300px;clear:right;'><span style='display:table-cell;vertical-align:middle;line-height:120%;'>" + threshold.comments + "</span></div>";
		row += "</div>";
		table.append(row);
	}
}