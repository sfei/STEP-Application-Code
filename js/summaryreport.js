
var reportColumns = [
	{ 
		name: function() { return "Species"; }, 
		width: 180, 
		valueKey: "species" 
	}, 
	{ 
		name: function(data) { return data.contaminant + " (" + data.units + ")"; }, 
		width: 80, 
		valueKey: "value" 
	}, 
	{ 
		name: function() { return "Sample Year"; }, 
		width: 60, 
		valueKey: "sampleYear" 
	}, 
	{ 
		name: function() { return "Prep Code"; }, 
		width: 80, 
		valueKey: "prepCode" 
	}, 
	{ 
		name: function() { return "Sample Type"; }, 
		width: 150,
		valueKey: "sampleType" 
	}
];

// this overrides the init from map.js
function init2() {
	// add text function to marker factory
	markerFactory = new MarkerFactory({
		shapeFunction: function(feature) {
			var watertype = feature.get("waterType");
			if(watertype === "lake_reservoir") {
				return markerFactory.shapes.circle;
			} else if(watertype === "coast") {
				return markerFactory.shapes.triangle;
			} else {
				return markerFactory.shapes.diamond;
			}
		},
		textFunction: function(feature) { return feature.get("name"); }
	});
	// query and legend initalizations removed (which also removes associated color styling)
	mapInit();
	$("#map-view").append(
		"<div id='map-controls' class='controls-group'>" + 
			"<select id='base-layer-control' onchange='changeBaseLayer()' style='width:160px;margin-right:45px;'>" + 
				"<option value=0>Topographic</option>" + 
				"<option value=1>Oceans</option>" + 
				"<option value=2>Imagery</option>" + 
			"</select>" + 
		"</div>"
	);
	// display station layer
	loadStationsLayer(data);
	zoomToStationsExtent();
	// fill header information
	var numResults = data.length;
	$("#content-header").html(numResults + " locations (inclusive) within " + query.radiusMiles + " miles of " + query.station);
	
	var container = $("#content-container");
	// loop through stations
	for(var i = 0; i < numResults; i++) {
		// add table
		var table = $("<div class='table'></div>").appendTo(container);
		// title
		table.append("<div class='table-row'>" + data[i].station + " (" + data[i].distanceMiles + " miles away)</div>");
		// table header
		var html = "<div class='table-row'>";
		for(var h = 0; h < reportColumns.length; h++) {
			html += "<div class='table-header' style='width:" + reportColumns[h].width + "px'>" + 
						reportColumns[h].name(data[i].records[0]) + 
					"</div>";
		}
		html += "</div>";
		table.append(html);
		// for each record
		for(var r = 0; r < data[i].records.length; r++) {
			html = "<div class='table-row'>";
			for(var c = 0; c < reportColumns.length; c++) {
				html += "<div class='table-cell' style='width:" + reportColumns[c].width + "px'>" + 
							data[i].records[r][reportColumns[c].valueKey] + 
						"</div>";
			}
			html += "</div>";
		}
		table.append(html);
	}
};