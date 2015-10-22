
var defaultErrorMessage = "This site is experiencing some technical difficulties. Please try again later. ";

// map variables
var map, 
	mapProjection = 'EPSG:3857';	// web mercator wgs84
var dragging = false;	// necessary for grab cursor animations

// data & layer variables
var baseLayerArray;
var stations, 
	stationLayer;
// station hover interactions stored globally so it can be removed and reapplied when layer is reloaded
var stationInteraction;
var //countiesGeoserverURL = "http://mapservices.sfei.org/geoserver/ecoatlas/wms/kml?layers=ecoatlas:counties_simplify&mode=download", 
	// due to cross-origin request we'll use locally stored file for now
	countiesGeoserverURL = "data/counties.kml", 
	countiesLayer;

var defaultQuery = {
		species: 'highest', 
		parameter: 'Mercury',
		startYear: 2007,
		endYear: 2014
	}, 
	lastQuery;

// check browser type - from http://stackoverflow.com/questions/9847580/how-to-detect-safari-chrome-ie-firefox-and-opera-browser
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

function init() {
	// initalize tooltip and dialog
	$("#station-tooltip").hide();
	$("#reset-controls").click(function() {
		updateQuery({query: defaultQuery});
	});
	
	// start by cloning the default query values to the lastQuery
	resetDefaultQuery();
	// populate query options but added parameter so as to skip double loading stations
	updateQuery({
		query: defaultQuery, 
		firstRun: true
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
	// mouse pointer location
	map.addControl(new ol.control.MousePosition({
		coordinateFormat: ol.coordinate.createStringXY(2),
		projection: 'EPSG:4326',
		target: document.getElementById("lat-long-display")
	}));
	// grabbing cursor functionality since it's not default to open layers 3
	$('#map-view').mouseup(function() {
			dragging = false;
			$('#Map').switchClass("grabbing", "grab");
		}).mousedown(function() {
			dragging = true;
			$('#Map').switchClass("grab", "grabbing");
		});
		
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
	// set ESRI satellite to default (adjust select option to match)
	var baseLayers = baseLayerGroup.get("layers");
	baseLayers.item(0).setVisible(false);
	baseLayers.item(1).setVisible(false);
	$("#base-layer-control").val(2);
	map.setLayerGroup(baseLayerGroup);
	
	// load stations from server, on success, add style/functionality
	$.ajax({
		data: defaultQuery, 
		url: "lib/getStations.php",
		dataType: "json",
		success: function(data) {
			loadStationsLayer(data);
			// click interaction (adding this way instead of oi.interaction object means we only need to do once)
			$(map.getViewport()).on('click', function(evt) {
				var pixel = map.getEventPixel(evt.originalEvent);
				map.forEachFeatureAtPixel(pixel, function(feature) {
					if(feature.get("type") === "station") {
						return openStationDetails(feature);
					}
				});
			});
		}, 
		error: function(e) {
			alert(defaultErrorMessage + "(Error Stations)");
		}
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
	map.addLayer(countiesLayer);
}

function resetDefaultQuery() {
	lastQuery = new Array();
	for(var i in defaultQuery) {
		lastQuery[i] = defaultQuery[i];
	}
}

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

function openStationDetails(feature) {
	var details = "<p style='font-size:12px;'>";
	var keys = feature.getKeys();
	for(var k = 0; k < keys.length; k++) {
		details += keys[k] + ": " + feature.get(keys[k]) + "<br />";
	}
	details += "</p>";
	$('#station-details-dialog')
	  .html(details)
	  .dialog({ 
		  title: feature.get('name'),
		  width: 350
	  });
	return true;
}


function updateQuery(options) {
	if(!options.query) {
		// if no query supplied, use from inputs
		options.query = {
			parameter: $("#parameter-control").val(), 
			species: $("#species-control").val(), 
			startYear: $("#start-year-control").val(), 
			endYear: $("#end-year-control").val()
		};
	}
	if(options.firedBy) {
		// add the change that fired it, if applicable
		options.query.firedBy = options.firedBy;
	}
	// lock interface
	$("#loading-box-container-outer").show();
	
	$.ajax({
		url: "lib/getQuerySelections.php", 
		data: options.query, 
		dataType: "json", 
		success: function(data) {
			console.log(data);
			// update last successful query
			lastQuery = data.query;
			// if first go, populate list but don't load stations (done separately in init)
			if(!options.firstRun) {
				// update stations to match query
				updateStations();
			}
			// change inputs options down hierarchy as necessary depending on what select fired the query
			if(options.firedBy === 'species') {
				updateParametersSelect(data['parameters']);
				updateYearsSelect(data['years']);
			} else if(options.firedBy === 'parameters') {
				updateYearsSelect(data['years']);
			} else {
				// if unknown or undefined firing event, just update everything
				updateSpeciesList();
				updateParametersSelect(data['parameters']);
				updateYearsSelect(data['years']);
			}
		}, 
		error: function(e) {
			console.log(e);
			alert(defaultErrorMessage + "(Error QueryList)");
		}, 
		complete: function() {
			// unlock interface
			$("#species-control").prop('disabled', false);
			$("#parameter-control").prop('disabled', false);
			$("#start-year-control").prop('disabled', false);
			$("#end-year-control").prop('disabled', false);
			$("#loading-box-container-outer").hide();
		}
	});
}

function updateStations() {
	$.ajax({
		data: lastQuery, 
		url: "lib/getStations.php",
		dataType: "json",
		success: function(data) {
			loadStationsLayer(data);
		}, 
		error: function(e) {
			alert(defaultErrorMessage + "(Error Stations)");
		}
	});
}

/** (Re)load stations layers onto the map
 * @param {Array} data - array of the query results */
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
				watertype: data[i].waterType, 
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
		style: createLayerStyle
	});
	stationLayer.setZIndex(2);
	map.addLayer(stationLayer);
	// hover interaction
	if(enableHoverInteractions || featArray.length < 200) {
		stationInteraction = new ol.interaction.Select({
			condition: ol.events.condition.pointerMove, 
			layers: [stationLayer], 
			// hover highlight feature
			style: createHighlightStyle
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