require.config({
    shim: {
        // jQuery/UI plugins
        //chosen:                   ["jquery"], // chosen was having problems optimizing so modified the source
        "jquery.ui":             ["jquery"], 
        "jquery.ui.touch-punch": ["jquery.ui"]
    }, 
    baseUrl: "js", 
    paths: {
        // plugins for require js
        domReady:                "lib/require.domReady", 
        // jquery and plugins for
        jquery:                  "//ajax.googleapis.com/ajax/libs/jquery/2.1.4/jquery.min", 
        "jquery.ui":             "//ajax.googleapis.com/ajax/libs/jqueryui/1.11.4/jquery-ui.min", 
        "jquery.ui.touch-punch": "lib/jquery.ui.touch-punch.min", 
        chosen:                  "lib/chosen.jquery.min", 
        // library shortcuts
        d3:                      "lib/d3.v4.4.1.min", 
        common:                  "lib/common.min", 
        "common.table":          "lib/common.table.min", 
        "intersection-observer": "lib/intersection-observer", 
        noUiSlider:              "lib/nouislider.min", 
        OpenLayers:              "lib/ol.4.6.5", //"lib/ol.4.5.6-debug", 
        scrollama:               "lib/scrollama", 
        SimpleGraph:             "lib/d3.simplegraph.min"
    }
});