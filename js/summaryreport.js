
var reportColumns = [
	{ 
		name: function() { return "Species"; }, 
		width: 210, 
		valueKey: "species" 
	}, 
	{ 
		name: function(data) { 
			if(!data) {
				return query.contaminant;
			} else {
				return data.contaminant + " (" + data.units + ")";
			}
		}, 
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
		width: 210,
		valueKey: "sampleType" 
	}
];

// this overrides the init from map.js
function init2() {
	// adjust page title
	var titleHtml = query.contaminant + " Contamination Report<br />";
	titleHtml += "<span style='font-size:16px;'>";
	if(query.startYear !== query.endYear) {
		titleHtml += "Between " + query.startYear + "-" + query.endYear;
	} else {
		titleHtml += "for " + query.startYear;
	}
	titleHtml += "</span>";
	$("#title").html(titleHtml);
	// custom marker factory
	markerFactory = new MarkerFactory({
		resolution: 2, 
		colorMap: [[80, 80, 80], [245, 245, 245]], 
		shapeFunction: function(feature) {
			var watertype = feature.get("waterType");
			if(watertype.search(/reservoir|lake/i) >= 0) {
				return markerFactory.shapes.circle;
			} else if(watertype.search(/coast/i) >= 0) {
				return markerFactory.shapes.triangle;
			} else {
				return markerFactory.shapes.diamond;
			}
		}, 
		valueFunction: function(feature) {
			if(feature.get("name") === data[0].station) { return 1; }
			return 0;
		}, 
		textFunction: function(feature) {
			var featureName = feature.get("name");
			for(var i = 0; i < data.length; i++) {
				if(featureName === data[i].station) {
					return (i===0) ? featureName : String(i);
				}
			}
		}
	});
	// add basemap control dynamically
	var layerControls = $("<div id='layer-control'></div>").appendTo($("#map-view"))
		.html("Basemap: ")
		.css({
			position: 'absolute',
			top: -24,
			right: 0, 
			'font-size': '13px'
		});
	addBasemapControl(layerControls, { width: 200 });
	// query and legend initalizations removed (which also removes associated color styling)
	mapInit(1);
	// display station layer
	loadStationsLayer(data);
	zoomToStationsExtent();
	// fill header information
	var numResults = data.length;
	$("#content-header").html(
		"<b>" + (numResults-1) + "</b> location" + (numResults>0?"s":"") + " within <b>" + query.radiusMiles + "</b> miles of: <b>" + query.station + "</b>"
	);
	
	var container = $("#content-container");
	// loop through stations
	for(var i = 0; i < numResults; i++) {
		var hasResult = data[i].records && data[i].records.length > 0;
		// add table
		var table = $("<div id='station-table-" + i + "' class='table'></div>").appendTo(container);
		// title
		table.append(
			"<div class='table-row'>" + 
				((i === 0) ? "<b>" : "<b>" + i + ":</b> ") +
				data[i].station + 
				((i === 0) ? "</b>" : " <span style='font-size:11px;'>(" + data[i].distanceMiles + " mile" + (data[i].distanceMiles==1?"":"s") + " away)</span>") +
			"</div>"
		);
		// table header
		var html = "<div class='table-header-row'>";
		for(var c = 0; c < reportColumns.length; c++) {
			html += "<div class='table-header' style='" + getCellStyle(c) + "'>" + 
						reportColumns[c].name((hasResult) ? data[i].records[0] : null) + 
					"</div>";
		}
		html += "</div>";
		table.append(html);
		// for each record
		if(hasResult) {
			for(var r = 0; r < data[i].records.length; r++) {
				html = "<div class='table-row'" + ((r%2===0)?" style='background-color:#eee;'":"") + ">";
				for(var c = 0; c < reportColumns.length; c++) {
					html += "<div class='table-cell' style='" + getCellStyle(c) + "'>" + 
								data[i].records[r][reportColumns[c].valueKey] + 
							"</div>";
				}
				html += "</div>";
				table.append(html);
			}
		} else {
			table.append("<div class='table-row' style='font-size:12px;padding-left:8px;height:30px;line-height:30px;'>No records for the selected parameters at this station.</div>");
		}
	}
	
	// add click interactivity
	$(map.getViewport()).on('click', function(evt) {
		var pixel = map.getEventPixel(evt.originalEvent);
		map.forEachFeatureAtPixel(pixel, function(feature) {
			var stationName = feature.get("name");
			for(var i = 0; i < data.length; i++) {
				if(stationName === data[i].station) {
					$("html,body").scrollTop($("#station-table-"+i).offset().top);
					break;
				}
			}
			return true;
		});
	});
	
	// quick style function as first and last columns are a little special
	function getCellStyle(i) {
		var style = "width:" + reportColumns[i].width + "px;";
		if(i === 0) {
			style += "text-align:left;padding-left:8px;";
		}
		return style;
	}
	
};