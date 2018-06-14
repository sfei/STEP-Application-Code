
require(['rconfig'], function(rconfig) {
    require(['jquery'], function(jQuery) {
        $.ajax({
            url: "lib/query.php", 
            data: { query: "getConfigOptions"}, 
            dataType: "json",
            error: function(jqXHR, textStatus, errorThrown) {
                console.log(textStatus + ": " + errorThrown);
                alert("There was an error loading the application.");
            }, 
            success: init
        });
    });
});

function init(config) {
    require([
        'common', 
        'domReady', 
        'ie-is-special', 
        'models/app-step', 
        'models/app-summary-report'
    ], function(common, domReady, ieFixes, STEP, SummaryReport) {
        // Internet Explorer versioning check (although jQuery alone would have thrown several exceptions by this point)
        if(window.browserType.isIE && window.browserType.ieVersion <= 9) {
            alert("This application is not compatible with Internet Explorer version 9 or below.");
        }
        // loading message
        common.setModalAsLoading();
        // get URI params
        var params = {};
        if(window.location.search && window.location.search !== "") {
            window.location.search.substring(1).split("&").forEach(function(i) {
                var pair = i.split("=");
                if(pair.length > 1) {
                    params[pair[0]] =  decodeURIComponent(pair[1]);
                }
            });
        }
        domReady(function() {
            window.step = new STEP({mapserverUrl: config.mapserverUrl});
            if(typeof summaryReport !== "undefined" && summaryReport) {
                // summary report mode
                SummaryReport(window.step, reportQuery, reportData);
            } else {
                // preset default queries
                var defaultQuery = null, 
                    storymapMode = false, 
                    skipInstructions = false;
                if(params.sm || params.view) {
                    var view = params.sm || params.view;
                    switch(view.toLowerCase()) {
                        case "gm18":
                        case "geographic mystery":
                            defaultQuery = {
                                species: "Largemouth Bass", 
                                contaminant: "Mercury", 
                                startYear: 2007,
                                endYear: 2014
                            };
                            storymapMode = true;
                            break;
                    }
                }
                window.step.init({
                    defaultQuery: defaultQuery, 
                    storymapMode: storymapMode, 
                    skipInstructions: skipInstructions
                });
            }
        });
    }, function(e) {
        console.log(e);
        alert("There was an error initializing the required libraries.");
    });
}
