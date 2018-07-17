require(['rconfig'], function(rconfig) {
    require(['jquery'], function(jQuery) {
        window.scrollTo(0,0);
        var count = 0, 
            wait = 3, 
            config, 
            checkComplete = function() {
                if(++count === wait) init(window, config);
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

function init(root, config) {
    require([
        'ie-is-special', 
        'domReady!', 
        'models/app-step', 
        'models/app-scene'
    ], function(ieFixes, domReady, STEP, Scene) {
        
        // init STEP
        root.step = new STEP({mapserverUrl: config.mapserverUrl});
        root.step.init({
            storymapMode: true, 
            skipInstructions: true, 
            defaultQuery: {
                species: "Largemouth Bass", 
                contaminant: "Mercury", 
                startYear: 2007,
                endYear: 2014
            }
        });
        // turn off no-data points
        root.step.modules.queryAndUI.toggleNoDataDisplay(false, true);
        
        // legend show/hide modified since we put tab on top of screen now
        root.step.modules.legend.legendHide = function() {
            $("#legend-container").hide();
            $("#show-legend-tab").show("slide", { direction: "up" }, 400);
        };
        $("#hide-legend-tab").off('click').on('click', root.step.modules.legend.legendHide);
        root.step.modules.legend.legendShow = function() {
            $("#legend-container").show();
            $("#show-legend-tab").hide("slide", { direction: "up" }, 100);
        };
        
        // init storymap scene
        root.scene = new Scene({
            container:         "#storymap-container", 
            narrative:         "#narrative", 
            visuals:           "#visual", 
            debugMode:         false, 
            offset:            0, 
            resizeHeightElems: ".sm-page, .sm-spacer, .sm-mobile-spacer"
        });
        
        // change frame action
        var changeFrame = function(frameNo, reverse) {
            frameNo = parseInt(frameNo);
            var prevFrame = $("#frame-"+(frameNo + (reverse ? 1 : -1)));
            if(!prevFrame.length) {
                $("#frame-"+frameNo).show();
                return;
            }
            prevFrame.css({
                'position': "absolute", 
                'top':      0, 
                'left':     0, 
                'opacity':  1, 
                'z-index':  99
            });
            var nextFrame = $("#frame-"+frameNo).css({
                                'position': "absolute", 
                                'top': 0, 
                                'left': 0, 
                                'opacity': 0, 
                                'z-index': 90
                            }).show();
            var clear = {'opacity':'','z-index':'','position':'','top':'','left':''};
            prevFrame.animate(
                {opacity: 0}, 300, 'swing', 
                function() { prevFrame.hide().css(clear); }
            );
            nextFrame.animate(
                {opacity: 1}, 300, 'swing', 
                function() { nextFrame.show().css(clear); }
            );
        };
        root.scene.addAction(
            "swapFrame", 
            function(elem) {
                changeFrame(elem.getAttribute("next-frame"));
            }, 
            function(elem) {
                changeFrame(parseInt(elem.getAttribute("next-frame"))-1, true);
            }
        );
        
        // map zoom action
//        var currentView = {
//            center: root.step.map.getView().getCenter(), 
//            zoom: root.step.map.getView().getZoom()
//        };
//        root.scene.addAction(
//            "mapFunctionA", 
//            function() {
//                root.step.map.getView().animate({
//                    center: [-12796399.011894481, 3947754.771558293], 
//                    zoom: 8
//                });
//                root.step.modules.legend.legendHide();
//            }, 
//            function() {
//                root.step.map.getView().animate(currentView);
//                root.step.modules.legend.legendShow();
//            }
//        );

        // ensure resizing of step map (as it doesn't when offscreen)
        window.addEventListener('resize', function() { root.step.map.updateSize(); });
        
        // turn on first frame
        $(".frame").hide();
        $("#frame-1").show();
        
        // fade out loading
        var loadingDiv = document.querySelector("#storymap-loading");
        loadingDiv.innerHTML = "";
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
