
// array of threshold values on which legend fit to
var thresholds;
// DOM element container
var thresholdsContainer;
// threshold group key
var selectedThresholdGroup = "standard";
var thresholdGroups = {
	"standard": "Non-Specific Thresholds", 
	"oehha-women-1845-children": "Women Aged 18-45 Years and Children Aged 1-17 Years",
	"oehha-men-women-over-45": "Women Over 45 Years and Men", 
	"custom": "User Defined Thresholds"
};

//************************************************************************************************************
// Constructor
//************************************************************************************************************
/**
 * Initialize the legend. However the legend is initialized as hidden until thresholds are set.
 * @param {jQuery} container - jQuery object for element for legend container. Not so much structurally but as
 *    to limit the draggable range of the legend div.
 */
function legendInit(container) {
	$("<div id='show-legend-tab'>Show Legend</div>")
	  .appendTo(container)
		.click(function() { legendShow(); })
		.hide();
	var legendContainer = $("<div id='legend-container'>")
	  .appendTo(container)
		.addClass("container-styled")
		.draggable({containment: "parent"});
	$("<div id='legend-content'></div>")
	  .appendTo(legendContainer)
		.addClass("inner-container-style")
		.append("<div id='legend-title'></div>")
		.append("<div id='legend-symbols'><hr/></div>")
		.append(
			"<div id='thresholds-control'>" + 
				"<hr />" + 
				"<select id='threshold-group-select'></select>" + 
			"</div>"
		)
		.append("<div id='legend-table'></div>");
	$("<div id='hide-legend-tab'>Hide Legend</div>")
	  .appendTo(legendContainer)
		.on('click', legendHide);
	// dragging cursors
	addGrabCursorFunctionality(legendContainer);
	// create the water type symbology
	createWaterTypeLegend();
	// hide on init, show after thresholds loaded
	legendContainer.hide();
	// add functionality to threshold group select here
	$("#threshold-group-select")
		.on('change', function() {
			var group = $("#threshold-group-select option:selected").val();
			if(group === "customize") {
				showCustomThresholdsPanel($("#map-view"));
			} else {
				selectedThresholdGroup = group;
				thresholdsChanged();
			}
		});
}

//************************************************************************************************************
// Symbol legend for water types
//************************************************************************************************************
/**
 * Create the legend for the water type symbols. This is all done in D3/SVG so only needs to be called once as 
 * it never changes.
 */
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
		.attr("cx", 5)
		.attr("cy", 15)
		.attr("r", 8)
		.attr("stroke-width", 2.0)
		.attr("stroke", "black")
		.style("fill", "none");
	svg.append("text")
		.attr("x", 20)
		.attr("y", 15)
		.attr("dy", ".35em")
		.style("text-anchor", "start")
		.style("font-size", "13px")
		.text("Lake/Reservoir");
	// triangle (for coastal/ocean)
	svg.append("path")
		.attr("d", "M 130 22 L 150 22 L 140 7 z")
		.attr("stroke-width", 2.0)
		.attr("stroke", "black")
		.style("fill", "none");
	svg.append("text")
		.attr("x", 157)
		.attr("y", 15)
		.attr("dy", ".35em")
		.style("text-anchor", "start")
		.style("font-size", "13px")
		.text("Coast/Ocean");
	// diamond (for rivers and misc)
	svg.append("rect")
		.attr("width", 14)
		.attr("height", 14)
		.attr("x", 270)
		.attr("y", 9)
		.attr("transform", "rotate(45,279,14)")
		.attr("stroke-width", 2.0)
		.attr("stroke", "black")
		.style("fill", "none");
	svg.append("text")
		.attr("x", 294)
		.attr("y", 15)
		.attr("dy", ".35em")
		.style("text-anchor", "start")
		.style("font-size", "13px")
		.text("River/Stream");
	$("#legend-symbols");
}

