//************************************************************************************************************
// Handles query and UI. While they may not seem like an obvious pair, due to how UI listeners fire new 
// queries and queries in turn update the UI, just easier to combine.
// 
// Queries can have up to 5 recognized member variables:
//    • 'species' - The name of the species or 'highest' or 'lowest' for highest/lowest average respectively.
//    • 'contaminant' - The name of the contaminant type.
//    • 'startYear' - The start year or minimum query bounds.
//    • 'endYear' - The end year of maximum query bounds.
//    • 'radiusMiles' - The maximum distance in miles.
// Depending on the query type, not all variables will be used and you may get away with only setting the 
// required variables if you know what you're doing. For further details, see the php scripts, and 
// particularly StepQueries.php which holds all the core query functions.
//************************************************************************************************************
define([
	"chosen", 
	"common", 
	"noUiSlider"
], function(chosen, common, noUiSlider) {
	
	function QueryAndUI(parentStepApp, defaultQuery) {
		this.parent = parentStepApp;
		// quick reference
		this.legend = this.parent.modules.legend;
		// The default query to start or when resetting. Start year is 1900 and end year is the current year. 
		// This is fine as submitting the query will return a corrected version that fits the data.
		this.defaultQuery = defaultQuery ? defaultQuery : {};
		this.defaultQuery.species = this.defaultQuery.species ? this.defaultQuery.species : 'Largemouth Bass';
		this.defaultQuery.contaminant = this.defaultQuery.contaminant ? this.defaultQuery.contaminant : 'Mercury';
		// query will automatically adjust years to min/max year
		this.defaultQuery.startYear = this.defaultQuery.startYear ? this.defaultQuery.startYear : 1900;
		this.defaultQuery.endYear = this.defaultQuery.endYear ? this.defaultQuery.endYear : new Date().getFullYear();
		// The last successful query. This is usually not the submitted query but the returned (and corrected) 
		// query from the submitted.
		this.lastQuery;
		// odd var but we need to know when this is the query directly after the first query, since that's 
		// when we turn off showing no-data stations
		this.prepSecondQuery = false;
		// list of available species that keeps original capitalization pattern, easier to use same list that 
		// way, but requires you ensure consistency -- i.e. watch for any toLowercase() or toUppercase() 
		// conflicts, or at least use a case-insenitive comparison function.
		this.speciesList;
		// The active control (i.e. the visible one), which points to one of the values in the controls object below.
		this.activeControl = null;
		// noUiSlider instance for year range slider
		this.yearRangeControl = null;
		// Object holding the various control panels and common related variables.
		this.controls = {
			query: {
				name: 'query', 
				id: 'query-controls',
				element: null,
				tabId: 'control-tab-query', 
				tabElement: null
			}, 
			location: {
				name: 'station', 
				id: 'location-controls',
				element: null,
				tabId: 'control-tab-location', 
				tabElement: null
			}, 
			map: {
				name: 'map', 
				id: 'map-controls',
				element: null,
				tabId: 'control-tab-map', 
				tabElement: null
			}
		};
		this.controlStageVertPadding = 12;
		this.controlStageMinHeight = 2;
	};
	
	
	//********************************************************************************************************
	// Query functions
	//********************************************************************************************************
	QueryAndUI.prototype.getLastQuery = function() { return this.lastQuery; };
	
	QueryAndUI.prototype.getLastQueryCopy = function() {
		var copyQuery = {};
		for(var v in this.lastQuery) {
			copyQuery[v] = this.lastQuery[v];
		}
		return copyQuery;
	};
	
	/**
	 * Reset the lastQuery var to a copy of the defaultQuery.
	 */
	QueryAndUI.prototype.resetDefaultQuery = function() {
		//this.lastQuery = Object.assign({}, defaultQuery);
		this.lastQuery = {};
		for(var v in this.defaultQuery) {
			this.lastQuery[v] = this.defaultQuery[v];
		}
	};
	
	/**
	 * Submit a query (or create a query from the HTML control objects), submit this to the server, then 
	 * update the application with the results. After the query is created, the submission and update is done 
	 * through an asynchronous ajax call (unless options.firstRun is true). This will automatically update the
	 * query controls, thresholds, legend, and stations layer on success.
	 * @param {Object} options - Options.
	 * @param {Object} options.query - The query object to submit. If null or undefined, this will be created 
	 *        from the control elements. That is, leave blank to submit a new query based on user selected 
	 *        parameters.
	 * @param {boolean} options.firstRun - Whether this is the first/init query to populate the map initially.
	 *        If so, a number of things are adjusted. The ajax call is actually made synchronous, no query 
	 *        changes are flashed or notified, and on loading, the map is zoomed to the stations extent.
	 * @param {string} options.firedBy - Name of the parameter change that fired this specific query (as 
	 *        inputs update the query on change). This simply tells which controls don't needd to be updated. 
	 *        For example, if the species was changed, the contaminants and years must be updated. If the 
	 *        contaminants paramter was changed, only the year controls have to be updated. Leave undefined to
	 *        update all query controls.
	 * @param {string} options.flashMessage - Optional message to flash after completeing query.
	 */
	QueryAndUI.prototype.updateQuery = function(options) {
		if(!options.query) {
			// if no query supplied, use from inputs
			var yearRange = this.yearRangeControl.get();
			options.query = {
				contaminant: $("#contaminant-control").val(), 
				species: $("#species-control").val(), 
				startYear: parseInt(yearRange[0]), 
				endYear: parseInt(yearRange[1])
			};
		}
		// lock interface
		common.setModalAsLoading(true, false);
		$("#species-control").prop('disabled', true);
		$("#stations-select").prop('disabled', true);
		var updateMessage = options.flashMessage;
		var updateMessageTime = 3000;
		
		var self = this;
		$.ajax({
			async: !options.firstRun,
			url: "lib/queryStations.php", 
			data: options.query, 
			dataType: "json", 
			success: function(data) {
				//console.log(options.query);
				//console.log(data);
				// update last successful query
				self.lastQuery = data.query;
				// turn off showing of no-data stations after first user-submitted query
				if(options.firstRun) {
					self.prepSecondQuery = true;
				} else if(self.prepSecondQuery && self.parent.noDataOptions.showNoData) {
					self.toggleNoDataDisplay(false, true);
					updateMessage = "Stations with no data matching filters will not be displayed.<br />"+
						"To turn back on, check the \"Display All Stations\" option.";
					updateMessageTime = 5000;
					self.prepSecondQuery = false;
				}
				// update legend
				if(options.firstRun || options.firedBy === 'contaminant') {
					// update thresholds only if contaminant changed
					self.legend.updateThresholds(options.query.contaminant, data.thresholds, options.selectThresholdGroup);
				} else {
					self.legend.updateLegend(self.lastQuery);
				}
				// update stations to match query
				self.parent.updateStations(data.stations);
				// change inputs options down hierarchy as necessary depending on what select fired the query
				if(options.firedBy === 'species') {
					self.updateContaminantsSelect(data.contaminants);
					self.updateYearsSelect(data.years);
				} else if(options.firedBy === 'contaminant') {
					self.updateYearsSelect(data.years);
				} else {
					// if unknown or undefined firing event, just update everything
					self.updateSpeciesList();
					self.updateContaminantsSelect(data.contaminants);
					self.updateYearsSelect(data.years);
				}
				// flash changes, set zoom to fit new extent
				var queryChanged = self.flashQueryChanges(options.query, options.firstRun);
				if(queryChanged) {
					if(updateMessage) {
						updateMessage = "Filters updated to match query results.<br /><br />"+updateMessage;
					} else {
						updateMessage = "Filters updated to match query results.";
					}
				}
			}, 
			error: function(e) {
				updateMessage = "Error updating filters.";
				alert(defaultErrorMessage + "(Error Query)");
			}, 
			complete: function() {
				// unlock interface
				common.setModal(false);
				$("#species-control").prop('disabled', false);
				// for some reason the trigger doesn't work in the updateStationsSelect() function but works here
				$("#stations-select").prop('disabled', false).trigger('chosen:updated');
				if(updateMessage) {
					self.parent.flashNotification(updateMessage, updateMessageTime);
				}
			}
		});
	};
	
	//********************************************************************************************************
	// Init and activate functions
	//********************************************************************************************************
	/**
	 * Initialize map controls. However, it does not activate them as you may want to wait until the rest of 
	 * the application has loaded. Thus follow up with {@link #controlsActivate()} when ready.
	 */
	QueryAndUI.prototype.init = function() {
		//$("#notification-tab").hide();
		// make everything fancy!
		$("#species-control").chosen();
		$("#contaminant-control").chosen();
		$("#stations-select").chosen();
		$("#counties-select").chosen();
		// year range slider (does not create though, that's done on first update)
		$("#control-year-range-container").html(
			"<div id='control-year-range-start'></div>" + 
			"<div id='control-year-range'></div>" +
			"<div id='control-year-range-end'></div>"
		);
		// add placeholder texts to chosen search
		$("#species_control_chosen .chosen-drop .chosen-search input").attr("placeholder", "Search for a species..");
		$("#contaminant_control_chosen .chosen-drop .chosen-search input").attr("placeholder", "Search for a contaminant..");
		$("#stations_select_chosen .chosen-drop .chosen-search input").attr("placeholder", "Search for a station..");
		$("#counties_select_chosen .chosen-drop .chosen-search input").attr("placeholder", "Search for a county..");
		// cache the control groups and tabs, hide the groups
		for(var key in this.controls) {
			this.controls[key].element = $("#"+this.controls[key].id);
			this.controls[key].element.hide();
			this.controls[key].tabElement = $("#"+this.controls[key].tabId);
		}
		this.setActiveControl('query');
		// set last query to default
		this.resetDefaultQuery();
		// set visible
		$("#controls-container").css('visibility', 'visible');
	};

	/**
	 * Actives the controls. Should be called after all data has loaded and first query has fired successfully 
	 * (thus loading select data).
	 * @see {@link controlsInit()}
	 */
	QueryAndUI.prototype.activate = function() {
		// add tabs event listeners
		var self = this;
		for(var key in this.controls) {
			this.controls[key].tabElement.on('click', this.setActiveControl.bind(this, key));
		}
		// add query controls event listeners
		$("#species-control")
			.prop('disabled', false)
			.change(function() {
				self.updateQuery({firedBy: "species"});
			})
			.trigger('chosen:updated');
		$("#contaminant-control")
			.prop('disabled', false)
			.change(function() {
				self.updateQuery({firedBy: "contaminant"});
			})
			.trigger('chosen:updated');
		$("#reset-controls")
			.prop('disabled', false)
			.click(function() {
				// reset to show no-data symbology
				self.toggleNoDataDisplay(true, true);
				self.updateQuery({
					query: self.defaultQuery,
					firstRun: true, 
					flashMessage: "Filters and display settings reset to default."
				});
			});
		$("#stations-select")
			.prop('disabled', false)
			.change(function() {
				var selectVal = parseInt($("#stations-select").val());
				if(selectVal >= 0) {
					var station = self.parent.stations.collection.getArray()[selectVal];
					self.parent.zoomToStation(station);
					self.parent.openStationDetails(station);
					$("#stations-select").find('option:first-child')
						.prop('selected', true)
						.end().trigger('chosen:updated');
				}
			});
		$("#show-counties-control")
			.prop('disabled', false)
			.prop('checked', this.parent.counties.layer.getVisible())
			.click(function() {
				self.parent.counties.layer.setVisible(!self.parent.counties.layer.getVisible());
				// if turning off, reset any selected county
				if(!self.parent.counties.layer.getVisible()) {
					self.parent.counties.selected = null;
					self.parent.counties.highlightLayer.setVisible(false);
					self.parent.counties.highlightLayer.changed();
				}
			});
		$("#show-mpa-control")
			.prop('disabled', false)
			.prop('checked', this.parent.mpa.layer.getVisible())
			.click(function() {
				self.parent.mpa.layer.setVisible(!self.parent.mpa.layer.getVisible());
			});
		$("#show-no-data-control")
			.prop('disabled', false)
			.prop('checked', this.parent.noDataOptions.showNoData)
			.click(function() {
				if(self.prepSecondQuery) {
					// this disables able setting no-data display to false when doing the query immediately after,
					// the first, since user already discovered how to toggle this on/off
					self.prepSecondQuery = false;
				}
				self.toggleNoDataDisplay();
			});
		// fill counties select
		var countiesSelect = $("#counties-select");
		countiesSelect.html("<option disabled value=' '></option>");
		for(var i = 0; i < this.parent.counties.names.length; i++) {
			countiesSelect.append(
				"<option value='" + this.parent.counties.names[i].toLowerCase() + "'>" + 
					this.parent.counties.names[i] + 
				"</option>"
			);
		}
		countiesSelect
			.val('')
			.prop('disabled', false)
			.on('change', function() {
				self.parent.zoomToCountyByName(countiesSelect.val()); 
				countiesSelect.find('option:first-child')
					.prop('selected', true)
					.end().trigger('chosen:updated');
			})
			.trigger('chosen:updated');
		// other tab buttons
		$("#zoom-stations-tab").click(function() {
			self.parent.zoomToStations();
		});
		$("#download-tab").click(function() {
			self.parent.modules.download.showDownloadDialog(self.lastQuery);
		});
	};

	QueryAndUI.prototype.createYearSlider = function(minYear, maxYear) {
		this.yearRangeControl = noUiSlider.create(document.getElementById('control-year-range'), {
			range: { 'min': minYear, 'max': maxYear }, 
			start: [minYear, maxYear],
			step: 1, 
			connect: true, 
			behaviour: 'tap-drag'
		});
		// bind values to display
		var display = [
			document.getElementById("control-year-range-start"), 
			document.getElementById("control-year-range-end")
		];
		this.yearRangeControl.on('update', function(values, handle) {
			display[handle].innerHTML = parseInt(values[handle]);
		});
		var self = this;
		this.yearRangeControl.on('change', function() {
			self.updateQuery({firedBy: "year-range"});
		});
	};

	//************************************************************************************************************
	// General UI functions
	//************************************************************************************************************
	/**
	 * Set css to display the proper tab with the active style (and the rest with inactive). Takes no properties. 
	 * Is automatically run on switching tabs with {@link #setActiveControl(controlName)} so does not have to be 
	 * explicitly called.
	 */
	QueryAndUI.prototype.setActiveControlTab = function() {
		for(var key in this.controls) {
			if(this.controls.hasOwnProperty(key)) {
				if(this.controls[key] === this.activeControl) {
					this.controls[key].tabElement.removeClass("control-tab").addClass("control-tab-active");
				} else {
					this.controls[key].tabElement.removeClass("control-tab-active").addClass("control-tab");
				}
			}
		}
	};

	/**
	 * Set active control by the control panel's name.
	 * @param {string} controlName - Name of the control to set as active. If no match to any control panel 
	 *    specified in global {@link #controls} object, does nothing.
	 */
	QueryAndUI.prototype.setActiveControl = function(controlName) {
		var closing = !controlName || this.controls[controlName] === this.activeControl;
		if(closing || this.controls[controlName]) {
			var newControl = (!closing) ? this.controls[controlName] : null;
			// hide active element
			if(this.activeControl) {
				this.activeControl.element.slideUp();
			}
			if(!closing) {
				newControl.element.slideDown();
				this.activeControl = newControl;
			} else {
				this.activeControl = null;
			} 
			// set tabs
			this.setActiveControlTab();
		}
	};

	//************************************************************************************************************
	// Query ui and controls
	//************************************************************************************************************
	/**
	 * Check query against the last successful query. Generally this is done after a query, using a copy of the 
	 * query object before the query function returns and overwrites the last successful query (which is modified
	 * server-side to be valid). Any changes from the query initially specified are flashed in the appropriate 
	 * query controls (to signify they had to be modified to return a valid query).
	 * @param {Object} query - Query object.
	 * @param {boolean} firstRun - If true, inhibits flashing. Obviously used for the first/initial query which 
	 *		is not user-specified and done to populate the initial map.
	 * @return {boolean} true if one or more queries had to be corrected and the element was flashed to indicate 
	 *		change
	 */
	QueryAndUI.prototype.flashQueryChanges = function(query, firstRun) {
		// store in list so we can fire them fairly simultaneously
		var elements = [];
		if(query.contaminant !== this.lastQuery.contaminant) {
			//elements.push($("#contaminant-control"));
			elements.push($("#contaminant_control_chosen a span"));
		}
		if(query.startYear !== this.lastQuery.startYear) {
			//elements.push($("#start-year-control"));
			elements.push($("#start_year_control_chosen a span"));
		}
		if(query.endYear !== this.lastQuery.endYear) {
			//elements.push($("#end-year-control"));
			elements.push($("#end_year_control_chosen a span"));
		}
		if(elements.length > 0 && !firstRun) {
			// flash select boxes (with chosen it's bit harder so just flash the text color twice)
			elements.forEach(function(el) {
				el.animate({color: "#3376E9"}, 400)
				.animate({color: "#000"}, 200)
				.animate({color: "#3376E9"}, 400)
				.animate({color: "#000"}, 200)
				.removeAttr('style', '');
			});
			return true;
		}
		return false;
	};

	/**
	 * Updates {@link #speciesList} from server to grab all unique species and the updates the species control. 
	 * Strings come in their original values (i.e. not standarized in upper/lower case). Really only needs to be 
	 * called once. Asynchronous ajax call.
	 */
	QueryAndUI.prototype.updateSpeciesList = function() {
		var self = this;
		$.ajax({
			url: "lib/query.php", 
			data: { query: "getAllSpecies" }, 
			dataType: "json", 
			success: function(data) {
				self.speciesList = data;
				self.updateSpeciesSelect();
			}, 
			error: function(e) {
				alert(defaultErrorMessage + "(Error SpeciesList)");
			}
		});
	};

	/**
	 * Update the species control (the select list), including adding highest/lowest average options first. Takes 
	 * no parameters, instead uses {@link #speciesList} global var to population options. Select values are kept 
	 * as is (that is, not upper/lower-cased).
	 */
	QueryAndUI.prototype.updateSpeciesSelect = function() {
		var optionsHtml = "<option value='highest'>Species with Highest Avg Concentration</option>"
			+ "<option value='lowest'>Species with Lowest Avg Concentration</option>";
		for(var i = 0; i < this.speciesList.length; i++) {
			optionsHtml += "<option value='" + this.speciesList[i][0] + "'>" + this.speciesList[i][0] + "</option>";
		}
		$("#species-control")
			.html(optionsHtml)
			.val(this.lastQuery.species)
			.trigger("chosen:updated");
	};

	/**
	 * Update the contaminants control (the contaminants list).
	 * @param {Object[]} data - Query results for the list of contaminants. Expects an array of single-length 
	 *    arrays. E.g. [ ['Mercury'], ['DDT'] ] as that's just how the raw SQL query is returned. Select values  
	 *    are kept as is (that is, not upper/lower-cased).
	 */
	QueryAndUI.prototype.updateContaminantsSelect = function(data) {
		var optionsHtml = "";
		for(var i = 0; i < data.length; i++) {
			optionsHtml += "<option value='" + data[i][0] + "'>" + data[i][0] + "</option>";
		}
		var controlDiv = $("#contaminant-control")
			.html(optionsHtml)
			.val(this.lastQuery.contaminant);
		// check value, if null, just select first available
		if(!controlDiv.val()) {
			controlDiv.val(data[0][0]);
		}
		controlDiv.trigger('chosen:updated');
	};

	/**
	 * Updates the year controls (start and end year lists).
	 * @param {Object[]} data - Query results for the min and max year.
	 * @param {number} data[].min - Earliest year with data.
	 * @param {number} data[].max - Latest year with data.
	 */
	QueryAndUI.prototype.updateYearsSelect = function(data) {
		var yearMin = parseInt(data.min), 
			yearMax = parseInt(data.max);
		if(!this.yearRangeControl) {
			this.createYearSlider(yearMin, yearMax);
		}
		if(yearMin === yearMax) {
			this.yearRangeControl.updateOptions({
				range: { 'min': yearMin-1, 'max': yearMax },
				step: 1, 
				connect: true
			});
			this.yearRangeControl.set([this.lastQuery.startYear-1, this.lastQuery.endYear]);
			$("#control-year-range-start").html(yearMin);
			$("#control-year-range-end").html(yearMax);
			$("#control-year-range").attr('disabled', true);
		} else {
			$("#control-year-range").attr('disabled', false);
			this.yearRangeControl.updateOptions({
				range: { 'min': yearMin, 'max': yearMax },
				step: 1, 
				connect: true, 
				behaviour: 'tap-drag'
			});
			this.yearRangeControl.set([this.lastQuery.startYear, this.lastQuery.endYear]);
			$("#control-year-range-start").html(this.lastQuery.startYear);
			$("#control-year-range-end").html(this.lastQuery.endYear);
		}
	};

	/**
	 * Update the stations controls (stations list). Takes no parameters. Uses global {@link #stations} to 
	 * populate values. Select values are numeric rather than the station name.
	 */
	QueryAndUI.prototype.updateStationsSelect = function() {
		var optionsHtml = "<option disabled value=' '></option>";
		for(var i = 0; i < this.parent.stations.collection.getLength(); i++) {
			var stationName = this.parent.stations.collection.item(i).get("name");
			optionsHtml += "<option value=" + i + ">" + stationName + "</option>";
		}
		$("#stations-select")
			.html(optionsHtml)
			.val(-1)
			.trigger("chosen:updated");
	};
	
	QueryAndUI.prototype.toggleNoDataDisplay = function(displayNoData, supressUpdate) {
		if(typeof displayNoData !== "undefined") {
			this.parent.noDataOptions.showNoData = displayNoData;
		} else {
			this.parent.noDataOptions.showNoData = !this.parent.noDataOptions.showNoData;
		}
		this.parent.createMarkerFactory();
		if(!supressUpdate) { this.parent.refreshStations(); }
		$("#show-no-data-control").prop("checked", this.parent.noDataOptions.showNoData);
	};
	
	return QueryAndUI;
	
});
