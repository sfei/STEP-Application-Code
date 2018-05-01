require(['rconfig'], function(rconfig) {
    require(['jquery'], function(jQuery) {
        window.scrollTo(0,0);
        var count = 0, 
            wait = 3, 
            config, 
            checkComplete = function() {
                if(++count === wait) init(config);
            };
        $.ajax({
            url: "lib/query.php", 
            data: { query: "getConfigOptions"}, 
            dataType: "json",
            error: function(jqXHR, textStatus, errorThrown) {
                console.log(textStatus + ": " + errorThrown);
                alert("There was an error loading the application.");
            }, 
            success: function(data) {
                config = data;
                checkComplete();
            }
        });
        $.ajax({
            url: "layouts/storymap-narrative.html", 
            error: function(jqXHR, textStatus, errorThrown) {
                console.log(textStatus + ": " + errorThrown);
                alert("There was an error loading the application.");
            }, 
            success: function(html) {
                $("#storymap-container #narrative").html(html);
                checkComplete();
            }
        });
        $.ajax({
            url: "layouts/storymap-visuals.html", 
            error: function(jqXHR, textStatus, errorThrown) {
                console.log(textStatus + ": " + errorThrown);
                alert("There was an error loading the application.");
            }, 
            success: function(html) {
                $("#storymap-container #visual").html(html);
                checkComplete();
            }
        });
    });
});

function init(config) {
    require([
        'domReady!', 
        'models/app-step', 
        'models/app-scene'
    ], function(domReady, STEP, Scene) {
        // init STEP
        window.step = new STEP({mapserverUrl: config.mapserverUrl});
        window.step.init({mode: "storymap"});
        // init storymap scene
        window.scene = new Scene({
            container: "#storymap-container", 
            narrative: "#narrative", 
            visuals:   "#visual", 
            debugMode: true
        });
        // add actions
        var currentView = {
            center: window.step.map.getView().getCenter(), 
            zoom: window.step.map.getView().getZoom()
        };
        window.scene.addAction(
            "zoomToBay", 
            function() {
                window.step.map.getView().animate({
                    center: [-13614222.36580416, 4554343.933348742], 
                    zoom: 10
                });
            }, 
            function() {
                window.step.map.getView().animate(currentView);
            }
        );
        // fade out loading
        var loadingDiv = document.querySelector("#storymap-loading");
        loadingDiv.style["opacity"] = 0;
        setTimeout(function() {
            loadingDiv.remove();
            document.body.style.removeProperty("overflow-y");
        }, 800);
    }, function(e) {
        console.log(e);
        alert("There was an error initializing the required libraries.");
    });
}
