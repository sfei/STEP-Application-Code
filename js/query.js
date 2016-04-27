
//************************************************************************************************************
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

	// The default query to start or when resetting. Start year is 1900 and end year is the current year. This
	// is fine as submitting the query will return a corrected version that fits the data.
var defaultQuery = {
						species: 'Largemouth Bass', 
						contaminant: 'Mercury',
						// query will automatically adjust years to min/max year
						startYear: 1900,
						endYear: new Date().getFullYear()
					}, 
	// The last successful query. This is usually not the submitted query but the returned (and corrected) 
	// query from the submitted.
	lastQuery,
	// odd var but we need to know when this is the query directly after the first query, since that's when we
	// turn off showing no-data stations
	prepSecondQuery = false;

//************************************************************************************************************
// Query and data update functions
//************************************************************************************************************
/**
 * Reset the lastQuery var to a copy of the defaultQuery.
 */
function resetDefaultQuery() {
	//lastQuery = Object.assign({}, defaultQuery);
	lastQuery = {};
	for(var v in defaultQuery) {
		if(defaultQuery.hasOwnProperty(v)) {
			lastQuery[v] = defaultQuery[v];
		}
	}
}

/**
 * Submit a query (or create a query from the HTML control objects), submit this to the server, then update 
 * the application with the results. After the query is created, the submission and update is done through 
 * an asynchronous ajax call (unless options.firstRun is true). This will automatically update the query 
 * controls, thresholds, legend, and stations layer on success.
 * @param {Object} options - Options.
 * @param {Object} options.query - The query object to submit. If null or undefined, this will be created from
 *    the control elements. That is, leave blank to submit a new query based on user selected parameters.
 * @param {boolean} options.firstRun - Whether this is the first/init query to populate the map initially. If 
 *    so, a number of things are adjusted. The ajax call is actually made synchronous, no query changes are  
 *    flashed or notified, and on loading, the map is zoomed to the stations extent.
 * @param {string} options.firedBy - Name of the parameter change that fired this specific query (as inputs 
 *    update the query on change). This simply tells which controls don't needd to be updated. For example, if 
 *    the species was changed, the contaminants and years must be updated. If the contaminants paramter was 
 *    changed, only the year controls have to be updated. Leave undefined to update all query controls.
 * @param {string} options.flashMessage - Optional message to flash after completeing query.
 */
function updateQuery(options) {
	if(!options.query) {
		// if no query supplied, use from inputs
		options.query = {
			contaminant: $("#contaminant-control").val(), 
			species: $("#species-control").val(), 
			startYear: parseInt($("#start-year-control").val()), 
			endYear: parseInt($("#end-year-control").val())
		};
	}
	// lock interface
	setModalAsLoading(true, false);
	$("#species-control").prop('disabled', true);
	$("#station-select").prop('disabled', true);
	var updateMessage = options.flashMessage;
	var updateMessageTime = 3000;
	
	$.ajax({
		async: !options.firstRun,
		url: "lib/getQuery.php", 
		data: options.query, 
		dataType: "json", 
		success: function(data) {
			//console.log(options.query);
			//console.log(data);
			// update last successful query
			lastQuery = data.query;
			// turn off showing of no-data stations after first user-submitted query
			if(options.firstRun) {
				prepSecondQuery = true;
			} else if(prepSecondQuery && showNoData) {
				toggleNoDataDisplay(false, true);
				updateMessage = "Stations with no data matching filters will not be displayed.<br />"+
					"To turn back on, see Map/Layer Options.";
				updateMessageTime = 5000;
				prepSecondQuery = false;
			}
			// update thresholds only if contaminant changed
			console.log(options.firedBy);
			if(options.firstRun || options.firedBy === 'contaminant') {
				updateThresholds(data.thresholds, options.selectThresholdGroup);
			}
			// update stations to match query
			updateStations(data.stations);
			// change inputs options down hierarchy as necessary depending on what select fired the query
			if(options.firedBy === 'species') {
				updateContaminantsSelect(data.contaminants);
				updateYearsSelect(data.years);
			} else if(options.firedBy === 'contaminant') {
				updateYearsSelect(data.years);
			} else {
				// if unknown or undefined firing event, just update everything
				updateSpeciesList();
				updateContaminantsSelect(data.contaminants);
				updateYearsSelect(data.years);
			}
			//updateStationsSelect();
			// flash changes, set zoom to fit new extent
			var queryChanged = flashQueryChanges(options.query, options.firstRun);
			if(queryChanged) {
				updateMessage = "Filters updated to match query results.";
			}
			if(stationDetails && stationDetails.isOpen) {
				stationDetails.reload(lastQuery);
			}
		}, 
		error: function(e) {
			updateMessage = "Error updating filters.";
			alert(defaultErrorMessage + "(Error Query)");
		}, 
		complete: function() {
			// unlock interface
			setModal(false);
			$("#species-control").prop('disabled', false);
			// for some reason the trigger doesn't work in the updateStationsSelect() function but works here
			$("#station-select").prop('disabled', false).trigger('chosen:updated');
			if(updateMessage) {
				flashNotification(updateMessage, updateMessageTime);
			}
		}
	});
}
