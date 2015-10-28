
var MarkerFactory = function(options) {
	
	this.init = function(options) {
		// some default values which can be manually changed
		this.radius			= 7;
		this.strokeWidth	= 1.5;
		this.stroke			= new ol.style.Stroke({color: 'black', width: this.strokeWidth}); 
		this.stroke2		= new ol.style.Stroke({color: 'white', width: this.strokeWidth});
		// styles caches in shape-specific dictionaries by color (integer 0 to 10) then stroke (normal or highlight)
		this.shapes			= {
								square: [], 
								diamond: [], 
								triangle: [], 
								circle: [], 
								cross: [],
								x: []
							};
		// since setStyle(null) doesn't appear to work, just have a specific style with no fill/stroke
		this.nullStyle		= new ol.style.Style({
								image: new ol.style.RegularShape({
									fill: null,
									stroke: null,
									points: 0,
									radius: 0,
									angle: 0
								})
							});
		// set default style first
		this.resolution		= 10;
		this.colorMap		= [[20, 75, 200],  [240, 80, 0]];
		// set style, override as necessary with provided options
		this.setStyle(options);
	};
	
	this.normalizeValue = function(feature) {
		return 0;
	};
	
	this.determineShape = function(feature) {
		return this.shapes.circle;
	};

	this.setStyle = function(options) {
		var clearCache = false;
		if(options.resolution && options.resolution > 0) {
			this.resolution = options.resolution;
			clearCache = true;
		}
		if(options.colorMap && options.colorMap.length > 1) {
			var valid = true;
			for(var i = 0; i < options.colorMap.length; i++) {
				valid = options.colorMap[i].length === 3;
				valid = valid && (options.colorMap[i][0] === parseInt(options.colorMap[i][0])) && options.colorMap[i][0] >= 0;
				valid = valid && (options.colorMap[i][1] === parseInt(options.colorMap[i][1])) && options.colorMap[i][0] >= 0;
				valid = valid && (options.colorMap[i][2] === parseInt(options.colorMap[i][2])) && options.colorMap[i][0] >= 0;
				if(!valid) { break; }
			}
			if(valid) {
				this.colorMap = options.colorMap;
				clearCache = true;
			}
		}
		if(options.shapeFunction) {
			this.determineShape = options.shapeFunction;
		}
		if(options.valueFunction) {
			this.normalizeValue = options.valueFunction;
		}
		// clear style/symbol cache
		if(clearCache || !this.fills || !this.hexMap) {
			for(var k in this.shapes) {
				this.shapes[k].cache = new Array(this.resolution);
			}
			// create hexmap and fills
			// this will create an array of length resolution+1 (as it's 0 to resolution inclusive)
			this.hexMap = ColorMap.createHexColorMap(this.colorMap, this.resolution);
			this.fills = new Array();
			for(var i = 0; i < this.hexMap.length; i++) {
				this.fills.push(
					new ol.style.Fill({ color: this.hexMap[i] })
				);
			}
		}
	};

	this.createShape = function(shape, fill, thestroke) {
		if(shape == this.shapes.square) {
			return new ol.style.Style({
				image: new ol.style.RegularShape({
					fill: fill,
					stroke: thestroke,
					points: 4,
					radius: this.radius,
					angle: Math.PI/4
				})
			});
		} else if(shape == this.shapes.diamond) {
			return new ol.style.Style({
				image: new ol.style.RegularShape({
					fill: fill,
					stroke: thestroke,
					points: 4,
					radius: this.radius,
					angle: 0
				})
			});
		} else if(shape == this.shapes.triangle) {
			return new ol.style.Style({
				image: new ol.style.RegularShape({
					fill: fill,
					stroke: thestroke,
					points: 3,
					radius: this.radius,
					rotation: 0,
					angle: 0
				})
			});
		} else if(shape == this.shapes.circle) {
			return new ol.style.Style({
				image: new ol.style.Circle({
					fill: fill,
					stroke: thestroke,
					radius: this.radius-1
				})
			});
		} else if(shape == this.shapes.cross) {
			return new ol.style.Style({
				fill: fill, 
				stroke: thestroke, 
				radius: this.radius,
				radius2: 0, 
				angle: 0
			});
		} else if(shape == this.shapes.x) {
			return new ol.style.Style({
				fill: fill, 
				stroke: thestroke, 
				radius: this.radius,
				radius2: 0,
				angle: Math.PI/4
			});
		}
		return null;
	};

	this.createHighlightStyle = function(feature) {
		return this.createLayerStyle(feature, true);
	};
	
	this.createLayerStyle = function(feature, highlight) {
		var styles = feature.get("mfStyle");
		if(!styles) {
			// determine the shape (by index)
			var shape = this.determineShape(feature);
			// if no shape object exists, return null
			if(!shape) { return null; }
			// determine the color index
			var iColor = this.normalizeValue(feature);
			if(iColor > 1.0) {
				iColor = 1.0;
			} else if(iColor < 0) {
				iColor = 0;
			}
			iColor = Math.round(iColor*this.resolution);
			// if nothing in cache, create the styles
			if(!shape[iColor]) {
				var fill = this.fills[iColor];
				shape[iColor] = {
					normal: this.createShape(shape, fill, this.stroke), 
					highlight: this.createShape(shape, fill, this.stroke2)
				};
			}
			styles = shape[iColor];
			// store in feature data as styles are incredibly taxing on speed it looks like
			feature.set("mfStyle", styles);
		}
		// return the styles
		return (!highlight) ? [styles.normal] : [styles.highlight];
	};
	
	this.init(options);
	
};
