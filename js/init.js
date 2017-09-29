// MapServer
	// personal development environments
var mapfileGsDevURL_base  = "https://dill.sfei.org/cgi-bin/mapserv.fcgi?map=/var/mapwork/mapserverdevgs/", 
	mapfileLfDevURL_base  = "https://dill.sfei.org/cgi-bin/mapserv.fcgi?map=/var/mapwork/mapserverdevlf/", 
	mapfileLsDevURL_base  = "https://dill.sfei.org/cgi-bin/mapserv.fcgi?map=/var/mapwork/mapserverdevls/", 
	// testing and staging environments
	mapfileTesting0_base  = "https://mapserverdev.sfei.org/cgi-bin/mapserv.fcgi?map=/var/mapwork/mapfilesdev/",
	mapfileTesting1_base  = "https://mapserverdev.sfei.org/cgi-bin/mapserv.fcgi?map=/var/mapwork/mapfiles/",
	mapfileTesting2_base  = "https://mapserver.sfei.org/cgi-bin/mapserv.fcgi?map=/var/mapwork/mapfilesdev/",
	// production environment
	mapfileProdURL_base   = "https://mapserver.sfei.org/cgi-bin/mapserv.fcgi?map=/var/mapwork/mapfiles/";
	// set this variable to one of the above
var mapfileURL_base       = mapfileProdURL_base;

// outer require pulls shared config
require(['rconfig'], function(rconfig) {
	init();
});

// init function
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
			step = new STEP({mapserverUrl: mapfileURL_base});
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