//************************************************************************************************************
// General thresholds functions
// While separated here as functions used to modify and update the thresholds, it is fairly interlinked with 
// the {@link markerFactory} global defined in map.js which also defines the symbology for the stations. As 
// such thresholds must be updated first (to update the MarkerFactory) before redrawing the stations layer.
//************************************************************************************************************
/**
 * Update the selection options for thresholds
 */
function updateThresholdGroupSelect() {
	// default selected threshold group (try to carry over last)
	if(!selectedThresholdGroup || !(selectedThresholdGroup in thresholds)) {
		selectedThresholdGroup = "select";
		if(!(selectedThresholdGroup in thresholds)) {
			for(var group in thresholds) {
				if(group !== "custom") {
					selectedThresholdGroup = group;
					break;
				}
			}
		}
	}
	// append custom option
	thresholds.custom = [];
	// empty and fill select
	var selectElem = $("#threshold-group-select").html("");
	for(var group in thresholds) {
		var option = $("<option></option>")
		  .appendTo(selectElem)
			.attr("value", group)
			.text((group in thresholdGroups) ? thresholdGroups[group] : group);
		// custom option is hidden (only programatically selected after defining custom thresholds)
		if(group === "custom") {
			option.prop("disabled", true).css("display", "none");
		}
	}
	selectElem.val(selectedThresholdGroup);
	// to customize, there is an option specifically to customize (thus it can be reselected)
	$("<option></option>")
	  .appendTo(selectElem)
		.attr("value", "customize")
		.text("Customize Thresholds");
}

/**
 * Reset the thresholds using the last successful query to get the threshold values for the contaminant. Used 
 * to clear out the user-defined thresholds.
 */
function resetThresholds() {
	$.ajax({
		url: 'lib/getThresholds.php', 
		data: lastQuery, 
		dataType: 'json', 
		success: function(data) {
			updateThresholds(data);
		}, 
		error: function(e) {
			alert(defaultErrorMessage + "(Error Thresholds)");
		}
	});
}

/**
 * Update the thresholds and accordingly update the legend and style function (specifically the value function
 * in the MarkerFactory). As such call after getting the returned data from a query but before reloading the 
 * stations layer.
 * @param {Object[]} data - The thresholds data returned by the query or the custom thresholds set by the 
 *    user.
 * @param {number} data[].value - The threshold value.
 * @param {string} data[].units - The units.
 * @param {string} data[].comments - Any associated comments with this thresholds
 * @param {boolean} custom - If set true (for user-set thresholds), this validates and corrects the input 
 *   thresholds as necessary.
 */
function updateThresholds(data, selectThresholdGroup, custom) {
	// convert to numeric type
	if(!custom) {
		var dataByGroup = {};
		for(var i = 0; i < data.length; i++) {
			// ensure numeric type
			data[i].value = parseFloat(data[i].value);
			var group = data[i].group;
			// adjust comments in specific thresholds
			if(group !== "standard") {
				data[i].fullComments = data[i].comments;
				var cparts = data[i].comments.split("-");
				data[i].comments = cparts[0] + "-" + cparts.pop();
			}
			// sort by thresholds group
			if(group in dataByGroup) {
				dataByGroup[group].push(data[i]);
			} else {
				dataByGroup[group] = [data[i]];
			}
		}
		// sort each grou
		for(var group in dataByGroup) {
			dataByGroup[group].sort(function(a,b) {
				return a.value - b.value;
			});
		}
		thresholds = dataByGroup;
		selectedThresholdGroup = selectThresholdGroup;
		updateThresholdGroupSelect();
	} else {
		// for user inputs thresholds need to validate
		if(!data || data.length === 0) { return false; }
		var uniqueValues = [];
		data = data.filter(function(item) {
				item.value = parseFloat(item.value);
				// values must be positive, non-zero
				if(item.value <= 0) { return false; }
				// no duplicate values
				if($.inArray(uniqueValues, item.value) >= 0) {
					return false;
				}
				uniqueValues.push(item.value);
				return true;
			})
			.sort(function(a,b) {
				// ensure ascending order
				return a.value - b.value;
			});
		// match threshold comments with existing ones if they exist
		var lastThresholds = thresholds[selectedThresholdGroup];
		for(var i = 0; i < data.length; i++) {
			// also set the units as same as last
			data[i].units = lastThresholds[0].units;
			// default for custom thresholds
			var comment = "User-Defined Threshold";
			// loop through last thresholds (which means comments if lost can't be reattained until reset
//			for(var j = 0; j < lastThresholds.length; j++) {
//				if(data[i].value === lastThresholds[j].value) {
//					comment = lastThresholds[j].comments;
//					break;
//				}
//			}
			data[i].comments = comment;
		}
		thresholds.custom = data;
		selectedThresholdGroup = "custom";
	}
	thresholdsChanged();
	return true;
}

