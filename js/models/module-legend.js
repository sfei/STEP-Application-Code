
define(["d3", "common"], function(d3, common) {
	
	function Legend(parentStepApp) {
		this.parent = parentStepApp;
		this.markerFactory = this.parent.modules.markerFactory;
		this.contaminant = "";
		// array of threshold values on which legend fit to
		this.thresholds;
		// DOM element container
		this.legendContainer;
		this.thresholdsContainer;
		// threshold group key
		this.selectedThresholdGroup = "standard";
		this.thresholdGroups = {
			"oehha-men-women-over-45": "Women Over 45 Years and Men", 
			"oehha-women-1845-children": "Women Aged 18-45 Years and Children Aged 1-17 Years",
			"standard": "Non-Specific Thresholds", 
			"custom": "User Defined Thresholds"
		};
		this.thresholdOrder = [
			"oehha-men-women-over-45", 
			"oehha-women-1845-children", 
			"standard", 
			"custom"
		];
	};
	
	/**
	 * Initialize the legend. However the legend is initialized as hidden until thresholds are set.
	 * @param {jQuery} container - jQuery object for element for legend container. Not so much structurally 
	 *        but as to limit the draggable range of the legend div.
	 */
	Legend.prototype.init = function(container) {
		var self = this;
		$("<div id='show-legend-tab'>Show Legend</div>").appendTo(container)
			.click(function() { self.legendShow(); })
			.hide();
		this.legendContainer = $("<div id='legend-container'>").appendTo("body")
			.addClass("container-styled")
			.draggable({containment: "body"});
		$("<div id='legend-content'></div>").appendTo(this.legendContainer)
			.addClass("inner-container-style")
			.append("<div id='legend-title'></div>")
			.append("<div id='legend-symbols'><hr/></div>")
			.append("<div id='legend-table'></div>");
		$("<div id='hide-legend-tab'>Hide Legend</div>").appendTo(this.legendContainer)
			.on('click', this.legendHide);
		// dragging cursors
		common.addGrabCursorFunctionality(this.legendContainer);
		// create the water type symbology
		this.createWaterTypeLegend();
		// hide on init, show after thresholds loaded
		this.legendContainer.hide();
		// add functionality to threshold group select here
		$("#threshold-group-select")
			.prop("disabled", false)
			.chosen()
			.on('change', function() {
				var group = $("#threshold-group-select option:selected").val();
				if(group === "customize") {
					self.showCustomThresholdsPanel();
				} else {
					self.selectedThresholdGroup = group;
					self.thresholdsChanged();
				}
			});
		// add help tooltip
//		$("#threshold_group_select_chosen").addClass("cm-tooltip-top").attr(
//			"cm-tooltip-msg", 
//			"Symbolize map data by these contaminant thresholds"
//		);
	};

	Legend.prototype.getThresholdBreaks = function() {
		return this.thresholds[this.selectedThresholdGroup].map(function(o) {
			return o.value;
		});
	};
	
	
	Legend.prototype.getThresholdColors = function() {
		this.thresholds[this.selectedThresholdGroup].map(function(o) {
			return o.color;
		});
		return [this.markerFactory.hexMap[0]].concat(
			this.thresholds[this.selectedThresholdGroup].map(function(o) {
				return o.color;
			})
		);
	};

	//************************************************************************************************************
	// Symbol legend for water types
	//************************************************************************************************************
	/**
	 * Create the legend for the water type symbols. This is all done in D3/SVG so only needs to be called 
	 * once as it never changes.
	 */
	Legend.prototype.createWaterTypeLegend = function() {
		// create svg shapes legend
		var svg = d3.select("#legend-symbols")
		  .append("svg")
			.attr("width", 350)
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
			.style("font-size", "12px")
			.text("Lake/Reservoir");
		// triangle (for coastal/ocean)
		svg.append("path")
			.attr("d", "M 115 22 L 135 22 L 125 7 z")
			.attr("stroke-width", 2.0)
			.attr("stroke", "black")
			.style("fill", "none");
		svg.append("text")
			.attr("x", 142)
			.attr("y", 15)
			.attr("dy", ".35em")
			.style("text-anchor", "start")
			.style("font-size", "12px")
			.text("Coast/Ocean");
		// diamond (for rivers and misc)
		svg.append("rect")
			.attr("width", 14)
			.attr("height", 14)
			.attr("x", 240)
			.attr("y", 9)
			.attr("transform", "rotate(45,249,14)")
			.attr("stroke-width", 2.0)
			.attr("stroke", "black")
			.style("fill", "none");
		svg.append("text")
			.attr("x", 264)
			.attr("y", 15)
			.attr("dy", ".35em")
			.style("text-anchor", "start")
			.style("font-size", "12px")
			.text("River/Stream");
		$("#legend-symbols");
	};

	//********************************************************************************************************
	// General thresholds functions
	// While separated here as functions used to modify and update the thresholds, it is fairly interlinked 
	// with the {@link markerFactory} global defined in map.js which also defines the symbology for the 
	// stations. As such thresholds must be updated first (to update the MarkerFactory) before redrawing the 
	// stations layer.
	//********************************************************************************************************
	/**
	 * Update the selection options for thresholds
	 */
	Legend.prototype.updateThresholdGroupSelect = function(contaminant) {
		this.selectedThresholdGroup = null;
		
		// empty and fill select
		var selectElem = $("#threshold-group-select").html("");
		var recognizedGroups = [];
//		var nonAdvancedExists = false;
		for(var i = 0; i < this.thresholdOrder.length; i++) {
			var group = this.thresholdOrder[i];
			if(group in this.thresholds) {
				recognizedGroups.push(group);
				// for mercury, skip standard as they're redundant until we put contaminant goals back in
				if(contaminant === "Mercury" && group === "standard") {
					continue;
				}
				if(!this.selectedThresholdGroup) {
					this.selectedThresholdGroup = group;
				}
				var option = $("<option>", {value: group}).appendTo(selectElem)
					.text(this.thresholdGroups[group]);
				option.attr("class", "adv-thres-grp");
			}
		}
		for(var group in this.thresholds) {
			if($.inArray(group, recognizedGroups) < 0) {
				if(!this.selectedThresholdGroup) {
					this.selectedThresholdGroup = group;
				}
				$("<option>", {value: group}).appendTo(selectElem)
					.attr("class", "adv-thres-grp")
					.text(this.thresholdGroups[group]);
			}
		}
		
		selectElem.val(this.selectedThresholdGroup);
		
		// to customize, there is an option specifically to customize (thus it can be reselected)
		this.thresholds.custom = [];
		$("<option>", {value: "customize"}).appendTo(selectElem)
			.attr("class", "adv-thres-grp")
			.text("Customize Thresholds");
		// custom option is hidden (only programatically selected after defining custom thresholds)
		$("<option>", {value: "custom"}).appendTo(selectElem)
			.text(this.thresholdGroups.custom)
			.prop("disabled", true)
			.css("display", "none");
		selectElem.trigger('chosen:updated');
	};

	/**
	 * Reset the thresholds using the last successful query to get the threshold values for the contaminant. Used 
	 * to clear out the user-defined thresholds.
	 */
	Legend.prototype.resetThresholds = function() {
		var self = this;
		var queryParams = this.parent.modules.query.getLastQuery();
		queryParams.query = "getThresholds";
		$.ajax({
			url: 'lib/query.php', 
			data: queryParams, 
			dataType: 'json', 
			success: function(data) {
				self.updateThresholds(queryParams.contaminant, data);
			}, 
			error: function(e) {
				alert(defaultErrorMessage + "(Error Thresholds)");
			}
		});
	};

	/**
	 * Update the thresholds and accordingly update the legend and style function (specifically the value 
	 * function in the MarkerFactory). As such call after getting the returned data from a query but before 
	 * reloading the stations layer.
	 * @params {string} contaminant - The contaminant name.
	 * @param {Object[]} data - The thresholds data returned by the query or the custom thresholds set by the 
	 *        user.
	 * @param {number} data[].value - The threshold value.
	 * @param {string} data[].units - The units.
	 * @param {string} data[].comments - Any associated comments with this thresholds
	 * @param {boolean} custom - If set true (for user-set thresholds), this validates and corrects the input 
	 *        thresholds as necessary.
	 */
	Legend.prototype.updateThresholds = function(contaminant, data, selectThresholdGroup, custom) {
		this.contaminant = contaminant;
		// convert to numeric type
		if(!custom) {
			var dataByGroup = {};
			for(var i = 0; i < data.length; i++) {
				// filter so only OEHHA tissue advisory levels for now
				if(!data[i].comments.startsWith("OEHHA Advisory")) {
					continue;
				}
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
			this.thresholds = dataByGroup;
			this.selectedThresholdGroup = selectThresholdGroup;
			this.updateThresholdGroupSelect(contaminant);
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
			var lastThresholds = this.thresholds[this.selectedThresholdGroup];
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
			this.thresholds.custom = data;
			this.selectedThresholdGroup = "custom";
		}
		this.thresholdsChanged();
		return true;
	};

	Legend.prototype.thresholdsChanged = function() {
		this.updateThresholdStyles();
		this.updateLegend(this.parent.modules.queryAndUI.lastQuery);
		this.parent.refreshStations();
	};

	/**
	 * Update the colors (both for the legend and the layer symbology) according to the new thresholds. Takes no 
	 * parameters but instead uses the global {@link #thresholds}. Updates the MarkerFactory to do this, which is 
	 * linked to the style function for the stations layer. Does not usually have to be called explicitly as it's 
	 * called in {@link #updateThresholds(contaminant, data,selectThresholdGroup,validate)}.
	 */
	Legend.prototype.updateThresholdStyles = function() {
		var thresholdsData = this.thresholds[this.selectedThresholdGroup];
		var stretchFactor = 1; // 3; for a nice gradient instead of just solid colors
		// set the style function (see MarkerFactory.js)
		var self = this;
		this.markerFactory.setStyle({
			resolution: (1+thresholdsData.length)*stretchFactor,
			valueFunction: function(feature) {
				return self.getThresholdColorIndex(feature.get("value"));
			}
		});
		// get the color values for each threshold
		for(var i = 0; i < thresholdsData.length; i++) {
			thresholdsData[i].color = this.markerFactory.hexMap[(i+1)*stretchFactor];
		}
	};

	/**
	 * Get the associated color (from the MarkerFactory) of the gradient for the given value and the currently set
	 * thresholds. Note that colors do not scale evenly and linearlly across the entire gradient. See {@link 
	 * #getThresholdColorIndex(value)} for details.
	 * @param {type} value - The value to match to a color in the gradient.
	 * @returns {string} The color as a hex string (with leading '#').
	 */
	Legend.prototype.getThresholdColor = function(value) {
		var colorIndex = !isNaN(value) ? getThresholdColorIndex(value) : 0;
		return this.markerFactory.hexMap[Math.round(colorIndex*this.markerFactory.resolution)];
	};

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
	Legend.prototype.getThresholdColorIndex = function(value) {
		var thresholdsData = this.thresholds[this.selectedThresholdGroup];
		var numThresholds = thresholdsData.length;
		var iColor = 0;
		for(var i = 0; i < numThresholds; i++) {
			if(value >= thresholdsData[i].value) {
				iColor++;
			} else {
				break;
			}
		}
		return iColor/this.markerFactory.resolution;
	};

	//************************************************************************************************************
	// Legend UI
	//************************************************************************************************************

	Legend.prototype.legendShow = function() {
		$("#legend-container").show();
		$("#show-legend-tab").hide("slide", { direction: "down" }, 100);
	};

	Legend.prototype.legendHide = function() {
		$("#legend-container").hide();
		$("#show-legend-tab").show("slide", { direction: "down" }, 400);
	};

	/**
	 * Cross-browser method for automatically adjusting divs with CSS alone is at best buggy, just do it manually.
	 */
	Legend.prototype.adjustLegendContainerHeight = function() {
		var height = 0;
		if($("#legend-content").is(":visible")) {
			height += $("#legend-content").height() + 3;
		} else {
			height += 22;	// min height to leave button visible
		}
		$("#legend-container").height(height);
	};

	/**
	 * Update the legend HTML based on the last query and updated thresholds.
	 */
	Legend.prototype.updateLegend = function(query) {
		var thresholdsData = this.thresholds[this.selectedThresholdGroup];
		var title = "Most Recent";
		var capitalizeSpecies = "<span style='text-transform:capitalize;'>" + query.species + "</span>";
		var yearString = (query.startYear === query.endYear) ? query.startYear : (query.startYear + "-" + query.endYear);
		if(query.species === 'highest' || query.species === 'lowest') {
			title += ", " + capitalizeSpecies +  " " + query.contaminant + " Concentration<br />for Any Species";
		} else {
			title += " " + query.contaminant + " Concentration<br />in " + capitalizeSpecies;
		}
		title += " (" + thresholdsData[0].units + ") " + yearString;
		$("#legend-title").html(title);
		var table = $("#legend-table").html("");
		var lastThreshold = null;
		// do legend in descending order
		for(var i = thresholdsData.length-1; i >= -1; i--) {
			var row = "<div class='legend-table-row'>";
			var threshold = (i >= 0) ? thresholdsData[i] : { 
				color: this.markerFactory.hexMap[0], 
				value: 0, 
				units: thresholdsData[0].units, 
				comments: ""
			};
			var label;
			if(i === thresholdsData.length-1) {
				label = "&ge; " + threshold.value;
			} else if(i === -1) {
				label = "&lt; " + lastThreshold;
			} else {
				label = threshold.value + " - " + lastThreshold;
			}
			lastThreshold = threshold.value;
			label += " " + threshold.units;
			row += "<div class='legend-table-cell legend-cell-color' style='background-color:" + threshold.color + ";'>&nbsp;</div>";
			row += "<div class='legend-table-cell legend-cell-value'>" + label + "</div>";
			row += "<div class='legend-table-cell legend-cell-desc'><span>" + threshold.comments + "</span></div>";
			row += "</div>";
			table.append(row);
		}
		// no data legend item
		$("<div>", {id: "legend-row-no-data", 'class': "legend-table-row"})
			.css('visibility', this.parent.noDataOptions.showNoData ? "visible" : "hidden")
			.append(
				"<div class='legend-table-cell legend-cell-color' style='box-sizing:border-box;border:2px solid #000;'>&nbsp;</div>" + 
				"<div id='legend-cell-no-data' class='legend-table-cell legend-cell-desc'>No results matching current filters</div>"
			)
			.appendTo(table);
		// always show legend on update
		this.legendShow();
		// dynamically set height
		this.adjustLegendContainerHeight();
	};

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
	 */
	Legend.prototype.showCustomThresholdsPanel = function() {
		var self = this;
		var thresholdsData = this.thresholds[this.selectedThresholdGroup];
		var panel = $("<div id='custom-thresholds-content'></div>")
			.addClass("inner-container-style");
		var buttonStyle = {
			'display': 'inline-block',
			'width': 70, 
			'margin': "0 auto", 
			'text-align': 'center'
		};
		// add title
		panel.append("<span style='font-weight:bolder;font-size:16px;'>Customize " + this.contaminant + " Thresholds</span><hr />");
		// append threshold inputs
		var inputs = $("<div id='custom-thresholds-inputs-container'></div>").appendTo(panel);
		var i = thresholdsData.length;
		while(i-- > 0) {
			this.addThresholdControl(inputs, thresholdsData[i].value);
		};
		// add/remove buttons
		var addThreshold = $("<div id='custom-thresholds-add' class='button'>+</div>").appendTo(panel)
			.css(buttonStyle)
			.css('font-weight', 'bold')
			.width(20);
		var removeThreshold = $("<div id='custom-thresholds-remove' class='button'>−</div>").appendTo(panel)
			.css(buttonStyle)
			.css('font-weight', 'bold')
			.width(20);
		panel.append("<hr />");
		// add/remove thresholds
		addThreshold.click(function() {
			if($(".custom-threshold-control").length < 4) {
				self.addThresholdControl(inputs, 0); 
			}
		});
		removeThreshold.click(function() { 
			if($(".custom-threshold-control").length > 1) {
				$(".custom-threshold-control").last().remove(); 
			}
		});
		// append buttons
		$("<div id='custom-thresholds-buttons'></div>").appendTo(panel)
			.css({'text-align': 'center'})
			.append(
				$("<div id='custom-thresholds-cancel' class='button'>Cancel</div>").css(buttonStyle)
			)
			.append(
				$("<div id='custom-thresholds-submit' class='button'>Submit</div>").css(buttonStyle)
			);
		common.setModal(true, panel, {
			onClose: function() {
				$("#threshold-group-select").val(self.selectedThresholdGroup).trigger('chosen:updated');
			}
		});
		// close functionality
		$("#custom-thresholds-cancel").click(function() {
			common.hideModal();
		});
		// submit functionality
		$("#custom-thresholds-submit").click(function() {
			var data = [];
			$(".custom-threshold-input").each(function(i, element) {
				data.push({value: element.value});
			});
			common.hideModal(true);
			var updated = self.updateThresholds(self.contaminant, data, null, true);
			// set to hidden custom option or on failure return to last selection
			$("#threshold-group-select")
				.val(updated ? "custom" : self.selectedThresholdGroup)
				.trigger('chosen:updated');
		});
	};

	/**
	 * Add an input for a custom threshold value.
	 * @param {jQuery} container - jQuery object for container to append input to.
	 * @param {number} value - Default/start value in input.
	 */
	Legend.prototype.addThresholdControl = function(container, value) {
		container.append(
			"<div class='custom-threshold-control'>"  +
				"<input class='custom-threshold-input' type='number' step='0.1' min='0.01' value='" + value + "' />" + 
				"&nbsp;" + this.thresholds[this.selectedThresholdGroup][0].units + 
			"</div>"
		);
	};
	
	return Legend;
	
});

