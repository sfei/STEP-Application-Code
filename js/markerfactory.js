
var hexMap;
var fills;
var radius = 7;
var strokeWidth = 1.5;
var stroke = new ol.style.Stroke({color: 'black', width: strokeWidth}), 
	stroke2 = new ol.style.Stroke({color: 'white', width: strokeWidth});
var shapes = {'square': 0, 'triangle': 1, 'circle': 2};
// styles caches in shape-specific dictionaries by color (integer 0 to 10) then stroke (normal or highlight)
var	styleCacheSquare = {},
	styleCacheTriangle = {},
	styleCacheCircle = {};
// since setStyle(null) doesn't appear to work, just have a specific style with no fill/stroke
var nullStyle = new ol.style.Style({
					image: new ol.style.RegularShape({
						fill: null,
						stroke: null,
						points: 0,
						radius: 0,
						angle: 0
					})
				});

var resolution = 10;
// initialize styles cache and load layers
hexMap = createHexColorMap(resolution);	// this will create an array of length 11 (0-10 inclusive)
fills = [];
for(var i = 0; i < hexMap.length; i++) {
	fills.push(new ol.style.Fill({color: hexMap[i]}));
}

function createShape(shape, fill, thestroke) {
	if(shape == shapes.square) {
		return new ol.style.Style({
			image: new ol.style.RegularShape({
				fill: fill,
				stroke: thestroke,
				points: 4,
				radius: radius,
				angle: 0
			})
		});
	} else if(shape == shapes.triangle) {
		return new ol.style.Style({
			image: new ol.style.RegularShape({
				fill: fill,
				stroke: thestroke,
				points: 3,
				radius: radius,
				rotation: 0,
				angle: 0
			})
		});
	} else if(shape == shapes.circle) {
		return new ol.style.Style({
			image: new ol.style.Circle({
				fill: fill,
				stroke: thestroke,
				radius: radius-1
			})
		});
	}
}

function createHighlightStyle(feature, layer) {
	return createLayerStyle(feature, layer, true);
}

function createLayerStyle(feature, layer, highlight) {
	var type = feature.get("type");
	var coords = feature.getGeometry().getCoordinates();
	var latitude = ol.proj.toLonLat(coords)[1];
	
	var shape;
	var styleCache;
	if(type === "lake_reservoir") {
		shape = shapes.circle;
		styleCache = styleCacheCircle;
	} else if(type === "coast") {
		shape = shapes.triangle;
		styleCache = styleCacheTriangle;
	} else {
		shape = shapes.square;
		styleCache = styleCacheSquare;
	}
	var iColor = Math.round((latitude - 32.5)/0.9);
	if(iColor > resolution) {
		iColor = resolution;
	} else if(iColor < 0) {
		iColor = 0;
	}
	
	if(styleCache[iColor] === undefined) {
		var fill = fills[iColor];
		styleCache[iColor] = {
			normal: createShape(shape, fill, stroke), 
			highlight: createShape(shape, fill, stroke2)
		};
	}
	
	if(highlight === undefined || highlight === null || !highlight) {
		return [styleCache[iColor].normal];
	} else {
		return [styleCache[iColor].highlight];
	}
}

