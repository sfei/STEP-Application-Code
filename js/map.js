
var defaultErrorMessage = "This site is experiencing some technical difficulties. Please try again later. ";
var map,							// openlayers map object
	mapProjection = 'EPSG:3857',	// web mercator wgs84
	wgs84 = 'EPSG:4326',			// assumed coordinate-system for any incoming data
	initZoomLevel = 7;				// init zoom level as zoomToStationsExtent() can be a bit too zoomed out

var hoverInteraction;				// hover interactions stored globally so it can be removed/reapplied
var showNoData = true,				// whether to show no data values on map
	noDataValue = -99,				// no data value (all values <= are considered no data as well)
	noDataColor = null;				// fill color for no data markers
var markerFactory;					// more dynamic handling of creating/assigning styles, as they must be 
									// cached for performance
var colorMap =	[					// the color gradient for symbology
					[210, 255, 255], 
					[60, 100, 255], 
					[95, 0, 180]
				];
var stationsData,					// raw stations data as array of GeoJSON
	stations,						// stations data as ol.Collection instance
	stationLayer;					// layer object
var stationDetails = null;			// this object handles the pop-up details
var countiesUrl = "data/ca_counties.geojson", 
	countiesLayer,					// layer for all counties
	highlightCountiesLayer,			// layer for highlighted county
	countyNames = [],				// list of county names (for search drop-down)
	selectedCounty,					// name of highlighted county
	countyStyle,
	highlightCountyStyle;
var mpaUrl = "data/mpa_ca.geojson",	//"lib/getMPAsAsGeoJSON.php", 
	mpaLayer,						// marine protected areas
	mpaColor = [50, 220, 50, 0.5],	// default MPA color
	mpaStyles;						// array of normal and hover style

//************************************************************************************************************
// Pre-init functions
//************************************************************************************************************
// check browser type - adapted from http://stackoverflow.com/questions/9847580/how-to-detect-safari-chrome-ie-firefox-and-opera-browser
var browserType = {
	isOpera: !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0, 
	isFirefox: typeof InstallTrigger !== 'undefined', 
	isSafari: Object.prototype.toString.call(window.HTMLElement).indexOf('Constructor') > 0, 
	isChrome: !!window.chrome && !this.isOpera, 
	isIE: /*@cc_on!@*/false || !!document.documentMode, 
	ieVersion: 9999
};
// only chrome seems to handle hover interactions smoothly for OpenLayers-3
var enableHoverInteractions = browserType.isChrome;

//************************************************************************************************************
// Initialize functions
//************************************************************************************************************
/**
 * Application init function. Pretty much the only thing the HTML page has to call explicitly. Separated from 
 * mapInit() as sub pages (such as summary report) can override this portion of init while still calling 
 * common mapInit() function.
 */
function init() {
	// Internet Explorer versioning check (although jQuery alone would have thrown several exceptions by this point)
	if(browserType.isIE) {
		browserType.ieVersion = parseInt(navigator.userAgent.toLowerCase().split('msie')[1]);
		if(!browserType.ieVersion) {
			browserType.ieVersion = 9999;
		}
		// Edge returns NaN value
		if(!isNaN(browserType.ieVersion) && browserType.ieVersion <= 8) {
			alert("This application is not compatible with Internet Explorer version 8 or below, please upgrade your browser.");
			return;
		}
	}
	setModalAsLoading(true, false);
	// add basemap control dynamically (easier to change the basemaps later without changing all related code)
	addBasemapControl($("#base-layer-control-container"), {width: 220});
	// create marker factory - value function is not set here, but instead set when updating thresholds (see 
	// legend.js) which is triggered by a query return.
	createMarkerFactory();
	// init functions
	mapInit();
	addCountyLayer();
	addMPALayer();
	initStationsLayer();
	updateStationsSelect();
	controlsInit();
	legendInit($("#step-container"));
	// activate functions -- start by populating query options and loading stations by firing an initial query
	updateQuery({
		query: defaultQuery, 
		firstRun: true	// special option, basically disabled async
	});
	addClickInteractions();
	if(enableHoverInteractions) {
		addHoverInteractions();
	}
	controlsActivate();
	// zoom in a bit to start
	map.getView().setZoom(initZoomLevel);
	// Technically we can release this variable for garbage collection as once the select dropdown is 
	// populated, it never changes. It was only global to easily pass between scripts
	countyNames = null;
}

