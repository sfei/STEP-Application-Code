/** 
 * Class for handling OpenLayer 3 styles. As it is best to cache similar styles, especially with a large 
 * number of points, creating styles and style functions through this class helps reduce redundancy. 
 * Additionally, for each feature given a style, and 'mfStyle' attribute is created as an even quicker style 
 * cache with both its normal and highlight style. If you wish to reset the style, you must also clear this 
 * attribute in all affected features, as this uses that value first and skips the other steps if that cache 
 * exists for a given feature.
 * @param {Object[]} options - optional options to customize style, for more details on available options, see
 *        MarkerFactory.setStyle()
 */
define([
    "OpenLayers", 
    "./module-color-map"
], function(ol, ColorMap) {

    function MarkerFactory(options) {
        // some default values which can be manually changed or change in the style options
        this.resolution        = 10;
        this.colorMap        = [[20, 75, 200],  [240, 80, 0]];
        this.radius            = 7;
        this.strokeWidth    = 1.5;
        this.strokeColor    = 'black';
        this.highlightColor    = 'white';
        this.stroke            = new ol.style.Stroke({color: this.strokeColor, width: this.strokeWidth}); 
        this.strokeHighlight= new ol.style.Stroke({color: this.highlightColor, width: this.strokeWidth});
        // null values and style
        this.showNulls        = true;
        this.nullValue        = -99;
        this.nullFill        = null;
        // styles caches in shape-specific dictionaries by color (integer 0 to 10) then stroke (normal or highlight)
        this.shapes            = {
                                square: [], 
                                diamond: [], 
                                triangle: [], 
                                circle: [], 
                                cross: [],
                                x: []
                            };
        this.nullStyles        = {
                                square: null, 
                                diamond: null, 
                                triangle: null, 
                                circle: null, 
                                cross: null,
                                x: null
                            };
        this.nullStyle        = new ol.style.Style({
                                image: new ol.style.RegularShape({
                                    fill: null,
                                    stroke: null,
                                    points: 0,
                                    radius: 0,
                                    angle: 0
                                })
                            });
        // set style, override as necessary with provided options
        this.setStyle(options);
    };
    
    /** 
     * Determine text to label the feature with.
     * @callback MarkerFactory~textFunction
     * @param {OpenLayers.Feature} feature - can accept an OpenLayers feature, thus allowing you to use some 
     *        inherent property of to determine the resulting label.
     * @returns {string} Some text (by default returns null - or no label) 
     */
    MarkerFactory.prototype.textFunction = null;
    
    /** 
     * Determine the normalized value (i.e. 0-1) which in turns determines the color from the gradient to 
     * use.
     * @callback MarkerFactory~normalizeValue
     * @param {OpenLayers.Feature} feature - can accept an OpenLayers feature, thus allowing you to use some 
     *        inherent property of to determine the resulting value.
     * @returns {number} Normalized value from 0 to 1 inclusive (by default returns 0). 
    */
    MarkerFactory.prototype.normalizeValue = function(feature) {
        return 0;
    };
    
    /** 
     * Determine the shape to be used by the style for the input feature.
     * @callback MarkerFactory~determineShape
     * @param {OpenLayers.Feature} feature - can accept an OpenLayers feature, thus allowing you to use some 
     *        inherent property of to determine shape.
     * @returns {(Array|string)} Should return one of the values in this MarkerFactory instance's shapes array 
     *        or a string name for a shape (currently supported are 'circle', 'square', 'triangle', 'diamond', 
     *        'cross', and 'x'). By default (if left unchanged) returns the circle shape.
     */
    MarkerFactory.prototype.determineShape = function(feature) {
        return "circle";
    };
    
    /** 
     * Change the style options. If necessary will reset the styles cache.
     * @param {Object[]} options - optional options to customize style
     * @param {number} options[].resolution - Sets the number of discreet breaks in gradient. The larger the 
     *        number, the  smoother the gradient, however the more styles that need to be created.
     * @param {number[][]} options[].colorMap - Array of [r,g,b] values that determines gradient.
     * @param {number} options[].radius - the size/radius of the shapes.
     * @param {number} options[].strokeWidth - the size/width of the stroke.
     * @param {(ol.Color|string)} options[].strokeColor - the color of the stroke.
     * @param {(ol.Color|string)} options[].highlightColor - the color of the stroke when highlighted (i.e. on 
     *        hover).
     * @param {boolean} showNoData - whether to show null symbols.
     * @param {number} options[].noDataValue - the no data value. Anything at or lower than this value is 
     *        considered no data.
     * @param {(ol.Color|string)} options[].noDataColor - the fill color of no data markers.
     * @param {MarkerFactory~determineShape} options[].shapeFunction - A callback function to overwrite the 
     *        default shape-determining function. Can have an OpenLayers feature as an incoming argument. Should 
     *        return  one of the values in this MarkerFactory instance's shapes array or a string name for a shape 
     *        (currently supported are 'circle', 'square', 'triangle', 'diamond', 'cross', and 'x').
     * @param {MarkerFactory~normalizeValue} options[].valueFunction - A callback function to determine the 
     *        color on the gradient to use.
     * @param {MarkerFactory~textFunction} options[].textFunction - A callback function to determine the text 
     *        label.
     * @returns {MarkerFactory} instance of MarkerFactory 
     */
    MarkerFactory.prototype.setStyle = function(options) {
        var clearCache = false;
        // gradient options
        if(options.resolution && options.resolution > 0) {
            this.resolution = options.resolution;
            clearCache = true;
        }
        if(options.colorMap && options.colorMap.length > 1) {
            var valid = true;
            for(var i = 0; i < options.colorMap.length; i++) {
                if(Array.isArray(options.colorMap)) {
                    valid = options.colorMap[i].length === 3;
                    // check valid values (doesn't check max value but that'll be capped anyways)
                    valid = valid && (options.colorMap[i][0] === parseInt(options.colorMap[i][0])) && options.colorMap[i][0] >= 0;
                    valid = valid && (options.colorMap[i][1] === parseInt(options.colorMap[i][1])) && options.colorMap[i][0] >= 0;
                    valid = valid && (options.colorMap[i][2] === parseInt(options.colorMap[i][2])) && options.colorMap[i][0] >= 0;
                } else {
                    // check valid hex
                    valid = /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(colorMap[i]);
                }
                if(!valid) { break; }
            }
            if(valid) {
                this.colorMap = options.colorMap;
                clearCache = true;
            }
        }
        // shape radius
        if(options.radius && options.radius >= 0) {
            this.radius = options.radius;
            clearCache = true;
        }
        // stroke style
        if(options.strokeWidth && options.strokeWidth >= 0) {
            this.strokeWidth = options.strokeWidth;
        }
        if(options.strokeColor) {
            this.strokeColor = options.strokeColor;
        }
        if(options.highlightColor) {
            this.highlightColor = options.highlightColor;
        }
        if(options.strokeWidth || options.strokeColor || options.highlightColor) {
            // reset stroke style
            this.stroke            = new ol.style.Stroke({color: this.strokeColor, width: this.strokeWidth}); 
            this.strokeHighlight= new ol.style.Stroke({color: this.highlightColor, width: this.strokeWidth});
            clearCache = true;
        }
        // no data value and styles
        if(typeof options.showNoData !== "undefined") {
            this.showNulls = options.showNoData;
        }
        if(options.noDataValue) {
            this.nullValue = options.noDataValue;
        }
        if(typeof options.noDataColor !== "undefined") {
            if(options.noDataColor === null) {
                this.nullFill = null;
            } else {
                this.nullFill = new ol.style.Fill({ color: options.noDataColor });
            }
        }
        // callbacks
        if(options.shapeFunction) {
            this.determineShape = options.shapeFunction;
        }
        if(options.valueFunction) {
            this.normalizeValue = options.valueFunction;
        }
        if(options.textFunction) {
            this.textFunction = options.textFunction;
        }
        // clear style/symbol cache
        if(clearCache || !this.fills || !this.hexMap) {
            for(var k in this.shapes) {
                this.shapes[k] = new Array(this.resolution+1);
            }
            // create hexmap and fills
            this.hexMap = ColorMap.createHexColorMap(this.colorMap, this.resolution);
            this.fills = new Array();
            for(var i = 0; i < this.hexMap.length; i++) {
                this.fills.push(
                    new ol.style.Fill({ color: this.hexMap[i] })
                );
            }
            return true;
        }
        return false;
    };
    
    MarkerFactory.prototype.createShape = function(shape, fill, thestroke) {
        if(shape === this.shapes.square || shape === "square") {
            return new ol.style.Style({
                image: new ol.style.RegularShape({
                    fill: fill,
                    stroke: thestroke,
                    points: 4,
                    radius: this.radius,
                    angle: Math.PI/4
                })
            });
        } else if(shape === this.shapes.diamond || shape === "diamond") {
            return new ol.style.Style({
                image: new ol.style.RegularShape({
                    fill: fill,
                    stroke: thestroke,
                    points: 4,
                    radius: this.radius,
                    angle: 0
                })
            });
        } else if(shape === this.shapes.triangle || shape === "triangle") {
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
        } else if(shape === this.shapes.circle || shape === "circle") {
            return new ol.style.Style({
                image: new ol.style.Circle({
                    fill: fill,
                    stroke: thestroke,
                    radius: this.radius-1
                })
            });
        } else if(shape === this.shapes.cross || shape === "cross") {
            return new ol.style.Style({
                image: new ol.style.RegularShape({
                    fill: fill, 
                    stroke: thestroke, 
                    points: 4, 
                    radius: this.radius,
                    radius2: 0, 
                    angle: 0
                })
            });
        } else if(shape === this.shapes.x || shape === "x") {
            return new ol.style.Style({
                image: new ol.style.RegularShape({
                    fill: fill, 
                    stroke: thestroke, 
                    points: 4, 
                    radius: this.radius,
                    radius2: 0,
                    angle: Math.PI/4
                })
            });
        }
        return null;
    };
    
     /**
     * Find the appropriate style for the given feature, default to the highlight style.
     * @param {ol.Feature} feature - The feature object the style is being created for.
     * @returns {ol.style.Style[]} The computed highlight style. The style is returned in a single-length array.
     */
    MarkerFactory.prototype.createHighlightStyle = function(feature) {
        return this.createLayerStyle(feature, true);
    };
    
     /**
     * Find the appropriate style for the given feature.
     * @param {ol.Feature} feature - The feature object the style is being created for.
     * @param {boolean} highlight - Whether to get the default or highlight style.
     * @returns {ol.style.Style[]} The computed style. The style is returned in a single-length array.
     */
    MarkerFactory.prototype.createLayerStyle = function(feature, highlight) {
        // first check the cache
        var styles = feature.get("mfStyle");
        if(!styles) {
            // determine the shape via shape function
            var shape = this.determineShape(feature);
            // if no shape object exists, return null
            if(!this.shapes[shape]) { return null; }
            // check feature value is not no data value first
            var value = feature.get("value");
            if(value > this.nullValue) {
                // determine the color index
                var iColor = this.normalizeValue(feature);
                if(iColor > 1.0) {
                    iColor = 1.0;
                } else if(iColor < 0) {
                    iColor = 0;
                }
                iColor = Math.round(iColor*this.resolution);
                // if nothing in cache, create the styles
                if(!this.shapes[shape][iColor]) {
                    var fill = this.fills[iColor];
                    this.shapes[shape][iColor] = {
                        normal: this.createShape(shape, fill, this.stroke), 
                        highlight: this.createShape(shape, fill, this.strokeHighlight)
                    };
                }
                styles = this.shapes[shape][iColor];
            } else {
                if(!this.showNulls) {
                    return null;
                }
                // return null style
                if(!this.nullStyles[shape]) {
                    this.nullStyles[shape] = {
                        normal: this.createShape(shape, this.nullFill, this.stroke), 
                        highlight: this.createShape(shape, this.nullFill, this.strokeHighlight)
                    };
                }
                styles = this.nullStyles[shape];
            }
            // store in feature data as styles are incredibly taxing on speed it looks like
            feature.set("mfStyle", styles);
        }
        var style = (!highlight) ? [styles.normal] : [styles.highlight];
        if(this.textFunction) {
            style.push(
                new ol.style.Style({
                    text: new ol.style.Text({
                        textAlign: "left",
                        textBaseline: "center",
                        font: "bold 12px Arial",
                        text: this.textFunction(feature),
                        fill: new ol.style.Fill({color: "#000"}),
                        stroke: new ol.style.Stroke({color: "#fff", width: 2}),
                        offsetX: this.radius+2, 
                        offsetY: this.radius/2
                    })
                })
            );
        }
        return style;
    };
    
    return MarkerFactory;

});