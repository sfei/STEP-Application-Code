
var thresholds;

function legendInit() {
	// set draggable and cursor functionality
	var legend = $("#legend-container").draggable({containment: "parent"});
	legend.mouseup(function(evt) {
			legend.switchClass("grabbing", "grab");
		})
		.mousedown(function(evt) {
			legend.switchClass("grab", "grabbing");
		});	
	// hide on init, show after thresholds loaded
	legend.hide();
	// create svg shapes legend
	var svg = d3.select("#legend-symbols")
	  .append("svg")
		.attr("width", 380)
		.attr("height", 30)
	  .append("g")
	    .attr("transform", "translate(5,0)");
	// circle (for lakes/reservoirs)
	svg.append("circle")
		.attr("cx", 10)
		.attr("cy", 15)
		.attr("r", 10)
		.attr("stroke-width", 2.0)
		.attr("stroke", "black")
		.style("fill", "none");
	svg.append("text")
		.attr("x", 25)
		.attr("y", 15)
		.attr("dy", ".35em")
		.style("text-anchor", "start")
		.style("font-size", "13px")
		.text("Lake/Reservoir");
	// triangle (for coastal/ocean)
	svg.append("path")
		.attr("d", "M 140 25 L 164 25 L 152 5 z")
		.attr("stroke-width", 2.0)
		.attr("stroke", "black")
		.style("fill", "none");
	svg.append("text")
		.attr("x", 168)
		.attr("y", 15)
		.attr("dy", ".35em")
		.style("text-anchor", "start")
		.style("font-size", "13px")
		.text("Coast/Ocean");
	// diamond (for rivers and misc)
	svg.append("rect")
		.attr("width", 17)
		.attr("height", 17)
		.attr("x", 280)
		.attr("y", 6)
		.attr("transform", "rotate(45,289,14)")
		.attr("stroke-width", 2.0)
		.attr("stroke", "black")
		.style("fill", "none");
	svg.append("text")
		.attr("x", 307)
		.attr("y", 15)
		.attr("dy", ".35em")
		.style("text-anchor", "start")
		.style("font-size", "13px")
		.text("River/Misc.");
}

//************************************************************************************************************
// Legend and marker style functions (part of them, core of is is in marketFactory.js)
//************************************************************************************************************
function updateThresholds(data, validate) {
	thresholds = data;
	// while it should be encoded properly, ensure proper type conversion
	for(var i = 0; i < thresholds.length; i++) {
		thresholds[i].value = parseFloat(thresholds[i].value);
	}
	// for user inputs thresholds need to validate
	if(validate) {
		var uniqueValues = [];
		thresholds = thresholds
			.filter(function(item) {
				// values must be positive, non-zero
				if(item.value <= 0) { return false; }
				// no duplicate values
				if(uniqueValues.hasOwnProperty(item.value)) { return false; }
				uniqueValues[item.value] = true;
				return;})
			.sort(function(a,b) {
				// ensure ascending order
				return b.value - a.value;
			});
		// remove any comments
		for(var i = 0; i < thresholds.length; i++) {
			thresholds[i].comments = "";
		}
	}
	updateThresholdStyles();
	updateLegend();
}
	
function updateThresholdStyles() {
	var numThresholds = thresholds.length;
	var stretchFactor = 3; // for a nice gradient instead of just solid colors
	// set the style function (see MarkerFactory.js)
	markerFactory.setStyle({
		resolution: numThresholds*stretchFactor,
		valueFunction: function(feature) { return getThresholdColorIndex(feature.get("value")); }
	});
	// get the color values for each threshold
	for(var i = 0; i < numThresholds; i++) {
		thresholds[i].color = markerFactory.hexMap[(1+i)*stretchFactor];
	}
}

function getThresholdColor(value) {
	var colorIndex = !isNaN(value) ? getThresholdColorIndex(value) : 0;
	return markerFactory.hexMap[Math.round(colorIndex*markerFactory.resolution)];
}

// calculate color index
function getThresholdColorIndex(value) {
	var numThresholds = thresholds.length;
	var iColor = numThresholds;
	for(var i = 0; i < numThresholds; i++) {
		if(value <= thresholds[i].value) {
			if(i === 0) {
				iColor = value/thresholds[i].value;
			} else {
				iColor = i + (value - thresholds[i-1].value)/(thresholds[i].value - thresholds[i-1].value);
			}
			break;
		}
	}
	iColor /= numThresholds;
	return iColor;
}

function updateLegend() {
	var title;
	var capitalizeSpecies = "<span style='text-transform:capitalize;'>" + lastQuery.species + "</span>";
	if(lastQuery.species === 'highest' || lastQuery.species === 'lowest') {
		title = capitalizeSpecies + " Average " + lastQuery.contaminant + " Concentration for Any Species"; 
	} else {
		title = lastQuery.contaminant + " Concentrations in " + capitalizeSpecies;
	}
	title += " (" + thresholds[0].units + ")";
	var table = $("#legend-table");
	table.html("<div class='legend-table-row' style='text-align:center;font-size:16px;font-weight:bolder;margin:4px 0px;'>" + title + "</div><hr />");
	// do legend in descending order
	for(var i = thresholds.length-1; i >= -1; i--) {
		var row = "<div class='legend-table-row'>";
		var threshold = (i >= 0) ? thresholds[i] : { color:markerFactory.hexMap[0], value:0, units:thresholds[0].units, comments:"None" };
		row += "<div class='legend-table-cell' style='width:26px;clear:left;border-radius:4px;background-color:" + threshold.color + ";'>&nbsp;</div>";
		row += "<div class='legend-table-cell' style='width:70px;margin-right:10px;text-align:right;'>" + ((i === thresholds.length-1) ? "+" : "") + threshold.value + " " + threshold.units + "</div>";
		row += "<div class='legend-table-cell' style='display:table;width:300px;clear:right;'><span style='display:table-cell;vertical-align:middle;line-height:120%;'>" + threshold.comments + "</span></div>";
		row += "</div>";
		table.append(row);
	}
	$("#legend-container").show();	// only necessary for first load, since legend is hidden until data loaded
	// getting divs to fit content across all browsers is a pain so just do it manually
	$("#legend-container").height(table.height()+62); // add SVG height and margins and hr
}