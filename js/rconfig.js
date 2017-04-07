require.config({
	export: {
		
	}, 
	shim: {
		// jQuery/UI plugins
		//chosen:                   ["jquery"], // chosen was having problems optimizing so modified the source
		"jquery.ui":              ["jquery"], 
		"jquery.ui.touch-punch":  ["jquery.ui"]
	}, 
	baseUrl: "js", 
	paths: {
		// plugins for require js
		domReady: "lib/require.domReady", 
		text:     "lib/require.text", 
		// jquery and plugins for
		jquery:                  "//ajax.googleapis.com/ajax/libs/jquery/2.1.4/jquery.min", 
		"jquery.ui":             "//ajax.googleapis.com/ajax/libs/jqueryui/1.11.4/jquery-ui.min", 
		"jquery.ui.touch-punch": "lib/jquery.ui.touch-punch.min", 
		chosen:                  "lib/chosen.jquery.min", 
		// library shortcuts
		//d3:             "//cdnjs.cloudflare.com/ajax/libs/d3/3.5.6/d3.min", 
		d3:             "lib/d3.v4.4.1.min", 
		common:         "lib/common/common", 
		"common.table": "lib/common/common.table", 
		noUiSlider:     "lib/nouislider.min", 
		OpenLayers:     "lib/ol.3.19.0", //"lib/ol.3.19.0-debug", 
		SimpleGraph:    "lib/d3-simplegraph/d3.simplegraph.min"
	}
});