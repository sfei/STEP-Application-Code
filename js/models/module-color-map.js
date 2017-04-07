
define(function() {
	return {
		/** 
		 * Converts RGB values to the hex equivalent
		 * @param {number[]} rgb - array of red, green, and blue values
		 * @returns {String} hex string (with leading '#') 
		 */
		rgb2hex: function(rgb) {
			return '#' + rgb.map(function(x) { 
				if(!x) { x = 0; }
				return ("0" + x.toString(16)).slice(-2);
			}).join('');
		}, 

		/** 
		 * Converts hex string to rgb numeric values
		 * @param {String} hex - string (with leading '#')
		 * @returns {number[]} array of red, green, and blue values 
		 */
		hexTorgb: function(hex) {
			var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
			if(!result) { return [0, 0, 0]; }
			return [
				parseInt(result[1], 16),
				parseInt(result[2], 16),
				parseInt(result[3], 16)
			];
		}, 

		/** 
		 * Converts HSV values to RGB - adapted from http://schinckel.net/2012/01/10/hsv-to-rgb-in-javascript/
		 * @param {number[]} hsv - array of hue, saturation (0-1.0), value (0-1.0) values
		 * @return {number[]} array of red, green, and blue values 
		 */
		hsv2rgb: function(hsv) {
			var rgb, i, data = [];
			if(hsv[1] === 0) {
				 rgb = [hsv[2],hsv[2],hsv[2]];
			} else {
				var hue = hsv[0] / 60;
				i = Math.floor(hue);
				data = [hsv[2]*(1-hsv[1]), hsv[2]*(1-hsv[1]*(hue-i)), hsv[2]*(1-hsv[1]*(1-(hue-i)))];
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
			return rgb.map(function(x) { return Math.round(x*255); });
		}, 

		/** 
		 * Converts RGB values to HSV - adapted from http://www.javascripter.net/faq/rgb2hsv.htm 
		 * @param {number[]} rgb - array of red, green, and blue values from 0-255 
		 * @return {number[]} array of hue, saturation (0-1.0), value (0-1.0) values 
		 */
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

		/** 
		 * With color map specified at top, creates an array of hex values as appropriate in a smooth gradient, using 
		 * HSV transition (rather than trying to RGB gradient it), linearlly interpolated
		 * @param {number[][]} colorMap - array of [r,g,b] values array that determines gradient
		 * @param {number} resolution - determines the number of discrete colors to create, must be at least equal
		 *		to the length of the colorMap
		 * @return {string[]} array of hex strings representing the color map (with leading '#') 
		 */
		createHexColorMap: function(colorMap, resolution) {
			// convert to decimal RGB values
			for(var i = 0; i < colorMap.length; i++) {
				if(Object.prototype.toString.call(colorMap[i]) === '[object Array]') {
					while(colorMap[i].length < 3) {
						colorMap[i].push(0);
					}
				} else if(typeof colorMap[i] === 'string') {
					colorMap[i] = hexTorgb(colorMap[i]);
				} else {
					colorMap[i] = [0, 0, 0];
				}
			}
			resolution = parseInt(resolution);
			var hexColors = [];
			// if only one color, just apply it to all
			if(colorMap.length === 1) {
				var hex = this.rgb2hex(colorMap[0]);
				for(var i = 0; i < resolution; i++) {
					hexColors.push(hex);
				}
				return hexColors;
			}
			if(resolution === colorMap.length) {
				// just go 1-to-1
				for(var i = 0; i < resolution; i++) {
					hexColors.push(
						//this.rgb2hex( this.hsv2rgb( this.rgb2hsv(colorMap[i]) ) )
						this.rgb2hex(colorMap[i])
					);
				}
			} else {
				// convert to HSV first
				var hsvColors = [];
				for(var i = 0; i < colorMap.length; i++) {
					hsvColors.push(this.rgb2hsv(colorMap[i]));
				}
				var iHsv = 0, 
					twoColors = [hsvColors[0], hsvColors[0]], 
					twoPositions = [0, 0], 
					colorDiff, 
					span;
				for(var r = 0; r < resolution; r++) {
					if(r === resolution) {
						hexColors.push(
							this.rgb2hex(this.hsv2rgb(hexColors[hsvColors.length-1]))
						);
					} else {
						var rnorm = r/(resolution - 1);
						// relative position between two colors
						var rel = (rnorm - twoPositions[0]) / span;
						// check if getting next hsv
						if(r === 0 || rel > 1.0) {
							if(++iHsv > hsvColors.length - 1) {
								iHsv = hsvColors.length - 1;
							}
							twoColors[0] = twoColors[1];
							twoColors[1] = hsvColors[iHsv];
							twoPositions[0] = twoPositions[1];
							twoPositions[1] = parseFloat(iHsv) / (hsvColors.length - 1);
							span = twoPositions[1] - twoPositions[0];
							colorDiff = {
								h: twoColors[1][0] - twoColors[0][0], 
								s: twoColors[1][1] - twoColors[0][1], 
								v: twoColors[1][2] - twoColors[0][2]
							};
							rel = (rnorm - twoPositions[0]) / span;
						}
						var hsv;
						if(rel <= 0) {
							hsv = twoColors[0];
						} else if(rel >= 1) {
							hsv = twoColors[1];
						} else {
							hsv = [
								twoColors[0][0] + colorDiff.h * rel, 
								twoColors[0][1] + colorDiff.s * rel, 
								twoColors[0][2] + colorDiff.v * rel
							];
							// adjust hue if it's past max value
							if(hsv[0] >= 360) { hsv[0] -= 360; }
						}
						hexColors.push(
							this.rgb2hex(this.hsv2rgb(hsv))
						);
					}
				}
			}
			return hexColors;
		}
	};
});