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
		this._intro(queryOptions, onComplete);
	};
	
	
	MapInstructions.prototype._appendButtons = function(element, nextCallback, queryOptions, onComplete) {
		var self = this;
		$("<div>", {'id': "instructions-buttons"}).appendTo(element)
			.append(
				$("<div>", {'id': 'instructions-next', 'class': 'button'})
					.html("Next")
					.on('click', function(e) {
						e.stopPropagation();
						nextCallback.call(self, queryOptions, onComplete);
					})
			)
			.append(
				$("<a>", {'id': 'instructions-skip', 'href': '#'})
					.html("Skip instructions")
					.on('click', function(e) {
						e.preventDefault();
						onComplete.call(self, queryOptions);
						common.setModal(false);
					})
			);
	};
	
	
	MapInstructions.prototype._intro = function(queryOptions, onComplete) {
		var html = (
			"<h1>Safe-to-Eat Portal</h1>" + 
			"<p>" + 
				"This interactive map allows you to explore fish contaminant data for your fishing " + 
				"locations. Data are available from extensive monitoring by SWAMP of lakes and reservoirs " +
				"in 2007 and 2008, of the coast in 2009 and 2010, of rivers and streams in 2011, and from " +
				"other studies." + 
			"</p>" + 
			"<p>" + 
				"The following steps will guide you through using the filters to explore the dataset. " + 
				"Click on 'Next' below to continue, or you may skip the instructions and use the default " +
				"filters provided." + 
			"</p>"
		);
		common.setModal(true, html, {
			id: "modal-instructions", 
			showBackground: true, 
			notExitable: true, 
			hideCloser: true
		});
		this._appendButtons("#modal-instructions", this._selectSpecies, queryOptions, onComplete);
	};
	
	
	MapInstructions.prototype._selectSpecies = function(queryOptions, onComplete) {
		$("#modal-instructions").html(
			"<h1>Select Species</h1>" + 
			"<p>" + 
				"Select a species of interest from the available sample data. Alternatively, you may " +
				"select to display by the most recent sample of any species, using the highest or lowest " + 
				"sample value for samples falling on the same year." + 
			"</p>" + 
			"<select id='instructions-select-species' class='instructions-select' disabled></select>"
		);
		var self = this;
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
				self._appendButtons("#modal-instructions", self._selectContaminant, queryOptions, onComplete);
			}
		});
	};
	
	
	MapInstructions.prototype._selectContaminant = function(queryOptions, onComplete) {
		$("#modal-instructions").html(
			"<h1>Select Contaminant</h1>" + 
			"<p>" + 
				"Select a contaminant of interest. Contaminants available for <strong>" + 
				queryOptions.query.species + "</strong> are given below. " + 
			"</p>"+ 
			"<select id='instructions-select-contaminant' class='instructions-select' disabled></select>"
		);
		var self = this;
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
				self._appendButtons("#modal-instructions", self._selectThresholds, queryOptions, onComplete);
			}
		});
	};
	
	
	MapInstructions.prototype._selectThresholds = function(queryOptions, onComplete) {
		$("#modal-instructions").html(
			"<h1>Select Contaminant Threshold</h1>" + 
			"<p>" + 
				"Select a contaminant threshold for <strong>" + queryOptions.query.contaminant + 
				"</strong>. Thresholds are provided by the Calfiornia Office of Environmental Health " + 
				"Hazard Assessment (OEHHA) and may be provied by specific groups by gender and age, or as " + 
				"non-specific, general thresholds." + 
			"</p>" + 
			"<select id='instructions-select-threshold' class='instructions-select' disabled></select>"
		);
		var self = this;
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
				self._appendButtons("#modal-instructions", self._selectYearRange, queryOptions, onComplete);
			}
		});
	};
	
	
	MapInstructions.prototype._selectYearRange = function(queryOptions, onComplete) {
		$("#modal-instructions").html(
			"<h1>Select Year Range</h1>" + 
			"<p>" + 
				"Select a year range to filter sample results. The years of data available for <strong>" + 
				queryOptions.query.species + "</strong> and <strong>" + queryOptions.query.contaminant + 
				"</strong> <span id='instructions-years-replace'>are fit to the slider below</span>. " + 
			"</p>" + 
			"<div id='instructions-year-container'>" + 
				"<div id='instructions-year-start'></div>" + 
				"<div id='instructions-year-slider'></div>" + 
				"<div id='instructions-year-end'></div>" + 
			"</div>"
		);
		var self = this;
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
					console.log(range);
					$("#instructions-years-replace").html(
						"are limited to " + range[0]
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
						"span from " + range[0] + " to " + range[1]
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
				self._appendButtons("#modal-instructions", self._outtro, queryOptions, onComplete);
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
		$("#modal-instructions").html(
			"<p>" + 
				"Map will be initialized displaying <strong>" + queryOptions.query.contaminant + 
				"</strong> contamination in <strong>" + queryOptions.query.species + "</strong> samples " + 
				yearString + 
			"</p>" + 
			"<img class='img-drop-shadow' src='images/instructions-filters.png' alt='Filters UI' />" + 
			"<p>To change the filters at any time, use the \"Filter Stations on Map\" interface.</p>"
		);
		$("<div>", {'id': "instructions-buttons"}).appendTo("#modal-instructions")
			.append(
				$("<div>", {'id': 'instructions-finish', 'class': 'button'})
					.html("Finish and go to map")
					.on('click', function(e) {
						e.stopPropagation();
						common.setModal(false);
						onComplete(queryOptions);
					})
			);
	};
	
	
	return MapInstructions;
	
});