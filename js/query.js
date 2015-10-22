
function updateSpeciesList() {
	// following code updates based on other query options, but since species is top of select-heirarchy, 
	// instead just load all species
//	if(query === undefined || query === null) {
//		query = lastQuery;
//	}
//	$.ajax({
//		url: "lib/getAvailableSpecies.php", 
//		data: query, 
//		dataType: "json", 
//		success: function(data) {
//			updateSpeciesSelect(data);
//		}, 
//		error: function(e) {
//			alert(defaultErrorMessage + "(Error SpeciesList)");
//		}
//	});
	$.ajax({
		url: "lib/getAllSpecies.php", 
		dataType: "json", 
		success: function(data) {
			updateSpeciesSelect(data);
		}, 
		error: function(e) {
			alert(defaultErrorMessage + "(Error SpeciesList)");
		}
	});
}

function updateSpeciesSelect(data) {
	var optionsHtml = "<option value=\"highest\">Species with Highest Avg Concentration</option>"
		+ "<option value=\"lowest\">Species with Lowest Avg Concentration</option>";
	for(var i = 0; i < data.length; i++) {
		optionsHtml += "<option value=\"" + data[i][0].toLowerCase() + "\">" + data[i][0] + "</option>";
	}
	$("#species-control")
		.html(optionsHtml)
		.val(lastQuery.species.toLowerCase())
		.change(function() { updateQuery({firedBy: "species"}); });
}

function updateParametersList(query) {
	if(query === undefined || query === null) {
		query = lastQuery;
	}
	$.ajax({
		url: "lib/getAvailableParams.php", 
		data: query, 
		dataType: "json", 
		success: function(data) {
			updateParametersSelect(data);
		}, 
		error: function(e) {
			alert(defaultErrorMessage + "(Error ParamList)");
		}
	});
}

function updateParametersSelect(data) {
	var optionsHtml = "";
	for(var i = 0; i < data.length; i++) {
		optionsHtml += "<option value=\"" + data[i][0].toLowerCase() + "\">" + data[i][0] + "</option>";
	}
	$("#parameter-control")
		.html(optionsHtml)
		.val(lastQuery.parameter.toLowerCase())
		.change(function() { updateQuery({firedBy: "parameter"}); });
	// check value, if null, just select first available
	if(!$("#parameter-control").val()) {
		$("#parameter-control").val(data[0][0].toLowerCase());
	}
}

function updateYearsSelect(data) {
	var optionsHtml = "";
	for(var i = parseInt(data['min']); i <= parseInt(data['max']); i++) {
		optionsHtml += "<option value=\"" + i + "\">" + i + "</option>";
	}
	$("#start-year-control")
		.html(optionsHtml)
		.val(lastQuery.startYear)
		.change(function() { updateQuery({firedBy: "startYear"}); });
	if(!$("#start-year-control").val()) {
		$("#start-year-control").val(data['min']);
	}
	$("#end-year-control")
		.html(optionsHtml)
		.val(lastQuery.endYear)
		.change(function() { updateQuery({firedBy: "endYear"}); });
	if(!$("#end-year-control").val()) {
		$("#end-year-control").val(data['max']);
	}
}

function updateStationsSelect() {
	// right now just gets list of stations
	var optionsHtml = "<option value=\"-1\" disabled>Select location</option>";
	for(var i = 0; i < stations.getLength(); i++) {
		var stationName = stations.item(i).get("name");
		optionsHtml += "<option value= + i + >" + stationName + "</option>";
	}
	// TODO create stations control
}