define([
	"jquery", 
	"chosen", 
	"d3"
], function(jQuery, chosen, d3) {

	DVCompareStations = function(options) {
		if(!options) { options = {}; }
		options.margins = options.margins ? options.margins : {};
		this.margins = {
			left: (!options.margins.left && options.margins.left !== 0) ? 10 : options.margins.left, 
			right: (!options.margins.right && options.margins.right !== 0) ? 10 : options.margins.right, 
			top: (!options.margins.top && options.margins.top !== 0) ? 20 : options.margins.top, 
			bottom: (!options.margins.bottom && options.margins.bottom !== 0) ? 10 : options.margins.bottom
		};
		this.containerWidth = options.width ? options.width : 760;
		this.width = this.containerWidth - this.margins.left - this.margins.right;
		this.containerHeight = 0;
		this.height = 0;
		this.barHeight = options.barHeight ? options.barHeight : 20;
		this.barSpacing = options.barSpacing ? options.barSpacing : 4;
		
		this.data = null;
		this.containerSelect = null;
		this.container = null;
		this.svg = null;
		this.svgGraph = null;
		this.axes = null;
		
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
		
		this.colors = options.colors;
		if(!this.colors || !this.colors.length) {
			this.colors = [
				{
					min: 0,
					color: "#19d"
				}
			];
		}
		this.selectedColor = options.selectedColor ? options.selectedColor : "#04a";
		
		this.stationsSelect = null;
		this.title = null;
		this.units = null;
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
				self._highlightStation($(this).val());
			});
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
		var options = [];
		for(var s = 0; s < this.data.stations.length; s++) {
			options.push({
				text: this.data.stations[s].name, 
				value: s
			});
		}
		options.sort(function(a, b) {
			return a.text > b.text ? 1 : -1;
		});
		for(var o = 0; o < options.length; o++) {
			this.stationsSelect.append(
				$("<option>", options[o])
			);
		}
		this.stationsSelect.val(null);
		this.stationsSelect.trigger('chosen:updated');
	};
	
	DVCompareStations.prototype._highlightStation = function(h) {
		if(!this.svg) { return; }
		var self = this;
		this.svgGraph.selectAll(".sg-bar")
			.attr("fill", function(s, i) {
				return self._colorFunction(s, i, h);
			});
		var scrollTo = $("#sg-bar-"+h).offset().top - 130;
		var scrollLen = Math.abs(scrollTo - $('body').scrollTop());
		$('body').animate(
			{scrollTop: scrollTo}, 
			50 + 100*Math.log(10*scrollLen)
		);
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
	
	DVCompareStations.prototype._colorFunction = function(s, i, h) {
		if(i == h) { // may be comparing int to string so use loose comparison
			return this.selectedColor;
		}
		var color;
		for(var c = 0; c < this.colors.length; c++) {
			color = this.colors[c].color;
			if(s.value < this.colors[c].min) {
				break;
			}
		}
		return color;
	};
	
	DVCompareStations.prototype._draw = function() {
		if(!this.data || !this.svg) { return; }
		
		var max = this.data.stations[0].value;
		var precision = 0; // let d3 handle tick formats but needed for tooltip
		if(max < 4.5) {
			max = 0.1*Math.ceil(10*max);
			precision = (max < 1) ? 3 : 2;
		} else if(max < 10) {
			max = Math.ceil(max);
			precision = 1;
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
		var halfBarSpacing = 0.5*this.barSpacing;
		d3.selectAll("svg > *").remove();
		this.height = halfBarSpacing + this.barHeight + this.data.stations.length * (this.barHeight + this.barSpacing);
		this.containerHeight = this.height + this.margins.top + this.margins.bottom;
		this.svg.attr("height", this.containerHeight);
		this.svgGraph = this.svg.append("g")
			.attr("transform", "translate(" + this.margins.left + "," + this.margins.top + ")");
	
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
//		this.svgGraph.append("text")
//			.attr("class", "sg-title")
//			.attr("text-anchor", "middle")
//			.attr("transform", "translate(" + (0.5*this.width) + "," + (30-this.margins.top) + ")")
//			.style("font-size", 15)
//			.text(this.title);
		
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

		// define clip paths
		this.svg.append("defs").selectAll("clipPath")
			.data(this.data.stations).enter()
			.append("clipPath")
				.attr("id", function(d, i) { return "clip-" + i; })
			.append("rect")
				.attr("x", this.margins.left)
				.attr("y", function(s) { return halfBarSpacing+ self.y.scale(s.name) - self.barHeight; })
				.attr("width", function(s) { return self.x.scale(s.value) - self.margins.left; })
				.attr("height", this.barHeight);
		
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
	
		// draw bars
		this.svgGraph.selectAll(".sg-bar")
			.data(this.data.stations).enter()
			.append("rect")
				.attr("class", "sg-bar")
				.attr("id", function(s, i) { return "sg-bar-" + i; })
				.attr("x", this.margins.left)
				.attr("y", function(s) { return halfBarSpacing + self.y.scale(s.name) - self.barHeight; })
				.attr("width", function(s) { return self.x.scale(s.value) - self.margins.left; })
				.attr("height", this.barHeight)
				.attr("fill", function(s, i) {
					return self._colorFunction(s, i, -1);
				});
		
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
		
		// draw axes last so they're on top
		this.x.g = this.svgGraph.append("g")
			.attr("class", "sg-xaxis")
			.attr("transform", "translate(0," + this.margins.top + ")")
			.call(this.x.axis);
		this.y.g = this.svgGraph.append("g")
			.attr("class", "sg-yaxis")
			.attr("transform", "translate(" + this.margins.left + ",0)")
			.call(this.y.axis);
	
		// add tooltip
		this.svgGraph.selectAll(".sg-bar, .sg-label").call(
			this._constructTooltipFunctionality(
				function(d, p, s, i) {
					return (
						"<b>" + d.name + "</b><br />"
						+ d.value.addCommas(precision) + " " + self.units
					);
				}, 
				{offset: [15, 5]}
			)
		);
	};
	
	// copied from simple-graph
	DVCompareStations.prototype._constructTooltipFunctionality = function(textFunction, options) {
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
			.on("mouseout", function(d, i) {
				// Remove tooltip
				if(tooltipDiv) {
					tooltipDiv.remove();
					tooltipDiv = null;
				}
			});
		};
	};
	
	return DVCompareStations;
	
});