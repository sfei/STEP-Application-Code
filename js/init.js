
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
            window.step = new STEP({
                gaKey: config.gaKey ? config.gaKey : false, 
                mapserverUrl: config.mapserverUrl
            });
            if(typeof summaryReport !== "undefined" && summaryReport) {
                // summary report mode
                SummaryReport(window.step, reportQuery, reportData);
            } else {
                // preset default queries
                var defaultQuery = null, 
                    storymapMode = false, 
                    customView = null, 
                    filterStations = null, 
                    skipInstructions = false;
                if(params.sm || params.view) {
                    var view = (params.sm || params.view).toLowerCase();
                    switch(view) {
                        case "gm18":
                        case "geographic mystery":
                            customView = "gm18";
                            defaultQuery = {
                                species: "Largemouth Bass", 
                                contaminant: "Mercury", 
                                startYear: 2007,
                                endYear: 2014
                            };
                            storymapMode = true;
                            break;
                        case "oceanic":
                            customView = "oceanic";
                            defaultQuery = {
                                species: "highest", 
                                contaminant: "Mercury"
                            };
                            storymapMode = true;
                            filterStations = function(station) {
                                return station.waterType.search(/coast/i) >= 0;
                            };
                            break;
                    }
                }
                window.step.init({
                    defaultQuery: defaultQuery, 
                    storymapMode: storymapMode, 
                    skipInstructions: skipInstructions, 
                    filterStations: filterStations
                });
                // google analytics
                if(typeof window.gtag !== "undefined" && config.gaKey) {
                    var opts = {
                        "page_title": "", 
                        "page_path": "/"
                    };
                    if(customView) {
                        opts["page_title"] += view;
                        opts["page_path"] += "/" + view;
                    }
                    window.gtag('config', config.gaKey, opts);
                }
            }
        });
    }, function(e) {
        console.log(e);
        alert("There was an error initializing the required libraries.");
    });
}