function thresholdsChanged() {
	updateThresholdStyles();
	updateLegend();
	refreshStations();
}

/**
 * Update the colors (both for the legend and the layer symbology) according to the new thresholds. Takes no 
 * parameters but instead uses the global {@link #thresholds}. Updates the MarkerFactory to do this, which is 
 * linked to the style function for the stations layer. Does not usually have to be called explicitly as it's 
 * called in {@link #updateThresholds(data,selectThresholdGroup,validate)}.
 */
function updateThresholdStyles() {
	var thresholdsData = thresholds[selectedThresholdGroup];
	var numThresholds = thresholdsData.length;
	var stretchFactor = 3; // for a nice gradient instead of just solid colors
	// set the style function (see MarkerFactory.js)
	markerFactory.setStyle({
		resolution: numThresholds*stretchFactor,
		valueFunction: function(feature) { return getThresholdColorIndex(feature.get("value")); }
	});
	// get the color values for each threshold
	for(var i = 0; i < numThresholds; i++) {
		thresholdsData[i].color = markerFactory.hexMap[(1+i)*stretchFactor];
	}
}

/**
 * Get the associated color (from the MarkerFactory) of the gradient for the given value and the currently set
 * thresholds. Note that colors do not scale evenly and linearlly across the entire gradient. See {@link 
 * #getThresholdColorIndex(value)} for details.
 * @param {type} value - The value to match to a color in the gradient.
 * @returns {string} The color as a hex string (with leading '#').
 */
function getThresholdColor(value) {
	var colorIndex = !isNaN(value) ? getThresholdColorIndex(value) : 0;
	return markerFactory.hexMap[Math.round(colorIndex*markerFactory.resolution)];
}

/**
 * For a given value, find it's position in the gradient. This is returned as a normalized number from 0-1 
 * representing the scale of the gradient. Thresholds are scaled evenly across the gradient regardless of 
 * their actual value. E.g. thresholds with values of 0, 25, and 100 would be placed in the gradient at 
 * normalized positions of 0.0, 0.5, and 1.0 respectively. Values are first placed between such two thresholds
 * then interpolated linearally. This often results in a series of linear, but uneven scaling by value to 
 * position in the color gradient. E.g. going with the previous example, a value of 75 would be placed between 
 * the 25(0.5) and 100(1.0) threshold, then linearlly interpolated to a normalized gradient value of 0.833
 * between the two.
 * @param {type} value - The value to match to a color in the gradient.
 * @returns {number} The color in the gradient as a normalized value from 0-1.
 */
function getThresholdColorIndex(value) {
	var thresholdsData = thresholds[selectedThresholdGroup];
	var numThresholds = thresholdsData.length;
	var iColor = numThresholds;
	for(var i = 0; i < numThresholds; i++) {
		if(value <= thresholdsData[i].value) {
			if(i === 0) {
				iColor = value/thresholdsData[i].value;
			} else {
				iColor = i + (value - thresholdsData[i-1].value)/(thresholdsData[i].value - thresholdsData[i-1].value);
			}
			break;
		}
	}
	iColor /= numThresholds;
	return iColor;
}

//************************************************************************************************************
// Legend UI
//************************************************************************************************************

function legendShow() {
	$("#legend-container").show();
	$("#show-legend-tab").hide("slide", { direction: "down" }, 100);
}

