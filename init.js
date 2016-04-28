
require.config({
	paths: {
		// plugins for require js
		domReady:     "js/require.domReady", 
		// library shortcuts
		common:       "js/common", 
		d3:           "//cdnjs.cloudflare.com/ajax/libs/d3/3.5.6/d3.min", 
		noUiSlider:   "js/nouislider.min", 
		OpenLayers:   "//openlayers.org/en/v3.10.1/build/ol", 
		SimpleGraph:  "js/simple-graph"
	}
});

var step;

require([
	'common', // requiring common on top init so global changes are available everywhere
	'domReady', 
	'models/app-step', 
	'models/app-summary-report'
], function(common, domReady, STEP, SummaryReport) {
	common.setModalAsLoading(true, false);
	domReady(function() {
		step = new STEP();
		if(typeof summaryReport !== "undefined" && summaryReport) {
			SummaryReport(step, reportQuery, reportData);
		} else {
			step.init();
		}
	});
});
