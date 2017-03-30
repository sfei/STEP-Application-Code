define([
	"jquery", 
	"d3", 
	"chosen"
], function(jQuery, d3, chosen) {

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
	
	DVCompareStations.prototype.update = function(query) {
		var self = this;
		this._pullData({
			queryObj: query, 
			success: function() {
				self._updateStationsSelect();
				self._draw();
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
		$('html, body').animate({
			scrollTop: $("#sg-bar-"+h).offset().top
		}, 100 + 100*Math.log(10*h));
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
		if(i == h) {
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
		if(max < 4.5) {
			max = 0.1*Math.ceil(10*max);
		} else if(max < 10) {
			max = Math.ceil(max);
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
		this.height = this.data.stations.length * (this.barHeight + this.barSpacing);
		this.containerHeight = this.height + this.margins.top + this.margins.bottom;
		this.svg.attr("height", this.containerHeight);
		this.svgGraph = this.svg.append("g")
			.attr("transform", "translate(" + this.margins.left + "," + this.margins.top + ")");
		
		// axes
		this.x = {};
		this.x.scale = d3.scaleLinear()
			.range([this.margins.left, this.margins.left + this.width])
			.domain([0.0, max]);
		this.x.axis = d3.axisTop(this.x.scale);
		
		this.y = {};
		this.y.scale = d3.scaleBand()
			.range([this.margins.top, this.margins.top + this.height])
			.padding(this.barSpacing*0.5)
			.domain(this.data.stations.map(function(s) { return s.name; }));
		this.y.axis = d3.axisLeft(this.y.scale)
			// hide tick labels
			.tickValues([]);
	
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
				.attr("y", function(s) { return self.y.scale(s.name) - self.barHeight; })
				.attr("width", function(s) { return self.x.scale(s.value) - self.margins.left; })
				.attr("height", this.barHeight);
		
		// draw background labels
		this.svgGraph.selectAll(".sg-label-back")
			.data(this.data.stations).enter()
			.append("text")
				.attr("class", "sg-label-back")
				.attr("fill", "black")
				.attr("x", this.margins.left + labelPadding)
				.attr("y", function(s) { return self.y.scale(s.name) - labelOffset; })
				.style("font-size", fontSize)
				.text(function(s) { return s.name; });
	
		// draw bars
		this.svgGraph.selectAll(".sg-bar")
			.data(this.data.stations).enter()
			.append("rect")
				.attr("class", "sg-bar")
				.attr("id", function(s, i) { return "sg-bar-" + i; })
				.attr("x", this.margins.left)
				.attr("y", function(s) { return self.y.scale(s.name) - self.barHeight; })
				.attr("width", function(s) { return self.x.scale(s.value) - self.margins.left; })
				.attr("height", this.barHeight)
				.attr("fill", function(s, i) {
					return self._colorFunction(s, i, -1);
				});
		
		// draw foreground labels with clip-path
		this.svgGraph.selectAll(".sg-label-front")
			.data(this.data.stations).enter()
			.append("text")
				.attr("class", "sg-label-front")
				.attr("fill", "white")
				.attr("x", this.margins.left + labelPadding)
				.attr("y", function(s) { return self.y.scale(s.name) - labelOffset; })
				.attr("clip-path", function(d, i) { return "url(#clip-" + i + ")"; })
				.style("font-size", fontSize)
				.text(function(s) { return s.name; });
		
		// draw axes last (so they're on top)
		this.x.g = this.svgGraph.append("g")
			.attr("class", "sg-xaxis")
			.attr("transform", "translate(0," + this.margins.top + ")")
			.call(this.x.axis);
	
		this.y.g = this.svgGraph.append("g")
			.attr("class", "sg-yaxis")
			.attr("transform", "translate(" + this.margins.left + ",0)")
			.call(this.y.axis);
	};
	
	return DVCompareStations;
	
});