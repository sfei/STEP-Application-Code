
// array of threshold values on which legend fit to
var thresholds;

var thresholdsContainer;

function legendInit(container) {
	var legendContainer = $("<div id='legend-container'>").appendTo(container)
		.draggable({containment: "parent"});
	$("<div id='legend-content'></div>").appendTo(legendContainer)
		.append("<div id='legend-table'></div>")
		.append("<div id='legend-symbols'><hr/></div>");
	// dragging cursors
	addGrabCursorFunctionality(legendContainer);
	// create the water type symbology
	createWaterTypeLegend();
	// hide on init, show after thresholds loaded
	legendContainer.hide();
}
	
function createWaterTypeLegend() {
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
	$("#legend-symbols").append("<hr />");
}

function resetThresholds() {
	$.ajax({
		url: 'lib/getThresholds.php', 
		data: lastQuery, 
		dataType: 'json', 
		success: function(data) {
			updateThresholds(data);
			refreshStations();
		}, 
		error: function(e) {
			alert(defaultErrorMessage + "(Error Thresholds)");
		}
	});
}

function updateThresholds(data, validate) {
	// while it should be encoded properly, ensure proper type conversion
	for(var i = 0; i < data.length; i++) {
		data[i].value = parseFloat(data[i].value);
	}
	// for user inputs thresholds need to validate
	if(validate) {
		if(!data || data.length === 0) { return; }
		var uniqueValues = [];
		data = data
			.filter(function(item) {
				// values must be positive, non-zero
				if(item.value <= 0) { return false; }
				// no duplicate values
				if(uniqueValues.hasOwnProperty(item.value)) { return false; }
				uniqueValues[item.value] = true;
				return true;
			})
			.sort(function(a,b) {
				// ensure ascending order
				return a.value - b.value;
			});
		// remove any comments
		for(var i = 0; i < data.length; i++) {
			data[i].units = thresholds[0].units;
			data[i].comments = "User-Defined Threshold";
		}
	}
	thresholds = data;
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
	table.html("<div class='legend-table-row' style='height:auto;text-align:center;font-size:16px;font-weight:bolder;margin:4px 0px;'>" + title + "</div><hr />");
	// do legend in descending order
	for(var i = thresholds.length-1; i >= -1; i--) {
		var row = "<div class='legend-table-row'>";
		var threshold = (i >= 0) ? thresholds[i] : { color:markerFactory.hexMap[0], value:0, units:thresholds[0].units, comments:"Not Detected" };
		row += "<div class='legend-table-cell' style='width:26px;clear:left;border-radius:4px;background-color:" + threshold.color + ";'>&nbsp;</div>";
		row += "<div class='legend-table-cell' style='width:70px;margin-right:10px;text-align:right;'>" + ((i === thresholds.length-1) ? "+" : "") + threshold.value + " " + threshold.units + "</div>";
		row += "<div class='legend-table-cell' style='display:table;width:300px;clear:right;'><span style='display:table-cell;vertical-align:middle;line-height:120%;'>" + threshold.comments + "</span></div>";
		row += "</div>";
		table.append(row);
	}
	// button to edit thresholds
	$("<div id='thresholds-controls' style='text-align:center;'></div>").appendTo($("#legend-table"))
		.append(
			$("<div id='open-custom-thresholds' class='button'>Edit Thresholds</div>")
				.css({
					'display': 'inline-block', 
					'margin-left': 'auto', 
					'width': 120, 
					'text-align': 'center'
				})
				.click(function() { showCustomThresholdsPanel($("#map-view")); })
		)
		.append(
			$("<div id='reset-thresholds' class='button'>Reset Thresholds</div>").appendTo($("#legend-table"))
				.css({
					'display': 'inline-block', 
					'margin-left': 15, 
					'margin-right': 'auto', 
					'width': 120, 
					'text-align': 'center'
				})
				.click(function() { resetThresholds(); })
		);
	$("#legend-container").show();	// only necessary for first load, since legend is hidden until data loaded
	// getting divs to fit content across all browsers is a pain so just do it manually
	$("#legend-container").height($("#legend-content").height()+10);
}

function showCustomThresholdsPanel(container) {
	if(!thresholdsContainer) {
		thresholdsContainer = $("<div id='custom-thresholds-container'>").appendTo(container)
			.center()
			.draggable({containment: "parent"});
		addGrabCursorFunctionality(thresholdsContainer);
	} else {
		thresholdsContainer.html("");
	}
	var panel = $("<div id='custom-thresholds-content'></div>").appendTo(thresholdsContainer);
	var buttonStyle = {
		'display': 'inline-block',
		'width': 70, 
		'margin': "0 auto", 
		'text-align': 'center'
	};
	// add title
	panel.append("<span style='font-weight:bolder;font-size:16px;'>" + lastQuery.contaminant + " Thresholds</span><hr />");
	// append threshold inputs
	var inputs = $("<div id='custom-thresholds-inputs-container'></div>").appendTo(panel);
	for(var i = 0; i < thresholds.length; i++) {
		addThresholdControl(inputs, thresholds[thresholds.length-1-i].value);
	}
	// add/remove buttons
	panel.append("<hr />");
	var addThreshold = $("<div id='custom-thresholds-add' class='button'>Add</div>").appendTo(panel)
		.css(buttonStyle);
	var removeThreshold = $("<div id='custom-thresholds-remove' class='button'>Remove</div>").appendTo(panel)
		.css(buttonStyle);
	panel.append("<hr />");
	// add/remove thresholds
	addThreshold.click(function() {
		if($(".custom-threshold-control").length < 8) {
			addThresholdControl(inputs, 0); 
		}
	});
	removeThreshold.click(function() { 
		if($(".custom-threshold-control").length > 3) {
			$(".custom-threshold-control").last().remove(); 
		}
	});
	// append buttons
	$("<div id='custom-thresholds-submit'></div>").appendTo(panel)
		.css({
			'text-align': 'center'
		})
		.append(
			$("<div id='custom-thresholds-submit' class='button'>Submit</div>").css(buttonStyle)
		)
		.append(
			$("<div id='custom-thresholds-cancel' class='button'>Cancel</div>").css(buttonStyle)
		);
	// close functionality
	$("#custom-thresholds-cancel").click(function() {
		thresholdsContainer.remove();
		thresholdsContainer = null;
	});
	// submit functionality
	$("#custom-thresholds-submit").click(function() { 
		var data = [];
		$(".custom-threshold-input").each(function(i, element) {
			data.push({value: element.value});
		});
		thresholdsContainer.remove(); 
		thresholdsContainer = null;
		updateThresholds(data, true);
		refreshStations();
	});
}

function addThresholdControl(container, value) {
	container.append(
		"<div class='custom-threshold-control'>"  +
			"<input class='custom-threshold-input' type='number' step='0.1' min='0.01' value='" + value + "' />&nbsp;" + thresholds[0].units + 
		"</div>"
	);
}