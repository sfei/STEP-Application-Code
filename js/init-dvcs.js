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
		// Internet Explorer versioning check (although jQuery alone would have thrown several exceptions by this point)
		if(window.browserType.isIE && window.browserType.ieVersion <= 9) {
			alert("This application is not compatible with Internet Explorer version 9 or below.");
		}
		domReady(function() {
			var query = window.parameters ? window.parameters : {};
			query.species = query.species ? query.species : 'Largemouth Bass';
			query.contaminant = query.contaminant ? query.contaminant : 'Mercury';
			query.startYear = query.startYear ? query.startYear : 1900;
			query.endYear = query.endYear ? query.endYear : 3000;
			
			
			var width = window.parameters.width ? window.parameters.width : 760;
			var padding = 15;
			width -= 2*padding;
			$("#dv-container").width(width).css("padding", padding);
			
//			$("#dv-back-to-top").on('click', function() {
//				$('body,html').animate(
//					{scrollTop: 0}, 
//					// little weird that this is inconsistent between Chrome and others
//					50 + 100*Math.log(10*$(window.browserType.isChrome ? "body" : "body,html").scrollTop())
//				);
//			});
			
			var dv = new DVCompareStations({
				width: width, 
				barHeight: 3, 
				barSpacing: 0, 
				supressLabels: true
			});
			dv.addGraphContainer("#dv-svg-container");
			dv.addStationsSelect("#dv-stations-select-container");
			dv.update(query, function() {
				$("#dv-title").html(dv.title);
			});
			window.dv = dv;
		});
	}, function(e) {
		console.log(e);
		alert("There was an error initializing the required libraries.");
	});
}
