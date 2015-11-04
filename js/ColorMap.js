
var ColorMap = {
	/** Converts RGB values to the hex equivalent
	 * @param {Array} rgb : array of red, green, and blue values
	 * @returns {String} hex string (with leading '#') */
	rgb2hex: function(rgb) {
		return '#' + rgb.map(function(x) { 
			return ("0" + Math.round(x*255).toString(16)).slice(-2);
		}).join('');
	}, 
	/** Converts HSV values to RGB - adapted from http://schinckel.net/2012/01/10/hsv-to-rgb-in-javascript/
	 * @param {Array} hsv : array of hue, saturation (0-1.0), value (0-1.0) values
	 * @return {Array} array of red, green, and blue values */
	hsv2rgb: function(hsv) {
		var rgb, i, data = [];
		if(hsv[1] === 0) {
			 rgb = [hsv[2],hsv[2],hsv[2]];
		} else {
			hsv[0] = hsv[0] / 60;
			i = Math.floor(hsv[0]);
			data = [hsv[2]*(1-hsv[1]), hsv[2]*(1-hsv[1]*(hsv[0]-i)), hsv[2]*(1-hsv[1]*(1-(hsv[0]-i)))];
			switch(i) {
			  case 0:
				rgb = [hsv[2], data[2], data[0]];
				break;
			  case 1:
				rgb = [data[1], hsv[2], data[0]];
				break;
			  case 2:
				rgb = [data[0], hsv[2], data[2]];
				break;
			  case 3:
				rgb = [data[0], data[1], hsv[2]];
				break;
			  case 4:
				rgb = [data[2], data[0], hsv[2]];
				break;
			  default:
				rgb = [hsv[2], data[0], data[1]];
				break;
			}
		}
		return rgb;
	}, 
	/** Converts RGB values to HSV - adapted from http://www.javascripter.net/faq/rgb2hsv.htm 
	 * @param {Array[3]} rgb : array of red, green, and blue values from 0-255 
	 * @return {Array[3]} array of hue, saturation (0-1.0), value (0-1.0) values */
	rgb2hsv: function(rgb) {
		var computedH = 0;
		var computedS = 0;
		var computedV = 0;

		var r = parseInt( (''+rgb[0]).replace(/\s/g,''),10 ); 
		var g = parseInt( (''+rgb[1]).replace(/\s/g,''),10 ); 
		var b = parseInt( (''+rgb[2]).replace(/\s/g,''),10 ); 

		r=r/255; g=g/255; b=b/255;
		var minRGB = Math.min(r,Math.min(g,b));
		var maxRGB = Math.max(r,Math.max(g,b));

		if(minRGB==maxRGB) {
			computedV = minRGB;
			return [0,0,computedV];
		}

		var d = (r==minRGB) ? g-b : ((b==minRGB) ? r-g : b-r);
		var h = (r==minRGB) ? 3 : ((b==minRGB) ? 1 : 5);
		return [
			60*(h - d/(maxRGB - minRGB)), 
			(maxRGB - minRGB)/maxRGB, 
			maxRGB
		];
	}, 
	/** With color map specified at top, creates an array of hex values as appropriate in a smooth gradient, using 
	 * HSV transition (rather than trying to RGB gradient it), linearlly interpolated
	 * @param {Array} colorMap : array of [r,g,b] values array that determines gradient
	 * @param {Number} resolution : determines the number of discrete colors to create, must be at least equal
	 *		to the length of the colorMap
	 * @return {Array} array of hex strings representing the color map (with leading '#') */
	createHexColorMap: function(colorMap, resolution) {
		resolution = parseInt(resolution);
		var hexColors = [];
		var spread = colorMap.length;
		if(spread == 1) {
			var hex = this.rgb2hex(colorMap[0]);
			for(var i = 0; i < resolution; i++) {
				hexColors.push(hex);
			}
		} else if(spread >= resolution) {
			// just go 1-to-1 for first 10 colors supplied
			for(var i = 0; i < resolution; i++) {
				hexColors.push(this.rgb2hex(colorMap[i]));
			}
		} else {
			// convert to HSV first
			var hsvColors = [];
			for(var i = 0; i < spread; i++) {
				hsvColors.push(this.rgb2hsv(colorMap[i]));
			}
			// setup looping variables
			var increment = (resolution-1)/(spread - 1);
			var interpolatePositions = {
				start: 0, 
				end: 0
			};
			var twoColors = {
				index: 0, 
				first: hsvColors[0], 
				second: hsvColors[0]
			};
			// linearlly interpolate between HSV values
			for(var i = 0; i < resolution; i++) {
				if(i === 0 || i >= interpolatePositions.end) {
					interpolatePositions.start = interpolatePositions.end;
					interpolatePositions.end += increment;
					twoColors.index++;
					twoColors.first = twoColors.second;
					if(twoColors.index < spread) {
						twoColors.second = hsvColors[twoColors.index];
					}
					twoColors.hdiff = hsvColors[1][0] - hsvColors[0][0]; 
					twoColors.sdiff = hsvColors[1][1] - hsvColors[0][1]; 
					twoColors.vdiff = hsvColors[1][2] - hsvColors[0][2];
				}
				var pos = (i - interpolatePositions.start) / increment;
				var hsv = [
					twoColors.first[0] + twoColors.hdiff * pos, 
					twoColors.first[1] + twoColors.sdiff * pos, 
					twoColors.first[2] + twoColors.vdiff * pos
				];
				hexColors.push(
					this.rgb2hex( this.hsv2rgb(hsv) )
				);
			}
		}
		return hexColors;
	}
};