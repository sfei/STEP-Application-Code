
require(['rconfig'], function(rconfig) {
	init();
});

function init() {
	require([
		'jquery', 
		'jquery.ui', 
		'common', 
		'domReady', 
		'models/app-step', 
		'models/app-summary-report'
	], function(jquery, jqueryui, common, domReady, STEP, SummaryReport) {
		// Internet Explorer versioning check (although jQuery alone would have thrown several exceptions by this point)
		if(window.browserType.isIE && window.browserType.ieVersion <= 9) {
			alert("This application is not compatible with Internet Explorer version 9 or below.");
		}
		common.setModalAsLoading();
		domReady(function() {
			step = new STEP();
			if(typeof summaryReport !== "undefined" && summaryReport) {
				SummaryReport(step, reportQuery, reportData);
			} else {
				step.init();
			}
		});
	}, function(e) {
		console.log(e);
		alert("There was an error initializing the required libraries.");
	});
}