/**
 * Functions a little more specific to initializing the map. Does not have to be called explicitly, as it is 
 * called from {@link #init()}, but if you have a custom init function, this method can be used to do the 
 * common and less-specific map init. Creates the map object, adds the cursor functionality and a station 
 * tooltip (hidden and no functionality added to it yet), and finally adds the basemap.
 * @param {number} baseMapSelect - Index of basemap to set as active on init. If not specified defaults 0, or 
 *		first base layer on the list. (See basemaps.js)
 */
function mapInit(baseMapSelect) {
	// create map and view
	map = new ol.Map({ target: "map-view" });
	map.setView(
		new ol.View({
			center: ol.proj.fromLonLat([-119, 38]),
			zoom: 7,
			minZoom: 6,
			// past this zoom, many areas of the ESRI Oceans Basemap have no tiles
			maxZoom: 13,
			// map bounds roughly fit to California
			extent: ol.proj.transformExtent(
				[-130, 31, -110, 44], 
				'EPSG:4326',
				mapProjection
			)
		})
	);
	// grabbing cursor functionality since it's not default to open layers 3
	addGrabCursorFunctionality($('#map-view'));
	// initialize tooltip
	$("<div id='station-tooltip'></div>").appendTo($("#map-view")).hide();
	// add basemaps
	addBasemaps(map, baseMapSelect);
}

/**
 * Create the marker factory. Done as sometimes reset with no data color available or not
 */
function createMarkerFactory() {
	markerFactory = new MarkerFactory({
		shapeFunction: function(feature) {
			var watertype = feature.get("waterType");
			if(watertype.search(/reservoir|lake/i) >= 0) {
				return 'circle';
			} else if(watertype.search(/coast/i) >= 0) {
				return 'triangle';
			} else {
				return 'diamond';
			}
		},
		colorMap: colorMap,
		showNoData: showNoData, 
		noDataValue: noDataValue,
		noDataColor: noDataColor
	});
}

//************************************************************************************************************
// Map functions
//************************************************************************************************************

/**
 * Add hover interactions to the map. Specifically adds swapping layers symbols with the highlight style on 
 * hover and the tooltip with the station name. Should be reset on changing any of the affected layers as the 
 * interaction object is linked to the layers it interacts with (thus a new interaction object should be 
 * created if one of the layers is swapped out).
 * <br /><br />
 * Important to note that it uses the "featType" attribute of a feature to differentiate which layer the 
 * feature came from and thus use the appropriate functionality. This is not a default feature attribute, so 
 * on loading any layer, make sure all features have this value set appropriately.
 */
function addHoverInteractions() {
	hoverInteraction = new ol.interaction.Select({
		condition: ol.events.condition.pointerMove, 
		layers: [stationLayer, mpaLayer], 
		style: function(feature) {
			var type = feature.get('featType');
			if(type === 'station') {
				return markerFactory.createHighlightStyle(feature);
			} else if(type === 'mpa') {
				return [mpaStyles[1]];
			}
		}
	});
	// hover tooltip
	hoverInteraction.on("select", function(evt) {
		var features = evt.selected;
		if(features[0]) {
			$("#map-view").css("cursor", "pointer");
			var name = 'unidentified';
			var type = features[0].get('featType');
			if(type === 'station') {
				name = features[0].get('name');
			} else if(type === 'mpa') {
				name = features[0].get('NAME');
			}
			$("#station-tooltip").html(name)
			  .css({
				top: evt.mapBrowserEvent.pixel[1]-10,
				left: evt.mapBrowserEvent.pixel[0]+15
			  }).show();
		} else {
			$("#map-view").css("cursor", "");
			$("#station-tooltip").hide();
		}
	});
	map.addInteraction(hoverInteraction);
}

/**
 * Add click interactions to the map. In this case by opening the station details for stations, and a new 
 * window to the specific catch/take regulations for MPA polygons.
 * <br /><br />
 * Important to note that it uses the "featType" attribute of a feature to differentiate which layer the 
 * feature came from and thus use the appropriate functionality. This is not a default feature attribute, so 
 * on loading any layer, make sure all features have this value set appropriately.
 */
function addClickInteractions() {
	$(map.getViewport()).on('click', function(evt) {
		var pixel = map.getEventPixel(evt.originalEvent);
		map.forEachFeatureAtPixel(
			pixel, 
			function(feature, layer) { 
				// for some reason, checking by layer is buggy (often null, even for valid feature), so check
				// by property which we manually add on layer being loaded
				var type = feature.get('featType');
				if(type === 'station') {
					openStationDetails(feature); 
					return true;	// make sure to return on match to stop cycling through additional features
				} else if(type === 'mpa') {
					newWindow(null, feature.get("DFG_URL"), "Marine Protected Areas: Regulations", 800, 600, false);
					return true;
				}
			}
		);
	});
}

