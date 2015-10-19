
var map;
var dragging = false;
var bgLayers, 
	bgLayerGroup;
var stations, 
	stationLayer;
var mapProjection = 'EPSG:3857';	// web mercator wgs84

window.onload = init;

function init() {
	// initalize tooltip and dialog
	$("#FeatureTooltip").hide();
	// create map and view
	map = new ol.Map({ target: "Map" });
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
		target: document.getElementById("LatLong")
	}));
	// grabbing cursor functionality since it's not default to open layers 3
	$('#Map').addClass('grab')
		.mouseup(function() {
			dragging = false;
			$('#Map').css("cursor", "");
		})
		.mousedown(function() {
			dragging = true;
			$('#Map').css("cursor", "-webkit-grabbing");
		});
	// create background tile-layers
	bgLayers = { 
		TFLandscape: new ol.layer.Tile({
			source: new ol.source.XYZ({
				url: "http://a.tile.thunderforest.com/landscape/{z}/{x}/{y}.png", 
				attributions: [new ol.Attribution({
					html: "Map tiles by <a href='http://thunderforest.com/' target='_blank'>Thunderforest</a>"
				})]
			})
		}), 
		ESRITopo: new ol.layer.Tile({
			source: new ol.source.XYZ({
				url: "http://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}", 
				attributions: [new ol.Attribution({
					html: "Map tiles by <a href='http://ESRI.com/' target='_blank'>ESRI</a>"
				})]
			})
		}),
		ESRISatellite: new ol.layer.Tile({
			source: new ol.source.XYZ({
				url: "http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", 
				attributions: [new ol.Attribution({
					html: "Map tiles by <a href='http://ESRI.com/' target='_blank'>ESRI</a>"
				})]
			})
		})
	};
	// set ESRI satellite to default (adjust checkbox to match)
	bgLayers.TFLandscape.setVisible(false);
	bgLayers.ESRITopo.setVisible(false);
	$("#BaseLayerControl").val(2);
	// add to map as a layer-group
	bgLayerGroup = new ol.layer.Group({
		layers: [bgLayers.TFLandscape, bgLayers.ESRITopo, bgLayers.ESRISatellite]
	});
	map.setLayerGroup(bgLayerGroup);
	
	// load stations from server, 
	$.ajax({
		url: "lib/getStations.php",
		dataType: "json",
		success: function(data) {
			loadStationsLayer(data);
		}
	});
	
}

function loadStationsLayer(data) {
	// create array of ol.Features from data (since it's not technically geographic)
	var feat_array = new Array();
	for(var i = 0; i < data.length; i++) {
		feat_array.push(
			new ol.Feature({
				id: data[i].StationGroupID, 
				geometry: new ol.geom.Point(
					ol.proj.fromLonLat(
						[parseFloat(data[i].Long), parseFloat(data[i].Lat)], 
						mapProjection
					)
				),
				name: data[i].StationNameRevised, 
				type: data[i].WaterType
			})
		);
	}
	stations = new ol.Collection(feat_array);
	
	// load and and features
	stationLayer = new ol.layer.Vector({
		title: 'Stations', 
		source: new ol.source.Vector({
			features: stations
		}), 
		style: createLayerStyle
	});
	map.addLayer(stationLayer);
	
	// hover interaction
	map.addInteraction(new ol.interaction.Select({
		condition: ol.events.condition.pointerMove,
		layers: [stationLayer],
		style: createHighlightStyle
	}));
	
	// cursor change on hover as well as tooltips
	// copied from http://stackoverflow.com/questions/26022029/how-to-change-the-cursor-on-hover-in-openlayers-3
	var target = map.getTarget();
	var jTarget = typeof target === "string" ? $("#" + target) : $(target);
	$(map.getViewport()).on('mousemove', function(e) {
		var pixel = map.getEventPixel(e.originalEvent);
		var feature = null;
		map.forEachFeatureAtPixel(pixel, function(f, l) {
			feature = f;
		});
		if(dragging) {
			//jTarget.css("cursor", "-webkit-grabbing");
			$("#FeatureTooltip").hide();
		} else if(feature) {
			jTarget.css("cursor", "pointer");
			$("#FeatureTooltip").html(feature.get("name"))
			  .css({
				top: pixel[1]-10,
				left: pixel[0]+15
			  }).show();
		} else {
			jTarget.css("cursor", "");
			$("#FeatureTooltip").hide();
		}
	});
	
	// click interaction
	$(map.getViewport()).on('click', function(e) {
		var pixel = map.getEventPixel(e.originalEvent);
		var feature = null;
		map.forEachFeatureAtPixel(pixel, function(f, l) {
			feature = f;
		});
		if(feature) {
			var details = "<p style='font-size:12px;'>";
			var keys = feature.getKeys();
			for(var k = 0; k < keys.length; k++) {
				details += keys[k] + ": " + feature.get(keys[k]) + "<br />";
			}
			details += "</p>";
			$('#DetailsDialog')
			  .html(details)
			  .dialog({ title: feature.get('name') });
		}
	});
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

function changeBaseLayer(toLayerType) {
	if(toLayerType === undefined || toLayerType === null) {
		toLayerType = parseInt($("#BaseLayerControl").val());
	}
	bgLayers.TFLandscape.setVisible(toLayerType === 0);
	bgLayers.ESRITopo.setVisible(toLayerType === 1);
	bgLayers.ESRISatellite.setVisible(toLayerType === 2);
}