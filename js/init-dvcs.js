// outer require pulls shared config
require(['rconfig'], function(rconfig) {
	init();
});

// init function
function init() {
	require([
		'jquery', 
		'common', 
		'domReady', 
		'models/app-dv-compare-stations'
	], function(jquery, common, domReady, DVCompareStations) {
		domReady(function() {
			var params = window.parameters ? window.parameters : {};
			var dv = new DVCompareStations({
				width         : params.width     ? params.width     : 760, 
				barHeight     : params.barHeight ? params.barHeight : 3, 
				barSpacing    : 0, 
				supressLabels : true
			});
			dv.addGraphContainer("#dv-svg-container");
			dv.addStationsSelect("#dv-stations-select-container");
			dv.setThresholds(params.thresholds, params.colors);
			dv.update(
				{
					species     : params.species     ? params.species     : 'Largemouth Bass', 
					contaminant : params.contaminant ? params.contaminant : 'Mercury', 
					startYear   : params.startYear   ? params.startYear   : 1900, 
					endYear     : params.endYear     ? params.endYear     : 9999
				}, 
				function() {
					// resize if necessary
					var newHeight = DVCompareStations.getPopupHeight(params.barHeight, dv.data.stations.length);
					if(Math.abs(window.outerHeight - newHeight) > 20) {
						DVCompareStations.adjustWindow(newHeight);
					}
					// set title
					$("#dv-title").html(dv.title);
					// highlight station
					if(params.station) {
						for(var i = 0; i < dv.data.stations.length; i++) {
							if(dv.data.stations[i].name === params.station) {
								dv._highlightStation(i, true);
								break;
							}
						}
					}
				}
			);
			window.dv = dv;
		});
	}, function(e) {
		console.log(e);
		alert("There was an error initializing the required libraries.");
	});
}
