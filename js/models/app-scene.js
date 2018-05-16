define([
    'jquery', 
    'intersection-observer', 
    'scrollama'
], function(
    jQuery, 
    io, 
    scrollama
) {
    
    var _knownActions = ["hold", "release", "last"];
    
    function Scene(options) {
        this.container   = $(options.container).attr("sm-container", "scene");
        this.narrative   = $(options.narrative).attr("sm-container", "narrative");
        this.visuals     = $(options.visuals).attr("sm-container", "visuals");
        // debug mode logs things into console
        this._debugMode  = !!options.debugMode;
        // add 'invisible' element to track viewport at end of scene (scrollama is buggy here)
        this._lastHidden = $("<div>", {'class': "sm-step", 'sm-action': 'last'}).appendTo(this.narrative);
        // initiate scrollama
        this.scroller  = scrollama().setup({
            container: options.container, 
            text: options.narrative, 
            graphic: options.visuals, 
            step: options.narrative + " .sm-step", 
            offset: 0, 
            progress: true, 
            threshold: 1
        });
        // vars to keep track of visuals transitions
        this._inTransition   = false;
        this._visualStep     = 0;
        this._lastProgress   = 0;
        this._inContainer    = false;
        // custom trigger functions
        this._customActions  = {};
        // resize listener
        this._resizeListener = null;
        this._resizeEnabler  = null;
        this._activeResize   = false;
        this._activeRenabler = false;
        
        // add expected step number to narrative steps
        var self = this, step = 0, moving = false;
        this.narrative.find(".sm-step").each(function() {
            var actions = self._getActions(this);
            if(moving) {
                ++step;
                if(actions.hold) moving = false;
            } else if(actions.release) {
                moving = true;
            }
            this.setAttribute("sm-step", step);
        });
        // activate scrollama listeners
        this.__activate(options);
    };
    
    Scene.prototype.destroy = function() {
        this.container.attr("sm-container", "");
        this.narrative.attr("sm-container", "");
        this.visuals.attr("sm-container", "");
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
        actions = actions ? actions.split(" ") : [];
        // match actions
        var found = {_actions: actions};
        for(var i = 0; i < _knownActions.length; ++i) {
            found[_knownActions[i]] = actions.indexOf(_knownActions[i]) >= 0;
        }
        // get call functions
        actions = element.getAttribute("sm-call");
        found._call = actions ? actions.split(" ") : [];
        // expected step
        found._step = parseInt(element.getAttribute("sm-step"));
        return found;
    };
    
    Scene.prototype.__activate = function(options) {
        var resizeElems = $(".sm-step[sm-action*=\"release\"], .sm-step[sm-action*=\"hold\"], .sm-step[sm-action*=\"last\"]"), 
            self = this, 
            lastStep = 0;
        if(options.resizeHeightElems) {
            resizeElems = resizeElems.add(options.resizeHeightElems);
        }
        
        this._resizeEnabler = function() {
            console.log('enable');
            self.scroller.enable();
            self._activeResizer = false;
            self._activeRenabler = false;
        };
        
        this._resizeListener = function() {
            var winHeight = $(window).height();
            // resize elems that are supposed to be 100vh
            resizeElems.height(winHeight);
            // position and resize scroll elements
            if(self._inContainer) {
                if(self._inTransition) {
                    self.visuals.css("top", -(lastStep-1+self._lastProgress)*winHeight);
                } else {
                    self.visuals.css("top", -lastStep*winHeight);
                }
            }
            self.scroller.resize();
            // add a minor delay to activating again
            if(self._activeRenabler) {
                window.clearTimeout(self._activeRenabler);
            }
            self._activeRenabler = window.setTimeout(self._resizeEnabler, 400);
        };
        
        window.addEventListener("resize", function() {
            self.scroller.disable();
            if(self._activeResizer) {
                clearTimeout(self._resizeListener);
            } else {
                lastStep = self._visualStep;
            }
            self._activeResizer = window.setTimeout(self._resizeListener, 100);
        });
        
        resizeElems.height($(window).height());
        
        this.scroller.resize()
            // scene enter/exit functions
            .onContainerEnter(function(res) {
                if(!self._activeResizer && !self._inContainer) {
                    if(res.direction === "down") {
                        self._log("container enter (down)");
                        self.visuals.addClass("active").removeClass("exit-bottom")
                            .css("top", "");
                    } else if(res.direction === "up") {
                        self._log("container enter (up)");
                        self.visuals.addClass("active").removeClass("exit-bottom");
                    }
                    self._inContainer = true;
                }
            })
            .onContainerExit(function(res) {
                if(!self._activeResizer && self._inContainer) {
                    if(res.direction === "up") {
                        self._log("container exit (up)");
                        self._inTransition = false;
                        self.visuals.removeClass("active").css("top", "");
                        self._visualStep = 0;
                        self._inContainer = false;
                    } else if(self._lastHidden.offset().top <= window.pageYOffset) {
                        self._log("container exit (down)");
                        self._inContainer = false;
                    }
                }
            })
            // narrative step enter (handles down movement only)
            .onStepEnter(function(res) {
                if(self._inContainer && !self._activeResizer && res.direction === "down") {
                    var actions = self._getActions(res.element);
                    if(actions.last) {
                        self._log("fix bottom");
                        self.visuals.addClass("exit-bottom").removeClass("active");
                        self._inTransition = false;
                    } else if(actions.release) {
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
                    // missteps common after resize
                    if(self._visualStep !== actions._step + (self._inTransition ? 1 : 0)) {
                        self._log("step mismatch (down) " + self._visualStep + " != " + actions._step);
                        self._visualStep = actions._step;
                        if(actions.last) {
                            self._log("fix bottom");
                            self.visuals.addClass("exit-bottom").removeClass("active");
                            self._inTransition = false;
                        } else if(!self._inTransition) {
                            self.visuals.css("top", -self._visualStep*$(window).height());
                        } else {
                            self._visualStep += 1;
                            self.visuals.css("top", -(self._visualStep-1+self._lastProgress)*$(window).height());
                        }
                    }
                }
            })
            // narrative step exit
            .onStepExit(function(res) {
                if(self._inContainer && !self._activeResizer && res.direction === "up") {
                    var actions = self._getActions(res.element);
                    if(actions.last) {
                        self._log("unfix bottom");
                        self.visuals.addClass("active").removeClass("exit-bottom");
                        self._inTransition = false;
                    } else if(actions.release) {
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
                    if(self._visualStep !== actions._step) {
                        self._log("step mismatch (up) " + self._visualStep + " != " + actions._step);
                        self._visualStep = actions._step;
                        if(actions.last) {
                            self._log("unfix bottom");
                            self.visuals.addClass("active").removeClass("exit-bottom");
                            self._inTransition = false;
                        } else if(!self._inTransition) {
                            self.visuals.css("top", -(--self._visualStep)*$(window).height());
                        } else {
                            self.visuals.css("top", -(self._visualStep-1+self._lastProgress)*$(window).height());
                        }
                    }
                }
            })
            // narrative step progress
            .onStepProgress(!self._activeResizer && function(res) {
                if(self._inTransition) {
                    self._lastProgress = res.progress;
                    self.visuals.css("top", -(self._visualStep-1+res.progress)*$(window).height());
                }
            });
    };
    
    return Scene;
    
});