function legendHide() {
	$("#legend-container").hide();
	$("#show-legend-tab").show("slide", { direction: "down" }, 400);
}

/**
 * Cross-browser method for automatically adjusting divs with CSS alone is at best buggy, just do it manually.
 */
function adjustLegendContainerHeight() {
	var height = 0;
	if($("#legend-content").is(":visible")) {
		height += $("#legend-content").height() + 3;
	} else {
		height += 22;	// min height to leave button visible
	}
	$("#legend-container").height(height);
}

/**
 * Update the legend HTML based on the last query and updated thresholds.
 */
function updateLegend() {
	var thresholdsData = thresholds[selectedThresholdGroup];
	var title;
	var capitalizeSpecies = "<span style='text-transform:capitalize;'>" + lastQuery.species + "</span>";
	var yearString = (lastQuery.startYear === lastQuery.endYear) ? lastQuery.startYear : (lastQuery.startYear + "-" + lastQuery.endYear);
	if(lastQuery.species === 'highest' || lastQuery.species === 'lowest') {
		title = capitalizeSpecies + " Average " + lastQuery.contaminant + " Concentration for Any Species";
	} else {
		title = lastQuery.contaminant + " Concentrations in " + capitalizeSpecies;
	}
	title += " (" + thresholdsData[0].units + ") " + yearString;
	$("#legend-title").html(title);
	var table = $("#legend-table").html("");
	// do legend in descending order
	for(var i = thresholdsData.length-1; i >= -1; i--) {
		var row = "<div class='legend-table-row'>";
		var threshold = (i >= 0) ? thresholdsData[i] : { color:markerFactory.hexMap[0], value:0, units:thresholdsData[0].units, comments:"Not Detected" };
		row += "<div class='legend-table-cell' style='width:26px;clear:left;border-radius:4px;background-color:" + threshold.color + ";'>&nbsp;</div>";
		row += "<div class='legend-table-cell' style='width:70px;margin-right:10px;text-align:right;'>" + ((i === thresholdsData.length-1) ? "+" : "") + threshold.value + " " + threshold.units + "</div>";
		row += "<div class='legend-table-cell' style='display:table;width:300px;clear:right;'><span style='display:table-cell;vertical-align:middle;line-height:120%;'>" + threshold.comments + "</span></div>";
		row += "</div>";
		table.append(row);
	}
	// button to edit thresholds
//	$("<div id='thresholds-controls' style='text-align:center;'></div>").appendTo($("#legend-table"))
//		.append("<hr style='margin-bottom:6px;' />")
//		.append(
//			$("<div id='open-custom-thresholds' class='button'>Edit Thresholds</div>")
//				.css({
//					'display': 'inline-block', 
//					'margin-left': 'auto', 
//					'width': 80, 
//					'text-align': 'center'
//				})
//				.click(function() { showCustomThresholdsPanel($("#map-view")); })
//		)
//		.append(
//			$("<div id='reset-thresholds' class='button'>Reset Thresholds</div>").appendTo($("#legend-table"))
//				.css({
//					'display': 'inline-block', 
//					'margin-left': 15, 
//					'margin-right': 'auto', 
//					'width': 80, 
//					'text-align': 'center'
//				})
//				.click(function() { resetThresholds(); })
//		)
//		.append(
//			$("<div id='hide-legend' class='button'>Hide Legend</div>").appendTo($("#legend-table"))
//				.css({
//					'display': 'inline-block', 
//					'width': 120, 
//					'margin-bottom': 8, 
//					'text-align': 'center'
//				})
//				.click(function() { legendHide(); })
//		);
	// always show legend on update
	legendShow();
	// dynamically set height
	adjustLegendContainerHeight();
}

