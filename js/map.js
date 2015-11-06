
// common function that comes in handy
String.prototype.capitalize = function() {
    return this.replace(/(?:^|\s)\S/g, function(a) { return a.toUpperCase(); });
};

var defaultErrorMessage = "This site is experiencing some technical difficulties. Please try again later. ";

var map,							// openlayers map object
	mapProjection = 'EPSG:3857';	// web mercator wgs84
var wgs84 = 'EPSG:4326';

var baseLayerArray;					// array of loaded baselayers (stored this way for base layers switching)

var stations,						// stations data as ol.Collection instance
	stationLayer, 
	stationInteraction;				// hover interactions stored globally so it can be removed/reapplied
	
var markerFactory;

var //countiesUrl = "http://mapservices.sfei.org/geoserver/ecoatlas/wms/kml?layers=ecoatlas:counties_simplify&mode=download", 
	countiesUrl = "data/ca_counties.geojson", 
	countiesLayer,
	countyNames = [];
	
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
// Initialize functions
//************************************************************************************************************
function init() {
	// init functions
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
	mapInit();
	controlsInit();
	legendInit();
	// active functions -- start by populating query options and loading stations by firing an initial query
	updateQuery({
		query: defaultQuery, 
		firstRun: true	// special option, this will add the click-interaction to features (so just done once)
	});
	controlsActivate();
}

function mapInit() {
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
		.mousedown(function() {
			$('#map-view').switchClass("grab", "grabbing");
		})
		.mouseup(function() {
			$('#map-view').switchClass("grabbing", "grab");
		});
	
	// create base layers in a layer group
	baseLayerArray = [
		new ol.layer.Tile({
			source: new ol.source.XYZ({
				url: "http://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}", 
				attributions: [new ol.Attribution({
					html: "Map tiles provided by <a href='http://ESRI.com/' target='_blank'>ESRI</a>"
				})]
			})
		}), 
		new ol.layer.Tile({
			source: new ol.source.XYZ({
				url: "http://server.arcgisonline.com/arcgis/rest/services/Ocean_Basemap/MapServer/tile/{z}/{y}/{x}", 
				attributions: [new ol.Attribution({
					html: "Map tiles provided by <a href='http://ESRI.com/' target='_blank'>ESRI</a>"
				})]
//				url: "http://a.tile.thunderforest.com/landscape/{z}/{x}/{y}.png", 
//				attributions: [new ol.Attribution({
//					html: "Map tiles by <a href='http://thunderforest.com/' target='_blank'>Thunderforest</a>"
//				})]
			})
		}), 
		new ol.layer.Tile({
			source: new ol.source.XYZ({
				url: "http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", 
				attributions: [new ol.Attribution({
					html: "Map tiles provided by <a href='http://ESRI.com/' target='_blank'>ESRI</a>"
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
	$("#base-layer-control").val(0);
	baseLayers.item(1).setVisible(false);
	baseLayers.item(2).setVisible(false);
	map.setLayerGroup(baseLayerGroup);
	
	// load counties layer
	// Done this way due to async nature of OL3 loading. It doesn't load until set visible (this defaults to 
	// hidden at start), but we need to preload the features to create the counties name list
	$.ajax({
		async: false, 
		dataType: "json", 
		url: countiesUrl, 
		success: function(json) {
			for(var i = 0; i < json.features.length; i++) {
				countyNames.push(json.features[i].properties.NAME);
			}
			countyNames.sort();
			countiesLayer = new ol.layer.Vector({
				title: 'CA Counties', 
				source: new ol.source.Vector({
					features: (new ol.format.GeoJSON())
								.readFeatures(json, {
									// json is technically in NAD83 but right now OL3 only supports WGS84 for datums
									dataProjection: wgs84, 
									featureProjection: mapProjection
								})
				}), 
				style: new ol.style.Style({
					fill: null, 
					stroke: new ol.style.Stroke({
						color: '#222',
						width: 1.5
					})
				})
			});
		}
	});
	countiesLayer.setZIndex(1);
	countiesLayer.setVisible(false);
	map.addLayer(countiesLayer);
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

function openStationDetails(feature) {
	var options = {
		query: lastQuery,
		station: feature
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

function zoomToStation(station) {
	if(station) {
		var coords = station.getGeometry().getCoordinates();
		var view = map.getView();
		view.setCenter(coords);
		view.setZoom(16);
	}
}

function zoomToCountyByName(countyName) {
	if(!countyName || countyName < 0) { return; }
	var counties = countiesLayer.getSource().getFeatures();
	var selected = null;
	for(var i = 0; i < counties.length; i++) {
		if(counties[i].get("NAME").toLowerCase() === countyName) {
			selected = counties[i];
			break;
		}
	}
	if(selected) {
		// if county layer is not on, turn it on
		if(!countiesLayer.getVisible()) {
			countiesLayer.setVisible(true);
			$("#show-counties-control").prop('checked', true);
			flashNotification("CA counties layer turned on", 2000);
		}
		map.getView().fit(selected.getGeometry().getExtent(), map.getSize());
	}
}