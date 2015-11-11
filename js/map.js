
//************************************************************************************************************
// Common utility functions
//************************************************************************************************************
String.prototype.capitalize = function() {
    return this.replace(/(?:^|\s)\S/g, function(a) { return a.toUpperCase(); });
};

function newWindow(e, url, name, width, height) {
	if(!e) e = window.event;
	if(e === undefined || !(e.which === 2 || (e.which === 1 && e.ctrlKey))) {
		// center pop up, from http://www.xtf.dk/2011/08/center-new-popup-window-even-on.html
		// Fixes dual-screen position                         Most browsers      Firefox
		var dualScreenLeft = window.screenLeft != undefined ? window.screenLeft : screen.left;
		var dualScreenTop = window.screenTop != undefined ? window.screenTop : screen.top;
		var winWidth = window.innerWidth ? window.innerWidth : document.documentElement.clientWidth ? document.documentElement.clientWidth : screen.width;
		var winHeight = window.innerHeight ? window.innerHeight : document.documentElement.clientHeight ? document.documentElement.clientHeight : screen.height;
		var left = ((winWidth / 2) - (width / 2)) + dualScreenLeft;
		var top = ((winHeight / 2) - (height / 2)) + dualScreenTop;
		var options = "width=" + width + ", height=" + height + ", left=" + left + ", top=" + top + ", scrollbars=yes, menubar=no, statusbar=no, location=no";
		var popup = window.open(url, '', options);
		if(popup) { popup.focus(); }
		return popup;
	}
}

//************************************************************************************************************
// Variables
//************************************************************************************************************
var defaultErrorMessage = "This site is experiencing some technical difficulties. Please try again later. ";
var map,							// openlayers map object
	mapProjection = 'EPSG:3857', 	// web mercator wgs84
	wgs84 = 'EPSG:4326';			// assumed coordinate-system for any incoming data
var stations,						// stations data as ol.Collection instance
	stationLayer, 
	stationInteraction;				// hover interactions stored globally so it can be removed/reapplied
var markerFactory;					// more dynamic handling of creating/assigning styles, as they must be 
									// cached for performance
var countiesUrl = "data/ca_counties.geojson", 
	countiesLayer,
	countyNames = [];				// list of county names (for search drop-down)
var stationDetails = null;			// this object handles the pop-up details

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

//************************************************************************************************************
// Initialize functions
//************************************************************************************************************
function init() {
	// Internet Explorer versioning check (although jQuery alone would have thrown several exceptions by this point)
	if(browserType.isIE) {
		var version = parseInt(navigator.userAgent.toLowerCase().split('msie')[1]);
		// Edge returns NaN value
		if(version && !isNaN(version) && version <= 8) {
			alert("This application is not compatible with Internet Explorer " + version + ", please upgrade your browser.");
			return;
		}
	}
	// add basemap control dynamically (easier to change the basemaps later without changing all related code)
	addBasemapControl($("#base-layer-control-container"), {width: 200});
	// create marker factory
	markerFactory = new MarkerFactory({
		shapeFunction: function(feature) {
			var watertype = feature.get("waterType");
			if(watertype.search(/reservoir|lake/i) >= 0) {
				return markerFactory.shapes.circle;
			} else if(watertype.search(/coast/i) >= 0) {
				return markerFactory.shapes.triangle;
			} else {
				return markerFactory.shapes.diamond;
			}
		}
	});
	// init functions
	mapInit();
	addCountyLayer();
	controlsInit();
	legendInit();
	// activate functions -- start by populating query options and loading stations by firing an initial query
	updateQuery({
		query: defaultQuery, 
		firstRun: true	// special option, this will add the click-interaction to features (so just done once)
	});
	controlsActivate();
	// Technically we can release this variable for garbage collection as once the select dropdown is 
	// populated, it never changes. It was only global to easily pass between scripts
	countyNames = null;
}

function mapInit(baseMapSelect) {
	// create map and view
	map = new ol.Map({ target: "map-view" });
	map.setView(
		new ol.View({
			center: ol.proj.fromLonLat([-119, 38]),
			zoom: 7,
			minZoom: 6,
			maxZoom: 13, // past this zoom, many areas of the ESRI Oceans Basemap have no tiles
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
			$('#map-view').removeClass("grab").addClass("grabbing");
		})
		.mouseup(function() {
			$('#map-view').removeClass("grabbing").addClass("grab");
		});
	// initialize tooltip
	$("<div id='station-tooltip'></div>").appendTo($("#map-view")).hide();
	// add basemaps
	addBasemaps(baseMapSelect);
}

//************************************************************************************************************
// Station layer functionalities
//************************************************************************************************************
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
				name: ((data[i].name) ? data[i].name : data[i].station), // station name can come one of two ways
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

function openStationDetails(feature) {
	var options = {
		query: lastQuery,
		station: feature
	};
	if(!stationDetails) { 
		stationDetails = new StationDetails(options);
	}
	stationDetails.open(options);
	// return true to break out of forEachFeature function in which this is called
	return true;
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

function getStationByName(stationName) {
	// to ease compare, remove any special characters except alphanumeric and spaces, especially since some, 
	// like quotes, are replaced with character codes
	stationName = stationName.replace(/[^A-Za-z0-9\s]/g,'');
	var stationsArray = stations.getArray();
	for(var i = 0; i < stationsArray.length; i++) {
		if(stationsArray[i].get("name").replace(/[^A-Za-z0-9\s]/g,'') === stationName) {
			return stationsArray[i];
		}
	}
	return null;
}

//************************************************************************************************************
// County layer functionalities
//************************************************************************************************************
function addCountyLayer() {
	// Done this way due to async nature of OL3 loading and how it doesn't load until set visible (since layer
	// defaults to hidden at start), but we need to preload the features to create the counties name list.
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