
var defaultQuery = {
		species: 'highest', 
		contaminant: 'Mercury',
		// query will automatically adjust years to min/max year
		startYear: 1900,
		endYear: new Date().getFullYear()
	}, 
	lastQuery;

//************************************************************************************************************
// Query and data update functions
//************************************************************************************************************
function resetDefaultQuery() {
	//lastQuery = Object.assign({}, defaultQuery);
	lastQuery = {};
	for(var v in defaultQuery) {
		if(defaultQuery.hasOwnProperty(v)) {
			lastQuery[v] = defaultQuery[v];
		}
	}
}

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
			// update thresholds
			updateThresholds(data.thresholds);
			// update stations to match query
			loadStationsLayer(data.stations);
			// change inputs options down hierarchy as necessary depending on what select fired the query
			if(options.firedBy === 'species') {
				updateContaminantsSelect(data.contaminants);
				updateYearsSelect(data.years);
			} else if(options.firedBy === 'contaminants') {
				updateYearsSelect(data.years);
			} else {
				// if unknown or undefined firing event, just update everything
				updateSpeciesList();
				updateContaminantsSelect(data.contaminants);
				updateYearsSelect(data.years);
			}
			updateStationsSelect();
			// flash changes, set zoom to fit new extent
			flashQueryChanges(options.query, options.firstRun);
			if(options.firstRun) {
				zoomToStations();
			}
		}, 
		error: function(e) {
			alert(defaultErrorMessage + "(Error Query)");
		}, 
		complete: function() {
			// unlock interface
			setModal(false);
			$("#species-control").prop('disabled', false);
			// for some reason the trigger doesn't work in the updateStationsSelect() function but works here
			$("#station-select").prop('disabled', false).trigger('chosen:updated');
		}
	});
}
