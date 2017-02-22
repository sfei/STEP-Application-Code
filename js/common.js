
define(function() {
	// these functions are defined globally and/or added to basic prototypes -- only needs to be applied once
	if(!window.helpersDefined) {
		//****************************************************************************************************
		// Prototype extensions
		//****************************************************************************************************
		/**
		 * Capitalize the first letter of every word. (A word is determined by any string preceded by whitespace, as 
		 * such ignores second word in hyphenated compound words).
		 * @returns {string} Capitalized version of this string.
		 */
		String.prototype.capitalize = function() {
			return this.replace(/(?:^|\s)\S/g, function(a) { return a.toUpperCase(); });
		};
		
		/**
		 * Center itself in the window with absolute positioning.
		 * @returns {jQuery} Itself.
		 */
		jQuery.fn.center = function() {
			this.css({
				position: "absolute", 
				top: Math.max(0, (($(window).height() - $(this).outerHeight()) / 2) +  $(window).scrollTop()),
				left: Math.max(0, (($(window).width() - $(this).outerWidth()) / 2) + $(window).scrollLeft())
			});
			return this;
		};
		
		//****************************************************************************************************
		// Global functions
		//****************************************************************************************************
		/**
		 * Custom function to create a new window. Has a lot of useful functionality that gets commonly used, e.g. 
		 * having every new window centered on the monitor, even accounting for dual monitor setups.
		 * @param {event} e - Event object (useful on links where you want to keep the middle-mouse clicks and 
		 *    ctrl+left-clicks as new tabs as those are filtered and ignored).
		 * @param {string} url - Link URL.
		 * @param {string} name - New window name.
		 * @param {number} width - Width in pixels.
		 * @param {number} height - Height in pixels.
		 * @param {boolean} minimal - If true forces hiding of menubar, statusbar, and location (although with many 
		 *    modern browsers this has no effect).
		 * @returns {Window} The new window object.
		 */
		window.newWindow = function(e, url, name, width, height, minimal) {
			if(!e) e = window.event;
			if(e === undefined || !(e.which === 2 || (e.which === 1 && e.ctrlKey))) {
				// center window, from http://www.xtf.dk/2011/08/center-new-popup-window-even-on.html
				// Fixes dual-screen position                         Most browsers      Firefox
				var dualScreenLeft = window.screenLeft != undefined ? window.screenLeft : screen.left;
				var dualScreenTop = window.screenTop != undefined ? window.screenTop : screen.top;
				var winWidth = window.innerWidth ? window.innerWidth : document.documentElement.clientWidth ? document.documentElement.clientWidth : screen.width;
				var winHeight = window.innerHeight ? window.innerHeight : document.documentElement.clientHeight ? document.documentElement.clientHeight : screen.height;
				var left = ((winWidth / 2) - (width / 2)) + dualScreenLeft;
				var top = ((winHeight / 2) - (height / 2)) + dualScreenTop;
				var options = "width=" + width + ", height=" + height + ", left=" + left + ", top=" + top;
				if(minimal) {
					options += ", scrollbars=yes, menubar=no, statusbar=no, location=no";
				} else {
					options += ", scrollbars=yes, menubar=yes, statusbar=yes, location=yes";
				 }
				var newWin = window.open(url, '', options);
				if(!newWin || newWin.closed || typeof newWin.closed === 'undefined') {
					alert("Could not open new window, to view '" + name + "' allow an exception for this domain in your pop-up blocker's settings.");
					return null;
				 } else {
					if(newWin) { newWin.focus(); }
					return newWin;
				}
			}
		};

		window.getUrlGetVars = function() {
			var vars = {};
			window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
				vars[key] = value;
			});
			return vars;
		};
		
		//****************************************************************************************************
		// Global variables
		//****************************************************************************************************
		window.browserType = {
			isOpera: !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0, 
			isFirefox: typeof InstallTrigger !== 'undefined', 
			isSafari: Object.prototype.toString.call(window.HTMLElement).indexOf('Constructor') > 0, 
			isChrome: !!window.chrome && !this.isOpera, 
			isIE: /*@cc_on!@*/false || !!document.documentMode
		};
		if(window.browserType.isIE) {
			var ua = navigator.userAgent.toLowerCase();
			if(ua.indexOf('msie') >= 0) {
				window.browserType.ieVersion = parseInt(ua.split('msie')[1]);
			} else if(ua.indexOf('trident/') >= 0) {
				window.browserType.ieVersion = parseInt(ua.split('rv:')[1]);
			} else if(ua.indexOf('edge/') >= 0) {
				window.browserType.ieVersion = parseInt(ua.split('edge/')[1]);
			} else {
				// unknown
				window.browserType.ieVersion = 9999;
			}
		}
		
		window.defaultErrorMessage	= "This site is experiencing some technical difficulties. Please try again later. ";
		
		window.helpersDefined = true;
	}
	
	//********************************************************************************************************
	// Return object of utility functions
	//********************************************************************************************************
	return {
		/**
		 * Adds the handling of adding/removing the 'grab' and 'grabbing' css classes on mouse drag events. 
		 * Original for the map (as OpenLayers doesn't do this automatically) but useful for a lot of other 
		 * stuff, like custom dialog boxes/windows.
		 * @param {jQuery} element - jQuery object for element to add functionality to.
		 */
		addGrabCursorFunctionality: function(element) {
			element.addClass("grab");
			element.mousedown(function() {
				element.removeClass("grab").addClass("grabbing");
			}).mouseup(function() {
				element.removeClass("grabbing").addClass("grab");
			});
		}, 

		/**
		 * Create (or destroy) a modal dialog.
		 * @param {boolean} visible - True creates, false removes.
		 * @param {boolean} showBackground - Whether to hve a semi-transparent div over the background (so as to 
		 *    visually signify the modal status). Keep in mind in older browsers that don't support transparency it'll
		 *    just grey out the entire background.
		 * @param {string} content - The HTML content of the modal dialog.
		 */
		setModal: function(visible, showBackground, content) {
			var modalContainer = $("#modal-container-outer");
			if(!visible) {
				modalContainer.hide();
			} else {
				modalContainer.find("#modal-container-inner").html(content);
				modalContainer
					.css('background-color', showBackground ? 'rgba(200, 200, 200, 0.4)' : 'transparent')
					.show();
			}
		}, 
		
		hideModal: function() {
			this.setModal(false);
		},
		
		/**
		 * Create (or destroy) a modal dialog with a default loading message (in this case: "Loading stations..").
		 * @param {boolean} visible - True creates, false removes.
		 * @param {boolean} showBackground - Whether to hve a semi-transparent div over the background (so as to 
		 *    visually signify the modal status). Keep in mind in older browsers that don't support transparency it'll
		 *    just grey out the entire background.
		 */
		setModalAsLoading: function(visible, showBackground) {
			var loadingDialog = $("<div id='loading-dialog'></div>")
				.html("<img src='images/ajax-loader.gif' alt='loading' /> Loading stations..");
			this.setModal(visible, showBackground, loadingDialog);
		}
	};
});