//************************************************************************************************************
// Station layer functionalities
//************************************************************************************************************
/**
 * Create stations layer. By default data does not have to be provided, function will automatically request a 
 * list of all stations from getAllStations.php. However, since those results do not have a value (default no 
 * data value will be set for all points), if you do want to initialize with pre-existing data, it can be 
 * supplied.
 * @param {Object[]} data - Array of the query results. If not provided, it will ajax request a list of all 
 *		stations automatically.
 * @param {string} data[].name - Station name.
 * @param {number} data[].lat - Station latitude.
 * @param {number} data[].long - Station longitude.
 * @param {String} data[].waterType - The station water type.
 * @param {number} data[].value - The contaminant value for this station. (Optional)
 * @param {String} data[].advisoryName - Specific site advisory name, if it exists.
 * @param {String} data[].advisoryUrl - Link to specific site advisory page, if it exists.
 */
function initStationsLayer(data) {
	if(!data) {
		$.ajax({
			async: false,
			url: "lib/getAllStations.php", 
			dataType: "json", 
			success: function(json) {
				data = json;
			},
			failure: function(e) {
				alert(defaultErrorMessage + "(Error Loading Stations)");
			}
		});
	}
	if(data) {
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
					name: (data[i].name) ? data[i].name : data[i].station,
					waterType: data[i].waterType, 
					value: (typeof data[i].value !== "undefined") ? data[i].value : noDataValue, 
					advisoryName: data[i].advisoryName, 
					advisoryUrl: data[i].advisoryUrl, 
					featType: 'station',
					mfStyle: null
				})
			);
		}
		// update stations data
		stationsData = data;
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
		stationLayer.setZIndex(3);
		map.addLayer(stationLayer);
	}
}

/** 
 * Update data for stations
 * @param {Object[]} data - Array of the query results.
 * @param {string} data[].name - Station name.
 * @param {number} data[].lat - Station latitude.
 * @param {number} data[].long - Station longitude.
 * @param {String} data[].waterType - The station water type.
 * @param {number} data[].value - The contaminant value for this station.
 * @param {String} data[].advisoryName - Specific site advisory name, if it exists.
 * @param {String} data[].advisoryUrl - Link to specific site advisory page, if it exists.
 * */
function updateStations(data) {
	// update stations data
	stationsData = data;
	// loop through stations
	stations.forEach(function(feature) {
		//console.log(feature);
		var name = feature.get("name");
		// reset style cache (otherwise it will never change)
		feature.set("mfStyle", null);
		// try and find matching data point. this can probably be optimized rather than straightforward array
		// search. perhaps by forcing results to be alphabetically sorted and using a cut search.
		var matchedResult = null;
		for(var i = 0; i < data.length; i++) {
			if(name === data[i].name) {
				matchedResult = data[i];
				break;
			}
		}
		if(matchedResult) {
			feature.set("value", matchedResult.value);
		} else {
			feature.set("value", noDataValue);
		}
		feature.changed();
	});
}

/**
 * Force refreshing of the stations layer. Usually done after a style change. Hopefully this updates in OL3 
 * soon, right now only way is to force refreshing by deleting/recreating.
 */
function refreshStations() {
	updateStations(stationsData);
	// note for later, a more direct solution you still need to remember to clear 'mfStyle' cache in feature
}

/**
 * Opens the more detailed {@link StationDetails} for the given station.
 * @param {ol.Feature} station - Feature object to option details on.
 */
function openStationDetails(station) {
	var options = {
		query: lastQuery,
		station: station
	};
	if(!stationDetails) { 
		stationDetails = new StationDetails(options);
	}
	stationDetails.open(options);
}

/**
 * Zoom to the extent of the entire stations layer.
 */
function zoomToStations() {
	var extent = stationLayer.getSource().getExtent();
	if(extent && isFinite(extent[0]) && isFinite(extent[1]) && isFinite(extent[2]) && isFinite(extent[3])) {
		map.getView().fit(extent, map.getSize());
	}
}

/**
 * Zoom to a specific station. (Uses zoom level 16, though it can be overruled by max-zoom option in map view)
 * @param {ol.Feature} station - Feature object to zoom to. (Actually can be any point feature.)
 */
function zoomToStation(station) {
	if(station) {
		var coords = station.getGeometry().getCoordinates();
		var view = map.getView();
		view.setCenter(coords);
		view.setZoom(16);	// this will probably be overruled by max-zoom parameter
	}
}

