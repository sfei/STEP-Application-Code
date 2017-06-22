/**
 * Map instructions series of modals
 */
define([
	"chosen", 
	"common",
	"noUiSlider"
], function(chosen, common, noUiSlider) {
	
	//********************************************************************************************************
	// Constructor(s)
	//********************************************************************************************************
	function MapInstructions(parentStepApp) {
		this.step = parentStepApp;
		this.defaultThreshold = "oehha-women-1845-children";
	};
	
	
	MapInstructions.prototype.bindControls = function(jElements) {
		var self = this;
		jElements.on('click', function() {
			self.begin(
				{
					query: self.step.modules.queryAndUI.getLastQueryCopy()
				}, 
				function(queryOptions) {
					self.step.modules.queryAndUI.updateQuery(queryOptions);
				}
			);
		});
	};
	
	
	MapInstructions.prototype.begin = function(queryOptions, onComplete) {
		queryOptions.selectThresholdGroup = queryOptions.selectThresholdGroup || this.defaultThreshold;
		this._intro(queryOptions, onComplete);
	};
	
	
	MapInstructions.prototype._appendButtons = function(queryOptions, onComplete, nextCallback, prevCallback) {
		var container = $("<div>", {'id': "instructions-buttons"}).appendTo("#modal-instructions");
		var self = this;
		if(prevCallback) {
			container.append(
				$("<div>", {'id': 'instructions-previous', 'class': 'button instruction-btn'})
					.html("Back")
					.on('click', function(e) {
						e.stopPropagation();
						prevCallback.call(self, queryOptions, onComplete);
					})
			);
		}
		container.append(
			$("<div>", {'id': 'instructions-next', 'class': 'button instruction-btn'})
				.html("Next")
				.on('click', function(e) {
					e.stopPropagation();
					nextCallback.call(self, queryOptions, onComplete);
				})
		);
		container.append(
			$("<a>", {'id': 'instructions-skip', 'href': '#'})
				.html("Skip Instructions")
				.on('click', function(e) {
					e.preventDefault();
					onComplete.call(self, queryOptions);
					common.setModal(false);
				})
		);
	};
	
	
	MapInstructions.prototype._intro = function(queryOptions, onComplete) {
		var html = (
			"<h1>Customize a Statewide Map of Fish Contamination</h1>" + 
			"<p>" + 
				"The interactive map on this page allows you to explore fish contaminant data for your favorite fishing locations. Data are available from extensive monitoring by the Surface Water Ambient Monitoring Program and from other studies." + 
			"</p>" + 
			"<p>" + 
				"The following steps will guide you through customizing the statewide map to show data of greatest interest.  You can customize the species, contaminant, and time period shown.  Mercury is the contaminant posing the most widespread concern and is a good starting point for exploring the data.  You can select one of two sets of thresholds for assessing the mercury data: one for the most sensitive population (women aged 18-45 years and children aged 1-17), or one for the less sensitive population (women over 45 years and men)." + 
			"</p>" + 
			"<p>" + 
				"Click “Next” to be guided through the customizing process, or click “<a href='#' id='instructions-skip-a'>Skip Instructions</a>” if you already know the drill. " + 
			"</p>"
		);
		if(!common.isModalOpen()) {
			common.setModal(true, html, {
				id: "modal-instructions", 
				showBackground: true, 
				notExitable: true, 
				hideCloser: true
			});
			this._appendButtons(queryOptions, onComplete, this._selectSpecies);
		} else {
			var self = this;
			common.changeModal(html, function() {
				self._appendButtons(queryOptions, onComplete, self._selectSpecies);
			});
		}
		$("#modal-instructions").find("#instructions-skip-a")
			.on('click', function(e) {
				e.preventDefault();
				onComplete.call(self, queryOptions);
				common.setModal(false);
			});
	};
	
	
	MapInstructions.prototype._selectSpecies = function(queryOptions, onComplete) {
		var html = (
			"<h1>Select Species</h1>" + 
			"<p>" + 
				"Click on the box below to select a species of interest. Largemouth bass is shown as the default because it is the most widely sampled species across the state, and is a good indicator of mercury contamination.  You can select a species from the pull-down menu, or simply begin typing the name of the species and click on the full name when you see it.  In addition to specific species, you can display the “Species with the Lowest Average Concentration” at each location or the “Species with the Highest Average Concentration” at each location.  These last two options are helpful if you do not know what species were sampled at the location of interest." + 
			"</p>" + 
			"<select id='instructions-select-species' class='instructions-select' disabled></select>"
		);
		var self = this;
		common.changeModal(html, function() {
			self._appendButtons(queryOptions, onComplete, self._selectContaminant, self._intro);
		});
		$.ajax({
			url: "lib/query.php", 
			data: { query: "getAllSpecies" }, 
			dataType: "json", 
			success: function(data) {
				var select = $("#instructions-select-species");
				$("<option>", {
					value: "highest", 
					text: "Species with Highest Avg Concentration"
				}).appendTo(select);
				$("<option>", {
					value: "lowest", 
					text: "Species with Lowest Avg Concentration"
				}).appendTo(select);
				for(var i = 0; i < data.length; i++) {
					$("<option>", {
						value: data[i][0], 
						text: data[i][0]
					}).appendTo(select);
				}
				select.val(queryOptions.query.species)
					.on('change', function() {
						queryOptions.query.species = this.options[this.selectedIndex].value;
					})
					.prop('disabled', false)
					.chosen();
			}
		});
	};
	
	
	MapInstructions.prototype._selectContaminant = function(queryOptions, onComplete) {
		var html = (
			"<h1>Select Contaminant</h1>" + 
			"<p>" + 
				"Click on the box below to select a contaminant of interest from the pull-down menu. Mercury is shown as the default because it is the contaminant posing the most widespread concern in California. If you select mercury, you will also need to select a set of thresholds for assessing the mercury data - you will do this in the next step. " + 
			"</p>"+ 
			"<select id='instructions-select-contaminant' class='instructions-select' disabled></select>"
		);
		var self = this;
		var specialNextFunction = function(queryOptions, onComplete) {
			if(queryOptions.query.contaminant === "Mercury") {
				self._selectThresholds(queryOptions, onComplete);
			} else {
				queryOptions.selectThresholdGroup = "standard";
				self._selectYearRange(queryOptions, onComplete);
			}
		};
		common.changeModal(html, function() {
			self._appendButtons(queryOptions, onComplete, specialNextFunction, self._selectSpecies);
		});
		$.ajax({
			url: "lib/query.php", 
			data: {
				query: "getAvailableContaminants", 
				species: queryOptions.query.species
			}, 
			dataType: "json", 
			success: function(data) {
				var select = $("#instructions-select-contaminant");
				var values = [];
				for(var i = 0; i < data.length; i++) {
					values.push(data[i][0]);
					$("<option>", {
						value: data[i][0], 
						text: data[i][0]
					}).appendTo(select);
				}
				if($.inArray(queryOptions.query.contaminant, values) < 0) {
					queryOptions.query.contaminant = values[0];
				}
				select.val(queryOptions.query.contaminant)
					.on('change', function() {
						queryOptions.query.contaminant = this.options[this.selectedIndex].value;
					})
					.prop('disabled', false)
					.chosen();
			}
		});
	};
	
	
	MapInstructions.prototype._selectThresholds = function(queryOptions, onComplete) {
		var html = (
			"<h1>Select Contaminant Threshold</h1>" + 
			"<p>" + 
				"Click on the box to select one of two sets of thresholds for assessing the mercury data: one for the most sensitive population (women aged 18-45 years and children aged 1-17), or one for the less sensitive population (women over 45 years and men)." + 
			"</p>" + 
			"<select id='instructions-select-threshold' class='instructions-select' disabled></select>"
		);
		var self = this;
		common.changeModal(html, function() {
			self._appendButtons(queryOptions, onComplete, self._selectYearRange, self._selectContaminant);
		});
		$.ajax({
			url: "lib/query.php", 
			data: {
				query: "getThresholds", 
				contaminant: queryOptions.query.contaminant
			}, 
			dataType: "json", 
			success: function(data) {
				var select = $("#instructions-select-threshold");
				var recognizedGroups = ["standard"]; // skip standard group
				for(var i = 0; i < data.length; i++) {
					// add by group, not specific thresholds
					if($.inArray(data[i].group, recognizedGroups) < 0) {
						recognizedGroups.push(data[i].group);
						if(data[i].group in self.step.modules.legend.thresholdGroups) {
							$("<option>", {
								value: data[i].group, 
								text: self.step.modules.legend.thresholdGroups[data[i].group]
							}).appendTo(select);
						}
					}
				}
				// selecting default group
				if(recognizedGroups.length === 1) {
					// only non-standard
					$("<option>", {
						value: "standard", 
						text: self.step.modules.legend.thresholdGroups["standard"]
					}).appendTo(select);
					queryOptions.selectThresholdGroup = "standard";
				} else if(!queryOptions.selectThresholdGroup || queryOptions.selectThresholdGroup === "standard" || !(queryOptions.selectThresholdGroup in recognizedGroups)) {
					// default value no longer valid
					queryOptions.selectThresholdGroup = recognizedGroups[1];
				}
				select.val(queryOptions.selectThresholdGroup);
				
				select.on('change', function() {
						queryOptions.selectThresholdGroup = this.options[this.selectedIndex].value;
					})
					.prop('disabled', false)
					.chosen();
			}
		});
	};
	
	
	MapInstructions.prototype._selectYearRange = function(queryOptions, onComplete) {
		var html = (
			"<h1>Select Year Range</h1>" + 
			"<p>" + 
				"Use the slider bar to select a year range of interest. " + 
				"<span id='instructions-years-replace'>Select from years available </span> " + 
				"for <strong>" + queryOptions.query.contaminant + "</strong> in <strong>" + 
				queryOptions.query.species + "</strong>. " + 
			"</p>" + 
			"<div id='instructions-year-container'>" + 
				"<div id='instructions-year-start'></div>" + 
				"<div id='instructions-year-slider'></div>" + 
				"<div id='instructions-year-end'></div>" + 
			"</div>"
		);
		var self = this;
		var specialBackFunction = function(queryOptions, onComplete) {
			if(queryOptions.query.contaminant === "Mercury") {
				self._selectThresholds(queryOptions, onComplete);
			} else {
				self._selectContaminant(queryOptions, onComplete);
			}
		};
		common.changeModal(html, function() {
			self._appendButtons(queryOptions, onComplete, self._outtro, specialBackFunction);
		});
		$.ajax({
			url: "lib/query.php", 
			data: {
				query: "getAvailableYearSpan", 
				species: queryOptions.query.species, 
				contaminant: queryOptions.query.contaminant
			}, 
			dataType: "json", 
			success: function(data) {
				var range = [parseInt(data.min), parseInt(data.max)];
				queryOptions.query.startYear = range[0];
				queryOptions.query.endYear = range[1];
				if(range[0] === range[1]) {
					$("#instructions-years-replace").html(
						"Data from only the year " + range[0] + " are available"
					);
					var yearRangeControl = noUiSlider.create(document.getElementById('instructions-year-slider'), {
						range: { 'min': range[0]-1, 'max': range[0] },
						start: [range[0]-1, range[0]],
						step: 1, 
						connect: true
					});
					$("#instructions-year-start").html(range[0]);
					$("#instructions-year-end").html(range[0]);
					$("#instructions-year-slider").attr('disabled', true);
				} else {
					$("#instructions-years-replace").html(
						"Data from " + range[0] + " to " + range[1] + " are available"
					);
					var yearRangeControl = noUiSlider.create(document.getElementById('instructions-year-slider'), {
						range: { 'min': range[0], 'max': range[1] }, 
						start: range,
						step: 1, 
						connect: true, 
						behaviour: 'tap-drag'
					});
					var display = [
						document.getElementById("instructions-year-start"), 
						document.getElementById("instructions-year-end")
					];
					yearRangeControl.on('update', function(values, handle) {
						display[handle].innerHTML = parseInt(values[handle]);
					});
					yearRangeControl.on('change', function() {
						var range = yearRangeControl.get();
						queryOptions.query.startYear = parseInt(range[0]);
						queryOptions.query.endYear = parseInt(range[1]);
					});
				}
			}
		});
	};
	
	
	MapInstructions.prototype._outtro = function(queryOptions, onComplete) {
		var yearString; 
		if(queryOptions.query.startYear === queryOptions.query.endYear) {
			yearString = "on <strong>" + queryOptions.query.startYear + "</strong>";
		} else {
			yearString = (
				"from <strong>" + queryOptions.query.startYear + "</strong> to <strong>" + 
				queryOptions.query.endYear + "</strong>"
			);
		}
		var html = (
			"<p>" + 
				"Map will display <strong>" + queryOptions.query.contaminant + 
				"</strong> contamination in <strong>" + queryOptions.query.species + "</strong> samples " + 
				yearString + 
			"</p>" + 
			"<img class='img-drop-shadow' src='images/instructions-filters.png' alt='Filters UI' />" + 
			"<p>To change the selections at any time, use the \"Customize the Statewide Map\" menu.</p>"
		);
		common.changeModal(html, function() {
			$("<div>", {'id': "instructions-buttons"}).appendTo("#modal-instructions")
				.append(
					$("<div>", {'id': 'instructions-finish', 'class': 'button instruction-btn'})
						.html("Finish and go to map")
						.on('click', function(e) {
							e.stopPropagation();
							common.setModal(false);
							onComplete(queryOptions);
						})
				);
		});
	};
	
	
	return MapInstructions;
	
});