//************************************************************************************************************
// Custom Thresholds
// When creating custom thresholds, the user can only add/remove thresholds and set the value. The units are 
// defined by the thresholds as they originally came. The threshold comments will be kept if applicable, by 
// matching any of the new input values to any existing value with a comment. Otherwise, new or changed values
// will be commented as "User-Defined Threshold". Any "lost" comment though is lost permanently (e.g. if you 
// change/remove a value associated with a comment, submit it, then edit it back in as the same value as 
// before, it will remain commented as "User-Defined Threshold") until the thresholds are reset or a new 
// query happens. The validation procedure in updateThresholds() will automatically sort the thresholds and 
// remove duplicate values or negative values. There must always be a 0-threshold, which keeps its comment as 
// "Not Detected".
//************************************************************************************************************
/**
 * Show/create the custom thresholds panel.
 * @param {jQuery} container - jQuery object for element to serve as container for custom thresholds panel. 
 *    Not so much structurally but as to limit the draggable range of the resulting div.
 */
function showCustomThresholdsPanel(container) {
	var thresholdsData = thresholds[selectedThresholdGroup];
//	if(!thresholdsContainer) {
//		thresholdsContainer = $("<div id='custom-thresholds-container'></div>")
//		  .appendTo(container)
//			.addClass("container-styled")
//			.draggable({containment: "parent"});
//		addGrabCursorFunctionality(thresholdsContainer);
//	} else {
//		thresholdsContainer.html("");
//	}
	var panel = $("<div id='custom-thresholds-content'></div>")
	  //.appendTo(thresholdsContainer)
		.addClass("inner-container-style");
	var buttonStyle = {
		'display': 'inline-block',
		'width': 70, 
		'margin': "0 auto", 
		'text-align': 'center'
	};
	// add title
	panel.append("<span style='font-weight:bolder;font-size:16px;'>Customize " + lastQuery.contaminant + " Thresholds</span><hr />");
	// append threshold inputs
	var inputs = $("<div id='custom-thresholds-inputs-container'></div>").appendTo(panel);
	var i = thresholdsData.length;
	while(i-- > 0) {
		addThresholdControl(inputs, thresholdsData[i].value);
	};
	// add/remove buttons
	var addThreshold = $("<div id='custom-thresholds-add' class='button'>+</div>")
	  .appendTo(panel)
		.css(buttonStyle)
		.css('font-weight', 'bold')
		.width(20);
	var removeThreshold = $("<div id='custom-thresholds-remove' class='button'>−</div>")
	  .appendTo(panel)
		.css(buttonStyle)
		.css('font-weight', 'bold')
		.width(20);
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
	$("<div id='custom-thresholds-buttons'></div>")
	  .appendTo(panel)
		.css({'text-align': 'center'})
		.append(
			$("<div id='custom-thresholds-cancel' class='button'>Cancel</div>").css(buttonStyle)
		)
		.append(
			$("<div id='custom-thresholds-submit' class='button'>Submit</div>").css(buttonStyle)
		);
	// center it
	//thresholdsContainer.center();
	setModal(true, true, panel);
	// close functionality
	$("#custom-thresholds-cancel").click(function() {
		hideModal();
		//thresholdsContainer.remove();
		//thresholdsContainer = null;
		$("#threshold-group-select").val(selectedThresholdGroup);
	});
	// submit functionality
	$("#custom-thresholds-submit").click(function(evt) {
		var data = [];
		$(".custom-threshold-input").each(function(i, element) {
			data.push({value: element.value});
		});
		hideModal();
		//thresholdsContainer.remove(); 
		//thresholdsContainer = null;
		var updated = updateThresholds(data, null, true);
		if(updated) {
			// set to hidden custom option
			$("#threshold-group-select").val("custom");
		} else {
			// on failure return to last selection
			$("#threshold-group-select").val(selectedThresholdGroup);
		}
	});
}

/**
 * Add an input for a custom threshold value.
 * @param {jQuery} container - jQuery object for container to append input to.
 * @param {number} value - Default/start value in input.
 */
function addThresholdControl(container, value) {
	container.append(
		"<div class='custom-threshold-control'>"  +
			"<input class='custom-threshold-input' type='number' step='0.1' min='0.01' value='" + value + "' />" + 
			"&nbsp;" + thresholds[selectedThresholdGroup][0].units + 
		"</div>"
	);
}