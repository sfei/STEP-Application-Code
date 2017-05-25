define([
	"jquery", 
	"chosen", 
	"d3"
], function(jQuery, chosen, d3) {

	DVCompareStations = function(options) {
		// simple-graph options
		if(!options) { options = {}; }
		options.margins = options.margins ? options.margins : {};
		this.margins = {
			left: (!options.margins.left && options.margins.left !== 0) ? 10 : options.margins.left, 
			right: (!options.margins.right && options.margins.right !== 0) ? 20 : options.margins.right, 
			top: (!options.margins.top && options.margins.top !== 0) ? 10 : options.margins.top, 
			bottom: (!options.margins.bottom && options.margins.bottom !== 0) ? 10 : options.margins.bottom
		};
		this.axisOptions = options.axisOptions ? options.axisOptions : {};
		if(!this.axisOptions.styles) {
			this.axisOptions.styles = {};
		}
		if(!this.axisOptions.styles.fill) {
			this.axisOptions.styles.fill = "none";
		}
		if(!this.axisOptions.styles['stroke-width']) {
			this.axisOptions.styles['stroke-width'] = 0.5;
		}
		if(!this.axisOptions.styles.stroke) {
			this.axisOptions.styles.stroke = "black";
		}
		// graph dimensions and more options
		this.containerWidth = options.width ? options.width : 760;
		this.width = this.containerWidth - this.margins.left - this.margins.right;
		this.containerHeight = 0;
		this.height = 0;
		this.barHeight = options.barHeight ? options.barHeight : 20;
		this.barSpacing = options.barSpacing || options.barSpacing === 0 ? options.barSpacing : 4;
		this.supressLabels = !!options.supressLabels;
		this.precision = 2;
		// color and highlight options
		this.colors = ["#5bf"];
		this.selectedColor = "#39e";
		//this.selectedColor = options.selectedColor ? options.selectedColor : "#000";
		this.highlightFixed = false;
		this.highlightFixedIndex = -1;
		this.fillOpacity = 0.6;
		this.saturate = 0.8;
		// data objects
		this.data = null;
		this.thresholds = null;
		// graph and other DOM objects
		this.containerSelect = null;
		this.container = null;
		this.svg = null;
		this.svgGraph = null;
		this.axes = null;
		this.stationsSelect = null;
		// persistent graph information
		this.title = null;
		this.units = null;
	};
	
	// static functions
	DVCompareStations.getPopupHeight = function(barHeight, numStations) {
		var newHeight = barHeight*(1 + numStations) + (window.outerHeight - window.innerHeight) + 75;
		return newHeight > 540 ? newHeight : 540;
	};
	
	DVCompareStations.adjustWindow = function(newHeight) {
		if(newHeight > screen.availHeight) { newHeight = screen.availHeight; }
		window.resizeTo(window.outerWidth, newHeight);
		var top = ((screen.availHeight / 2) - (window.outerHeight / 2));
		window.moveTo(window.screenX, top);
	};
	
	DVCompareStations.prototype.setThresholds = function(thresholds, colors) {
		this.thresholds = thresholds;
		this.colors = colors ? colors : this.colors;
	};
	
	DVCompareStations.prototype.getGraphHeight = function(numStations) {
		var h = 0.5*this.barSpacing + this.barHeight + numStations * (this.barHeight + this.barSpacing);
		return h > 300 ? h : 300;
	};
	
	DVCompareStations.prototype.addGraphContainer = function(containerSelect) {
		this.containerSelect = containerSelect;
		this.container = $(this.containerSelect);
		this.svg = d3.select(this.containerSelect).append("svg")
			.attr("width", this.containerWidth)
			.attr("height", this.containerHeight)
			.style("font-family", "'Century Gothic', CenturyGothic, Geneva, AppleGothic, sans-serif")
			.style("font-size", "14px")
			.style("overflow", "visible");
	};
	
	DVCompareStations.prototype.addStationsSelect = function(container) {
		this.stationsSelect = $("<select>").appendTo(container);
		this._updateStationsSelect();
		var self = this;
		this.stationsSelect
			.width(380)
			.attr("data-placeholder", "Select a Station")
			.chosen()
			.change(function() {
				self._highlightStation(this.value, true);
			});
		$(container).find(".chosen-container").css("text-align", "left");
	};
	
	DVCompareStations.prototype.update = function(query, onSuccess) {
		var self = this;
		this._pullData({
			queryObj: query, 
			success: function() {
				self._updateStationsSelect();
				self._draw();
				if(onSuccess) { onSuccess(); }
			}
		});
	};
	
	DVCompareStations.prototype._updateStationsSelect = function() {
		if(!this.data) { return; }
		// first load in array, then sort alphabetically, then append
		var options = this.data.stations
			.map(function(s, i) {
				return {
					text: s.name, 
					value: i
				};
			}).sort(function(a, b) {
				return a.text > b.text ? 1 : -1;
			});
		for(var o = 0; o < options.length; o++) {
			this.stationsSelect.append(
				$("<option>", options[o])
			);
		}
//		this.stationsSelect.val(null);
//		this.stationsSelect.trigger('chosen:updated');
	};
	
	DVCompareStations.prototype._highlightStation = function(h, fix) {
		if(!this.svg) { return; }
		this.svgGraph.selectAll(".sg-pointer, .sg-sel-val").remove();
		if(fix && h !== null && h >= 0) {
			// adjusted bar height and spacing
			var halfBarSpacing = 0.5*this.barSpacing;
			var adjBarHeight = (this.height - halfBarSpacing) / this.data.stations.length - this.barSpacing;
			// center y-pos
			var yPos = this.y.scale(this.data.stations[h].name) + 0.5*adjBarHeight + halfBarSpacing, 
				xPos = this.x.scale(this.data.stations[h].value) + 4;
			// width of pointer as function of bar spacing
			var pointerSize = Math.round(adjBarHeight);
			pointerSize = (pointerSize > 7 ? (pointerSize < 10 ? pointerSize : 10) : 7);
			var halfPointerSize = 0.6*pointerSize;
//			this.svgGraph.append("path")
//				.attr("class", "sg-pointer")
//				.attr("d",
//					"M " + (this.margins.left-pointerSize) + " " + (yPos-halfPointerSize) + " " +
//					"L " + (this.margins.left) + " " + yPos + " " + 
//					"L " + (this.margins.left-pointerSize) + " " + (yPos+halfPointerSize)
//				)
//				.attr("fill", this.selectedColor);
//			// add text with values
//			this.svgGraph.append("text")
//				.attr("class", "sg-sel-val")
//				.attr("text-anchor", "end")
//				.attr("x", this.margins.left-pointerSize-2)
//				.attr("y", yPos+4)
//				.style("font-size", 12)
//				.text(this.data.stations[h].value.addCommas(this.precision));
			this.svgGraph.append("path")
				.attr("class", "sg-pointer")
				.attr("d",
					"M " + (xPos) + " " + yPos + " " + 
					"L " + (xPos+pointerSize) + " " + (yPos-halfPointerSize) + " " +
					"L " + (xPos+pointerSize) + " " + (yPos+halfPointerSize)
				)
				.attr("fill", "#000");
			this.svgGraph.append("path")
				.attr("class", "sg-pointer")
				.attr("stroke", "#000")
				.attr("stroke-width", 0.75)
				.attr("d", "M" + (xPos) + " " + yPos + " L" + (xPos+20) + " " + yPos);
			this.svgGraph.append("text")
				.attr("class", "sg-sel-val")
				.attr("text-anchor", "start")
				.attr("x", xPos+24)
				.attr("y", yPos+4)
				.style("font-size", 12)
				.text(this.data.stations[h].name + ", " + this.data.stations[h].value.addCommas(this.precision) + " " + this.units);
			// change opacity
			var self = this;
			this.svgGraph.selectAll(".sg-bar")
				.attr("filter", function() {
					return (this.getAttribute("station") == h) ? "" : "url(#fltDesaturate)";
				})
				.attr("fill-opacity", function() {
					return (this.getAttribute("station") == h) ? 1.0 : self.fillOpacity;
				});
		}
		this.highlightFixed = !!fix;
		if(this.highlightFixed) {
			this.stationsSelect.val(h);
			this.highlightFixedIndex = parseInt(h);
		} else {
			this.stationsSelect.val(null);
		}
		this.stationsSelect.trigger('chosen:updated');
	};
	
	DVCompareStations.prototype._pullData = function(options) {
		var self = this;
		$.ajax({
			async: true,
			url: "lib/queryStations.php", 
			data: options.queryObj, 
			dataType: "json", 
			success: function(rsp) {
				rsp.stations = rsp.stations.sort(function(a, b) {
					return b.value - a.value;
				});
				self.data = rsp;
				if(options.success) { options.success(rsp); }
			}, 
			error: options.error, 
			complete: options.complete
		});
	};
	
	DVCompareStations.prototype._colorFunction = function(s, i, h, t) {
		if(!this.thresholds || this.thresholds.length === 1) {
			if(i >= 0 && i == h) { // may be comparing int to string so use loose comparison
				return this.selectedColor;
			} else {
				return this.colors[0];
			}
		}
		if(t >= 0) {
			return this.colors[t];
		}
		var color;
		for(var c = 0; c < this.colors.length; c++) {
			color = this.colors[c];
			if(c < this.thresholds.length && s.value < this.thresholds[c]) {
				break;
			}
		}
		return color;
	};
	
	DVCompareStations.prototype._draw = function() {
		if(!this.data || !this.svg) { return; }
		
		var max = this.data.stations[0].value;
		max *= 1.15; // increase max a bit to have some spacing on right
		this.precision = 0; // let d3 handle tick formats but needed for tooltip
		if(max < 4.5) {
			max = 0.1*Math.ceil(10*max);
			this.precision = (max < 1) ? 3 : 2;
		} else if(max < 10) {
			max = Math.ceil(max);
			this.precision = 1;
		} else if(max < 45) {
			max = 5*Math.ceil(0.2*max);
		} else if(max < 100) {
			max = 10*Math.ceil(0.1*max);
		} else if(max < 450) {
			max = 50*Math.ceil(max/50.0);
		} else if(max < 1000) {
			max = 100*Math.ceil(0.01*max);
		} else if(max < 4500) {
			max = 500*Math.ceil(max/500);
		} else {
			max = 1000*Math.ceil(0.001*max);
		}
		
		// clear and reset the SVG
		d3.selectAll("svg > *").remove();
		this.height = this.getGraphHeight(this.data.stations.length);
		this.containerHeight = this.height + this.margins.top + this.margins.bottom;
		this.svg.attr("height", this.containerHeight);
		this.svgGraph = this.svg.append("g")
			.attr("transform", "translate(" + this.margins.left + "," + this.margins.top + ")");
	
		// adjusted bar height and spacing
		var halfBarSpacing = 0.5*this.barSpacing;
		var adjBarHeight = (this.height - halfBarSpacing) / this.data.stations.length - this.barSpacing;
	
		// add title
		this.units = this.data.thresholds[0].units;
		if(this.data.query.isASpecies) {
			this.title = (
				"Most Recent " + this.data.query.contaminant + " Concentration in " 
				+ this.data.query.species
			);
		} else {
			this.title = (
				"Most Recent, " + this.data.query.species.capitalize() 
				+ " " + this.data.query.contaminant + " Concentration for Any Species"
			);
		}
		this.title += " (" + this.units + ") " + this.data.query.startYear + "-" + this.data.query.endYear;
		
		// create axes
		this.x = {};
		this.x.scale = d3.scaleLinear()
			.range([this.margins.left, this.margins.left + this.width])
			.domain([0.0, max]);
		this.x.axis = d3.axisTop(this.x.scale);
		
		this.y = {};
		this.y.scale = d3.scaleBand()
			.range([this.margins.top, this.margins.top + this.height])
			.padding(halfBarSpacing)
			.domain(this.data.stations.map(function(s) { return s.name; }));
		this.y.axis = d3.axisLeft(this.y.scale)
			.tickValues([]);  // hide tick labels
	
		var self = this, 
			labelPadding = 6, 
			fontSize = 12, 
			labelOffset = 6;
	
		halfBarSpacing = halfBarSpacing ? halfBarSpacing : adjBarHeight;
		
		// define desaturate filter
		this.svg.append("filter")
				.attr("id", "fltDesaturate")
			.append("feColorMatrix")
				.attr("in", "SourceGraphic")
				.attr("type", "saturate")
				.attr("values", this.saturate);

		if(!this.supressLabels) {
			// define clip paths
			this.svg.append("defs").selectAll("clipPath")
				.data(this.data.stations).enter()
				.append("clipPath")
					.attr("id", function(d, i) { return "clip-" + i; })
				.append("rect")
					.attr("x", this.margins.left)
					.attr("y", function(s) { return halfBarSpacing+ self.y.scale(s.name) - adjBarHeight; })
					.attr("width", function(s) { return self.x.scale(s.value) - self.margins.left; })
					.attr("height", adjBarHeight);
		
			// draw background labels
			this.svgGraph.selectAll(".sg-label-back")
				.data(this.data.stations).enter()
				.append("text")
					.attr("class", "sg-label sg-label-back")
					.attr("fill", "black")
					.attr("x", this.margins.left + labelPadding)
					.attr("y", function(s) { return halfBarSpacing + self.y.scale(s.name) - labelOffset; })
					.style("font-size", fontSize)
					.text(function(s) { return s.name; });
		}
	
		// draw bars
		if(!this.thresholds) {
			this.svgGraph.selectAll(".sg-bar")
				.data(this.data.stations).enter()
				.append("rect")
					.attr("class", "sg-bar")
					.attr("station", function(s, i) { return i; })
					.attr("x", this.margins.left)
					.attr("y", function(s) { return halfBarSpacing + self.y.scale(s.name) - adjBarHeight; })
					.attr("width", function(s) { return self.x.scale(s.value) - self.margins.left; })
					.attr("height", adjBarHeight)
					.attr("fill", function(s, i) {
						return self._colorFunction(s, i, -1);
					})
					.attr("fill-opacity", this.fillOpacity)
					.attr("filter", "url(#fltDesaturate)")
					.style("cursor", "pointer");
		} else {
			var lastThreshold = 0;
			for(var t = 0; t <= this.thresholds.length; t++) {
				var threshold = t < this.thresholds.length ? this.thresholds[t] : null;
				for(var s = 0; s < this.data.stations.length; s++) {
					var station = this.data.stations[s];
					if(station.value < lastThreshold) {
						continue;
					}
					var startX = this.x.scale(lastThreshold);
					var drawToX = (
						!threshold || station.value < threshold
						? station.value
						: threshold
					);
					this.svgGraph.append("rect")
						.attr("class", "sg-bar")
						.attr("station", s)
						.attr("x", startX)
						.attr("y", halfBarSpacing + this.y.scale(station.name) - adjBarHeight)
						.attr("width", this.x.scale(drawToX) - startX)
						.attr("height", adjBarHeight)
						.attr("fill", this._colorFunction(-1, -1, -1, t))
						.attr("fill-opacity", this.fillOpacity)
						.attr("filter", "url(#fltDesaturate)")
						.style("cursor", "pointer");
				}
				lastThreshold = threshold;
			}
		}
		
		if(!this.supressLabels) {
			// draw foreground labels with clip-path
			this.svgGraph.selectAll(".sg-label-front")
				.data(this.data.stations).enter()
				.append("text")
					.attr("class", "sg-label sg-label-front")
					.attr("fill", "white")
					.attr("x", this.margins.left + labelPadding)
					.attr("y", function(s) { return halfBarSpacing + self.y.scale(s.name) - labelOffset; })
					.attr("clip-path", function(d, i) { return "url(#clip-" + i + ")"; })
					.style("font-size", fontSize)
					.text(function(s) { return s.name; });
		}
		
		// draw axes last so they're on top
		this.x.g = this.svgGraph.append("g")
			.attr("class", "sg-xaxis")
			.attr("transform", "translate(0," + this.margins.top + ")")
			.call(this.x.axis);
		this.y.g = this.svgGraph.append("g")
			.attr("class", "sg-yaxis")
			.attr("transform", "translate(" + this.margins.left + ",0)")
			.call(this.y.axis);
	
		// IE requires bottom-buffer hack to make the dynamic fit work
		var btmBuffer = Math.round(100*this.containerHeight/this.containerWidth) + "%";
		this.svg
			.attr("width", this.width)
			.attr("height", this.height)
			//.attr("preserveAspectRatio", "xMinYMin slice")
			.attr("viewBox", "0 0 " + this.width + " " + (this.containerHeight+150))
			//.style('width', "1px") 
			.style('height', "100%")
			.style('padding-bottom', btmBuffer)
			.style('overflow', "visible");
	
		// add tooltip
		this.svgGraph.selectAll(".sg-bar, .sg-label").call(
			this._constructTooltipFunctionality(
				function(d, p, s, i) {
					if(!d || !d.name) { d = self.data.stations[s[i].getAttribute("station")];}
					return (
						"<b>" + d.name + "</b><br />"
						+ d.value.addCommas(self.precision) + " " + self.units
					);
				}, 
				{offset: [15, -25]}
			)
		);
	};
	
	// copied from simple-graph
	DVCompareStations.prototype._constructTooltipFunctionality = function(textFunction, options) {
		var self = this;
		var svg = this.svg;
		return function(selection) {
			if(!selection) { return null; }
			if(!options) { options = {}; }
			var d3Body = d3.select('body');
			var tooltipDiv;
			selection.on("mouseover", function(d, i) {
				// set relative position of tool-tip
				var absMousePos = d3.mouse(d3Body.node());
				var tooltipOffset = (options.offset) ? options.offset : [10, -15];
				// Check if tooltip div already exists
				var styles = {};
				if(!tooltipDiv) {
					// Clean up lost tooltips
					d3Body.selectAll('.sg-tooltip').remove();
					// Append tooltip 
					tooltipDiv = d3Body.append('div');
					tooltipDiv.attr('class', 'sg-tooltip');
					// full styles
					styles = {
						'position': 'absolute', 
						'left': (absMousePos[0] + tooltipOffset[0])+'px', 
						'top': (absMousePos[1] + tooltipOffset[1])+'px', 
						'z-index': 1001, 
						'background-color': '#fff', 
						'border': '1px solid #777', 
						'border-radius': '4px', 
						'padding': '4px 6px', 
						'font-family': "'Century Gothic', CenturyGothic, Geneva, AppleGothic, sans-serif", 
						'font-size': '12px'
					};
				} else {
					// just update position
					styles = {
						'left': (absMousePos[0] + tooltipOffset[0])+'px', 
						'top': (absMousePos[1] + tooltipOffset[1])+'px'
					};
				}
				for(var styleKey in styles) {
					tooltipDiv.style(styleKey, styles[styleKey]);
				}
				// add custom styles if provided
				if(options.style) {
					for(var styleKey in options.style) {
						tooltipDiv.style(styleKey, options.style[styleKey]);
					}
				}
			})
			.on('mousemove', function(d, i) {
				if(tooltipDiv) {
					// Move tooltip
					var absMousePos = d3.mouse(d3Body.node());
					var tooltipOffset = (options.offset) ? options.offset : [10, -15];
					tooltipDiv.style('left', (absMousePos[0] + tooltipOffset[0])+'px');
					tooltipDiv.style('top', (absMousePos[1] + tooltipOffset[1])+'px');
					// TODO: selection is no longer array-like, hides it in _groups var -- this seems unideal, update/change when able
					var tooltipText = (textFunction) ? textFunction(d, d3.mouse(svg.node()), selection._groups[0], i) : null;
					// If no text, remove tooltip
					if(!tooltipText) {
						tooltipDiv.remove();
						tooltipDiv = null;
					} else {
						tooltipDiv.html(tooltipText);
					}
				}
			})
			.on("mouseout", function() {
				// Remove tooltip
				if(tooltipDiv) {
					tooltipDiv.remove();
					tooltipDiv = null;
				}
				if(!self.highlightFixed) {
					self._highlightStation(-1);
				}
			})
			.on("click", function(d, i, e) {
				var s = e[i].getAttribute("station");
				if(self.highlightFixed && s === self.highlightFixedIndex) {
					self._highlightStation(s, !self.highlightFixed);
				} else {
					self._highlightStation(s, true);
				}
			});
		};
	};
	
	return DVCompareStations;
	
});