/** 
 * Get the ol.Feature object for a station, by its name. While it is case sensitive, it ignores any non
 * alphanumeric or whitespace character when comparing (as some may be escaped).
 * @param {string} stationName - The station name.
 * @returns {ol.Feature} The feature, or null if no match found.
 */
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
// County and MPA layer functionalities
//************************************************************************************************************
/**
 * Add CA counties layer to the map.
 */
function addCountyLayer() {
	// Done this way due to async nature of OL3 loading and how it doesn't load until set visible (since layer
	// defaults to hidden at start), but we need to preload the features to create the counties name list.
	$.ajax({
		async: false, 
		dataType: "json", 
		url: countiesUrl, 
		success: function(json) {
			countyStyle = [
				new ol.style.Style({
					fill: null, 
					stroke: new ol.style.Stroke({
						color: '#222',
						width: 1.5
					})
				})
			];
			highlightCountyStyle = [
				new ol.style.Style({
					fill: null, 
					stroke: new ol.style.Stroke({
						color: '#f0f',
						width: 2
					})
				})
			];
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
				style: countyStyle
			});
			highlightCountiesLayer = new ol.layer.Vector({
				title: 'CA Counties', 
				source: new ol.source.Vector({
					features: (new ol.format.GeoJSON())
								.readFeatures(json, {
									// json is technically in NAD83 but right now OL3 only supports WGS84 for datums
									dataProjection: wgs84, 
									featureProjection: mapProjection
								})
				}), 
				style: getHighlightCountyStyle
			});
		}
	});
	countiesLayer.setZIndex(1);
	highlightCountiesLayer.setZIndex(2);
	countiesLayer.setVisible(false);
	highlightCountiesLayer.setVisible(false);
	map.addLayer(countiesLayer);
	map.addLayer(highlightCountiesLayer);
}

/**
 * Zoom to the extent of the specific CA county. If the counties layer was not set visible, it will 
 * automatically be turned on.
 * @param {string} countyName - Name of county.
 */
function zoomToCountyByName(countyName) {
	if(!countyName || countyName < 0) { return; }
	countyName = countyName.toLowerCase();
	var counties = countiesLayer.getSource().getFeatures();
	var selected = null;
	for(var i = 0; i < counties.length; i++) {
		if(counties[i].get("NAME").toLowerCase() === countyName) {
			selected = counties[i];
			break;
		}
	}
	if(selected) {
		selectedCounty = countyName;
		// force style update
		highlightCountiesLayer.changed();
		// if county layers are not on, turn it on
		if(!countiesLayer.getVisible()) {
			countiesLayer.setVisible(true);
			highlightCountiesLayer.setVisible(true);
			$("#show-counties-control").prop('checked', true);
			flashNotification("CA counties layer turned on", 2000);
		} else if(!highlightCountiesLayer.getVisible()) {
			highlightCountiesLayer.setVisible(true);
		}
		map.getView().fit(selected.getGeometry().getExtent(), map.getSize());
	}
}

function getHighlightCountyStyle(feature) {
	if(!selectedCounty) { return null; }
	if(feature.get("NAME").toLowerCase() === selectedCounty) {
		return highlightCountyStyle;
	} else {
		return null;
	}
}

/**
 * Add marine protected area layer.
 */
function addMPALayer() {
	$.ajax({
		async: false, // async must be false as hover interaction must be applied after this is loaded
		dataType: "json", 
		url: mpaUrl, 
		success: function(json) {
			mpaStyles = [
				new ol.style.Style({
					fill: new ol.style.Fill({
						color: mpaColor
					}), 
					stroke: new ol.style.Stroke({
						color: '#aaa',
						width: 1
					})
				}), 
				new ol.style.Style({
					fill: new ol.style.Fill({
						color: mpaColor
					}), 
					stroke: new ol.style.Stroke({
						color: '#fff',
						width: 1
					})
				})
			];
			mpaLayer = new ol.layer.Vector({
				title: 'Marine Protected Areas', 
				source: new ol.source.Vector({
					features: (new ol.format.GeoJSON())
								.readFeatures(json, {
									dataProjection: wgs84, 
									featureProjection: mapProjection
								})
				}), 
				style: mpaStyles[0]
			});
			mpaLayer.getSource().forEachFeature(function(feature) {
				feature.set('featType', 'mpa');
			});
			mpaLayer.setZIndex(1);
			mpaLayer.setVisible(false);	// init not visible
			map.addLayer(mpaLayer);
		}
	});
}