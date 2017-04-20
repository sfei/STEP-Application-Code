var requirejs = require('requirejs'),
	builds = {
		// will build in reverse order just FYI
		dvcs: {
			mainConfigFile: "js/rconfig.js", 
			out:            "build/dvcs.js", 
			baseUrl:        "js", 
			name:           "init-dvcs"
		}, 
		app: {
			mainConfigFile: "js/rconfig.js", 
			out:            "build/step.js", 
			baseUrl:        "js", 
			name:           "init"
		}, 
		css: {
			cssIn:          "css/style.css", 
			out:            "build/style.css", 
			optimizeCss:    "default"
		}
	};
	
var lastFunction = null;
for(var key in builds) {
	var buildFunc = (function(k, c, f) {
		return function() {
			console.log("Building " + k + "..");
			requirejs.optimize(c, function(buildResponse) {
				console.log(buildResponse);
				if(f) {
					f();
				} else {
					console.log("Build completed");
				}
			}, function(err) {
				throw err;
			});
		};
	})(key, builds[key], lastFunction);
	lastFunction = buildFunc;
}
lastFunction();
