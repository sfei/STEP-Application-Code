const requirejs = require('requirejs'), 
      path = require('path'), 
      fs = require('fs');

var required = [
        "css/chosen-sprite.png", 
        "css/chosen-sprite@2x.png", 
        "js/lib/require.js"
    ],
    builds = {
        // will build in reverse order just FYI
        dvcs: {
            mainConfigFile: "js/rconfig.js", 
            out:            "build/dvcs.js", 
            baseUrl:        "js", 
            name:           "init-dvcs"
        }, 
        storymap: {
            mainConfigFile: "js/rconfig.js", 
            out:            "build/storymap.js", 
            baseUrl:        "js", 
            name:           "init-storymap"
        }, 
        app: {
            mainConfigFile: "js/rconfig.js", 
            out:            "build/step.js", 
            baseUrl:        "js", 
            name:           "init"
        }, 
        'css (Summary Report)': {
            cssIn:          "css/summaryreport.css", 
            out:            "build/summaryreport.css", 
            optimizeCss:    "default"
        }, 
        'css (Storymap)': {
            cssIn:          "css/storymap.css", 
            out:            "build/storymap.css", 
            optimizeCss:    "default"
        }, 
        css: {
            cssIn:          "css/style.css", 
            out:            "build/style.css", 
            optimizeCss:    "default"
        }
    };

console.log("Copying required files..");
for(var i = 0; i < required.length; i++) {
    var reqlib = required[i];
        rs = fs.createReadStream(reqlib), 
        ws = fs.createWriteStream("build/"+path.basename(reqlib));
    rs.on("error", function(err) {
        console.log(err);
    });
    ws.on("error", function(err) {
        console.log(err);
    });
    rs.pipe(ws);
}

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
                console.log(err);
                throw err;
            });
        };
    })(key, builds[key], lastFunction);
    lastFunction = buildFunc;
}
lastFunction();
