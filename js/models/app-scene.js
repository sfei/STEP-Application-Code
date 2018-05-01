define([
    'jquery', 
    'intersection-observer', 
    'scrollama'
], function(
    jQuery, 
    io, 
    scrollama
) {
    
    var _knownActions = ["hold", "release", "next", "last"];
    
    function Scene(options) {
        this.container = $(options.container);
        this.narrative = $(options.narrative);
        this.visuals   = $(options.visuals);
        
        this.scroller  = scrollama().setup({
            container: options.container, 
            text: options.narrative, 
            graphic: options.visuals, 
            step: options.narrative + " .sm-step", 
            offset: 0, 
            progress: true
        });
        
        this._inTransition  = false;
        this._visualStep    = 0;
        this._lastProgress  = 0;
        this._customActions = {};
        this._debugMode     = !!options.debugMode;
        
        this._resizeListener = null;
        
        var lastNarrative = this.narrative.find(":last-child.sm-step"), 
            actions       = this._getActions(lastNarrative[0]);
        if(!actions.last) {
            actions._actions.push("last");
            lastNarrative.attr("sm-action", actions._actions.join(" "));
        }
        this.__activate();
    };
    
    Scene.prototype.destroy = function() {
        window.removeEventListener("resize", this._resizeListener);
        this.scroller.destroy();
        this.scroller = null;
    };
    
    Scene.prototype.addAction = function(key, action, reverse) {
        this._customActions[key] = [action, reverse];
    };
    
    Scene.prototype.removeAction = function(key) {
        delete this._CustomActions[key];
    };
    
    Scene.prototype._log = function(msg) {
        if(this._debugMode) console.log(msg);
    };
    
    Scene.prototype._getActions = function(element) {
        // get actions
        var actions = element.getAttribute("sm-action");
        if(!actions) {
            actions = [];
        } else {
            actions = actions.split();
        }
        // match actions
        var found = {_actions: actions};
        for(var i = 0; i < _knownActions.length; ++i) {
            found[_knownActions[i]] = actions.indexOf(_knownActions[i]) >= 0;
        }
        // get call functions
        actions = element.getAttribute("sm-call");
        if(!actions) {
            actions = [];
        } else {
            actions = actions.split();
        }
        found._call = actions;
        return found;
    };
    
    Scene.prototype.__activate = function() {
        var self = this;
        this._resizeListener = function() {
            if(self._inTransition) {
                self.visuals.css("top", -(self._visualStep-1+self._lastProgress)*$(window).height());
            } else {
                self.visuals.css("top", -self._visualStep*$(window).height());
            }
        };
        window.addEventListener("rise", this._resizeListener);
        
        this.scroller
            // scene enter/exit functions
            .onContainerEnter(function(res) {
                if(res.direction === "down") {
                    self._log("container enter (down)");
                    self.visuals.addClass("active").removeClass("exit-bottom")
                        .css("top", "");
                }
            })
            .onContainerExit(function(res) {
                if(res.direction === "up") {
                    self._log("container exit (up)");
                    self._inTransition = false;
                    self.visuals.removeClass("active").css("top", "");
                }
            })
            // narrative step enter (handles down movement only)
            .onStepEnter(function(res) {
                if(res.direction === "down") {
                    var actions = self._getActions(res.element);
                    if(actions.last) {
                        self._log("container exit (down)");
                        self._inTransition = false;
                        self.visuals.addClass("exit-bottom").removeClass("active")
                            .css("top", -self._visualStep*$(window).height());
                    }
                    if(actions.release) {
                        self._log("release (down)");
                        self._inTransition = true;
                        ++self._visualStep;
                    } else if(actions.hold) {
                        self._log("hold (down)");
                        self.visuals.css("top", -self._visualStep*$(window).height());
                        self._inTransition = false;
                    } else if(self._inTransition) {
                        self._log("next (down)");
                        ++self._visualStep;
                    }
                    for(var i = 0; i < actions._call.length; ++i) {
                        var callbacks = self._customActions[actions._call[i]];
                        if(callbacks && callbacks[0]) callbacks[0]();
                    }
                }
            })
            // narrative step exit
            .onStepExit(function(res) {
                if(res.direction === "up") {
                    var actions = self._getActions(res.element);
                    if(actions.last) {
                        self._log("container enter (up)");
                        self.visuals.addClass("active").removeClass("exit-bottom");
                    }
                    if(actions.release) {
                        self._log("hold (up)");
                        self.visuals.css("top", -(--self._visualStep)*$(window).height());
                        self._inTransition = false;
                    } else if(actions.hold) {
                        self._log("release (up)");
                        self._inTransition = true;
                    } else if(self._inTransition) {
                        self._log("next (up)");
                        --self._visualStep;
                    }
                    for(var i = actions._call.length-1; i >= 0; --i) {
                        var callbacks = self._customActions[actions._call[i]];
                        if(callbacks && callbacks[1]) callbacks[1]();
                    }
                }
            })
            // narrative step progress
            .onStepProgress(function(res) {
                if(self._inTransition) {
                    self._lastProgress = res.progress;
                    self.visuals.css("top", -(self._visualStep-1+res.progress)*$(window).height());
                }
            });
    };
    
    return Scene;
    
});