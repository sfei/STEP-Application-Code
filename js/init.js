
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
        'models/app-step', 
        'models/app-summary-report'
    ], function(common, domReady, STEP, SummaryReport) {
        // Internet Explorer versioning check (although jQuery alone would have thrown several exceptions by this point)
        if(window.browserType.isIE && window.browserType.ieVersion <= 9) {
            alert("This application is not compatible with Internet Explorer version 9 or below.");
        }
        common.setModalAsLoading();
        domReady(function() {
            window.step = new STEP({mapserverUrl: config.mapserverUrl});
            if(typeof summaryReport !== "undefined" && summaryReport) {
                SummaryReport(window.step, reportQuery, reportData);
            } else {
                window.step.init();
            }
        });
    }, function(e) {
        console.log(e);
        alert("There was an error initializing the required libraries.");
    });
}
