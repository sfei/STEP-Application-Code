/* Functions for creating SFEI's RMP/FMP STEP online maps */
/* Updated for googlemaps v3 */

var pts = []; // Global array of markers with a bad name
var mapBounds = new google.maps.LatLngBounds(); // stores the lat/lon bounds of the data markers

function showMarkersOnMap(markersArray) {
    if (markersArray) {
        for (i in markersArray) {
            markersArray[i].setMap(map);
        }
    }
}

function removeMarkersFromMap(markersArray) {
    if (markersArray) {
        for (i in markersArray) {
            markersArray[i].setMap(null);
        }
    }
}

//var globMarker, globPt; //debug global vars
var marker_count = 0;
function Marker(map, m) {
    /* Function UPDATED FOR google maps v3 - gmapv3 */
    /* m parameter is the marker data for one marker */

    //globPt = m; // for debugging
    marker_count = 0;

    //set up icon objects used by markers
    var myMarkerImage;

    var defaultIcon = {
        path: "./labs_step/icons/",
        shape: 'blankcircle',
        color: 'ff0000',
        scale: 1,
        width: 13,
        height: 13,
        clickShape: {
            coord: [0, 0, 14, 14],
            type: 'rect'
        }
    };

    if (m.WaterType && m.WaterType == 'coast') {
        defaultIcon.shape = 'blanktriangle';
        defaultIcon.width = 16;
        defaultIcon.height = 16;
        defaultIcon.clickShape.coord = [0, 0, 16, 16];
    }
    if (m.WaterType && m.WaterType == 'river_stream') {
        defaultIcon.shape = 'blankdiamond';
        defaultIcon.width = 16;
        defaultIcon.height = 16;
        defaultIcon.clickShape.coord = [0, 0, 16, 16];
    }

    if (m.color) {
        defaultIcon.color = m.color;
    }

    var icon_size_suffix = defaultIcon.width + "x" + defaultIcon.height;
   // NOTE: the filesystem directories containing the  marker icon images have the following naming convention
   // shapeNxN where shape is the shape (blankcircle, blanktriangle, and blankdiamond) and N is the pixel size
   // We have similarly named directories (circle, diamond, etc) but these are not currently used by STEP
    myMarkerImage = {
        url: defaultIcon.path + defaultIcon.shape + icon_size_suffix + "/" + defaultIcon.color + "_" + icon_size_suffix + ".png",
        size: new google.maps.Size(defaultIcon.width, defaultIcon.height),
        origin: new google.maps.Point(0, 0), //(0,0),
        anchor: new google.maps.Point(defaultIcon.width / 2, defaultIcon.height / 2)
    }

    marker_count += 1; //pattyf - not sure what this is used for or if it is needed with gmapv3 given zIndex above

    var myMarker = new google.maps.Marker({
        position: new google.maps.LatLng(m['lat'], m['lon']),
        map: map,
        optimized: true, //set to false for prettier markers set to true for speed
        icon: myMarkerImage, //foreground marker image or shape
        shape: defaultIcon.clickShape, //imagemap region responsive to mouse click hover or drag //m['icon']? m['icon'] : defaultShape,
        title: m['name'].replace(/&nbsp;/, " "), //replace html code for space with a space //code to display on hover
        zIndex: m['marker_id'],
        marker_id: m['marker_id']
    });

    //globMarker = myMarker; //debug


    /*  Add infowindow for marker    */
    var iw_html = '';
    if (m['name']) {
        if (m['url'] && m['url'] != null) {
            iw_html = iw_html + '<b><a target="' + marker_link_target + '" href="' + m['url'] + '" title="' + m.url + '">' + m['name'] + '</a></b>';
        } else {
            iw_html = iw_html + '<b>' + m['name'] + '</b>';
        }
        var iw_name = iw_html;
    } else {
        iw_html = "no name";
    }

    if (m['desc']) {
        iw_html = iw_html + '<div>' + m['desc'] + '</div>';
    } else {
        iw_html = iw_html + " and no desc";
    }

    var window_width = 0;
    var mytmpdiv = document.getElementById('map');
    var absolute_max_width = mytmpdiv.style.width - 100;
    var marker_window_width = parseFloat(m['window_width']);
    var global_window_width = 0;
    if (marker_window_width > 0 && marker_window_width < absolute_max_width) {
        window_width = marker_window_width;
    } else if (global_window_width > 0 && global_window_width < absolute_max_width) {
        window_width = global_window_width;
    }

    if (window_width > 0 && window_width < 200) {
        window_width = 200;
    } // apparently you can't make it less than 217 (let's leave 17 for the close box though)
    var width_style = (window_width > 0) ? 'width:' + window_width + 'px;' : '';
    var info_html = '<DIV style="text-align:left; ' + width_style + '" class="map_bubble">' + iw_html + '</DIV>';


    // If there is content in the info_window, make it clickable and optionally hoverable (ie. mouseover)
    if (iw_html) {
        google.maps.event.addDomListener(myMarker, 'click', function () {
            openMarkerDescTab0(m['name'], 0);
        });
    } else {
        console.log("no iw_html");

    }

    return myMarker;
}

function renderMarkers(map, data) {
    //updated for gmapv3
    // this is the entry function to this library
    //  map = google.maps.Map object
    // data = JSON variable with the following:
    //	    lon,lat = longitude and latitude of point
    //	    name    = string (or html) containing the name of the point
    //	    desc    = html containing description or contents of the point
    //	    color   = HEX (HTML) color code
    //	    scale   = size of the icon
    //	    icon  = icon shape (blankcircle, triangle, square, circle)
    //	    opacity = desired opacity of the marker
    //	    iw_target = optional, id of the target div for the info window
    //	    it_target = optional, determines if a marker teaser window will be activated.
    //		     teaser will show marker name only.
    //		     Argument options:	  0 = no teaser (default),
    //				    1 = teaser in standard google bubble
    //				    2 = teaser in custom div (id = marker-teaser-window)

    for (var i = 0; i < data.length; i++) {
        if (data[i]['lat'] > -90 && data[i]['lat'] < 90 && data[i]['lon'] > -180 && data[i]['lon']) {
            if (!data[i].it_target) {
                data[i].it_target = 0; // set the default teaser window behavior
            }
            pts.push(Marker(map, data[i]));
            mapBounds.extend(new google.maps.LatLng(data[i]['lat'], data[i]['lon']));
        }
    }
    try {
        //gmapv3 stuff
        showMarkersOnMap(pts);
    } catch (error) {
        alert("problem adding markers to map");
    }
    map.fitBounds(mapBounds); //set the map extent and zoom level based on the data - gmapv3
    if (map.getZoom() > 8) {
        //dont zoom in so close that we loose context
        map.setZoom(8);
    }
    if (map.getZoom() < defaultZoom) {
        //dont zoom too far out
        map.setZoom(defaultZoom);
    }
}

function zoomToData() {
    //updated for gmapv3
    map.fitBounds(mapBounds);
    if (typeof (defaultZoom) == 'number') {
        map.setZoom(defaultZoom);
    }
}

function clearMapVariables() {
    // quick function to clear map variables
    // useful for when points on the map are to be replaced
    // by new data (after a new query for example)
    pts = [];
    mapBounds = new google.maps.LatLngBounds();
}

/* PATTYF - commenting all this out because i do not think it is used
Setup_Global_Variables(); 
function Setup_Global_Variables() {

   // Define parameters of different marker types
   if (!self.icons) { icons = new Array(); }

      // ss = shadow size, is = icon size,ia = icon anchor,iwa = info window anchor,isa = infoshadow anchor,im= image map
   icons['blankcircle'] = { is:[64,64],ia:[31,31],ss:[70,70],iwa:[55,8],isa:[31,63], im:[19,3, 44,3, 60,19, 60,44, 44,60, 19,60, 3,44, 3,19, 19,3],letters:false };
   icons['blanktriangle'] = { is:[64,64],ia:[31,31],ss:[70,70],iwa:[55,8],isa:[31,63], im:[19,3, 44,3, 60,19, 60,44, 44,60, 19,60, 3,44, 3,19, 19,3],letters:false };
   icons['blankdiamond'] = { is:[64,64],ia:[31,31],ss:[70,70],iwa:[55,8],isa:[31,63], im:[19,3, 44,3, 60,19, 60,44, 44,60, 19,60, 3,44, 3,19, 19,3],letters:false };
   icons['triangle'] = { is:[13,13],ia:[6,6],ss:[15,15],iwa:[11,3],isa:[6,10],im:[0,11,6,0,12,11,0,11],letters:false };
   icons['circle'] = { is:[11,11],ia:[5,5],ss:[13,13],iwa:[10,2],isa:[5,9], im:[0,0, 10,0, 10,10, 0,10, 0,0],letters:true };
   icons['pin'] = { is:[15,26],ia:[7,25],ss:[30,26],iwa:[7,1],isa:[12,16],
	      im:[5,25, 5,15, 2,13, 1,12, 0,10, 0,5, 1,2, 2,1, 4,0, 10,0, 12,1, 13,2, 14,4, 14,10, 13,12, 12,13, 9,15, 9,25, 5,25 ],
	      letters:true };
   icons['square'] = { is:[11,11],ia:[5,5],ss:[13,13],iwa:[10,2],isa:[5,9],im:[0,0, 10,0, 10,10, 0,10, 0,0],letters:true };
   icons['diamond'] = { is:[13,13],ia:[6,6],ss:[13,13],iwa:[11,3],isa:[6,10],im:[6,0, 12,6, 6,12, 0,6, 6,0],letters:false };

   icons['airport'] = { is:[17,17],ia:[8,8],ss:[19,19],iwa:[13,3],isa:[13,17],
		  im:[6,0, 10,0, 16,6, 16,10, 10,16, 6,16, 0,10, 0,6, 6,0],letters:false };
   icons['google'] = { is:[20,34],ia:[9,33],ss:[37,34],iwa:[9,2],isa:[18,25],
	       im:[8,33, 8,23, 1,13, 1,6, 6,1, 13,1, 18,6, 18,13, 11,23, 11,33],letters:true };
   icons['googleblank'] = { is:[20,34],ia:[9,33],ss:[37,34],iwa:[9,2],isa:[18,25],
	       im:[8,33, 8,23, 1,13, 1,6, 6,1, 13,1, 18,6, 18,13, 11,23, 11,33],letters:true };
   icons['googlemini'] = { is:[12,20],ia:[6,20],ss:[22,20],iwa:[5,1],isa:[10,15],
	       im:[4,19, 4,14, 0,7, 0,3, 4,0, 7,0, 11,3, 11,7, 7,14, 7,19, 4,19],letters:true };
   icons['camera'] = { is:[17,13],ia:[8,6],ss:[19,15],iwa:[13,3],isa:[13,10],
	       im:[1,3, 6,1, 10,1, 15,3, 15,11, 1,11, 1,3],letters:false };
   icons['tickmark'] = { is:[13,13],ia:[6,6],ss:[],iwa:[11,3],isa:[],im:[6,0, 12,6, 6,12, 0,6, 6,0],letters:false };
   
   // Make sure defaults have been set
   if (!self.marker_icon) { marker_icon = 'blankcircle'; } 
   if (!self.marker_color) { marker_color = 'ff0000'; } 
   marker_icon_size = marker_icon_trans = marker_icon_imagemap = null;
   if (!self.marker_link_target) { marker_link_target = '_blank'; } 
   if (!self.icon_directory) { icon_directory = './labs_step/icons/'; }
   
   // Create a default icon for all markers
   var default_icon_image = icon_directory+marker_icon+'/'+marker_color+'.png';
   defaultIcon = new google.maps.MarkerImage(default_icon_image);
   if (!icons[marker_icon]) { marker_icon = 'pin'; }
   //defaultIcon.image = icon_directory+marker_icon+'/'+marker_color+'.png';
   defaultIcon.transparent = icon_directory+marker_icon+'/'+marker_color+'-t.png';
   defaultIcon.size = new google.maps.Size(icons[marker_icon]['is'][0],icons[marker_icon]['is'][1]);
   defaultIcon.anchor = new google.maps.Point(icons[marker_icon]['ia'][0],icons[marker_icon]['ia'][1]);
   defaultIcon.shadow = (icons[marker_icon]['ss'] && icons[marker_icon]['ss'][0]) ? icon_directory+marker_icon+'/shadow.png' : null;
   defaultIcon.shadowSize = (icons[marker_icon]['ss'] && icons[marker_icon]['ss'][0]) ? new google.maps.Size(icons[marker_icon]['ss'][0],icons[marker_icon]['ss'][1]) : null;
   defaultIcon.infoWindowAnchor = new google.maps.Point(icons[marker_icon]['iwa'][0],icons[marker_icon]['iwa'][1]);
   defaultIcon.infoShadowAnchor = new google.maps.Point(icons[marker_icon]['isa'][0],icons[marker_icon]['isa'][1]);
   defaultIcon.imageMap = (icons[marker_icon]['im']) ? icons[marker_icon]['im'] : 
	       [ 0,0, 0,icons[marker_icon]['is'][1]-1, icons[marker_icon]['is'][0]-1,icons[marker_icon]['is'][1]-1, 
	         icons[marker_icon]['is'][0]-1,0, 0,0 ];
}
*/


Init_Styles();

function Init_Styles() { // Initialize some CSS styles
    document.writeln('            <style type="text/css" media="print">'); // force stuff to print even though Google thinks it shouldn't
    document.writeln('                  img[src$="transparent.png"].gmnoprint { display:none; }');
    document.writeln('                  img[src$="shadow.png"].gmnoprint { display:none; }');
    document.writeln('                  img[src$="crosshair.gif"].gmnoprint { display:none; }');
    document.writeln('            </style>');
}

//-------------------------------------------------------------------------------  
//-------------------------------------------------------------------------------  
function openGoogleTeaserWindow(marker, html, opt) {
    // create a marker teaser window in the standard google bubble
    // marker.openInfoWindowHtml(html,opt);
    console.log("open info window");
}

function closeGoogleTeaserWindow(marker) {
    //marker.closeInfoWindow();
    console.log("close info window");
}

function openCustomTeaserWindowHtml(map, marker, html) {
    console.log("in openCustomTeaserWindowHTML");
    // JORAM, 5.12.09
    // Function to create custom teaser window on Google Map
    // The info window can be styled by CSS --> id = marker-teaser-window
    // Requires jQuery core library.
    // PLF 12.10.2013
    // Updated for gmapv3 but not sure if this is even used (still very ugly code)
    if ($('#marker-teaser-window').length == 0) {
        // element does not exist, create it, hide it
        //var map_pane = $('#marker-teaser-window').getPanes().mapPane; //v2 code
        var map_pane = map.getPanes().mapPane;
        $(map_pane).append("<div id='marker-teaser-window'></div>");
        $('#marker-teaser-window').hide();
    }
    // find the position
    //var pos = map.fromLatLngToDivPixel(marker.getPoint());
    //gmapv3
    var pos = marker.anchorPoint;
    $('#marker-teaser-window').css('position', 'absolute') //.css('z-index',999)
    .css('white-space', 'nowrap').html(html);
    // account for info window height when setting position
    pos.y = pos.y - 1.1 * $('#marker-teaser-window').outerHeight();
    // get the center of the current map.  adjust the position of the info window accrdingly
    var ctr = map.getCenter();
    //var mkr = marker.getPoint();
    //var mkr = marker.getPosition(); //gmapv3
    var mkr = marker.anchorPoint;
    var pl = $('#marker-teaser-window').css('padding-left'); // account for padding
    var pr = $('#marker-teaser-window').css('padding-right'); // account for padding
    pl = pl.replace(/px/, '');
    pr = pr.replace(/px/, '');
    if (mkr.lng() > ctr.lng()) {
        pos.x = pos.x - $('#marker-teaser-window').width() - pr - pl;
    }
    // convert to string with units (px)
    var x = pos.x.toString() + 'px';
    var y = pos.y.toString() + 'px';
    $('#marker-teaser-window').css('top', y).css('left', x).show()
        .click(function () {
            closeCustomTeaserWindowHtml();
        });
}

function closeCustomTeaserWindowHtml() {
    $('#marker-teaser-window').hide();
}

function openCustomInfoWindowHtml(map, marker, html, iw_target) {
    console.log("in opencustominfowindow");
    // JORAM, 5.12.09
    // Function to create custom info window on Google Map
    // The info window can be styled by CSS --> for example, id = marker-info-window
    // If iw_target = 'marker-info-window' the info window is placed on the map by the marker.
    // Otherwise, the info will be placed in the iw_target element. (iw_target is the target div id)
    // Requires jQuery core library.
    if (!iw_target) {
        iw_target = 'marker-info-window';
    } // this won't happen since iw_target is required
    // by the calling function in order to reach this
    // point.  But include the test to catch errors 
    // just in case. Sometimes occurs if called from
    // outside this MarkerFunction package.
    // modify the html
    html = "<div id='" + iw_target + "-close-info-window' class='close-info-window' title='Close'>X</div>" + html;
    /*
   if ( $('#'+iw_target).length == 0 ) {
      // element does not exist, create it, hide it
      //var map_pane = map.getPane(G_MAP_FLOAT_PANE);
      //var map_pane = $('#'+iw_target).getPanes().mapPane; //v3 change
      var map_pane = this.getPanes().mapPane; //v3 change
      $(map_pane).append("<div id='" + iw_target + "'></div>");	     

      $('#'+iw_target).hide();
   }
*/
    if (iw_target == 'marker-info-window') {
        // Default behavior, put the info window on the map next to the marker
        $('#marker-teaser-window').hide('slow'); // hide the teaser so both are not open
        // find the position
        //var pos = map.fromLatLngToDivPixel(marker.getPoint());
        //gmapv3
        //var proj = map.getProjection();
        //var pos = proj.fromLatLngToDivPixel(marker.getPosition());
        var pos = marker.anchorPoint;
        $('#' + iw_target).css('position', 'absolute') //.css('z-index',998)
        .css('white-space', 'nowrap').html(html);
        // account for info window height when setting position
        pos.y = pos.y - 1.1 * $('#' + iw_target).height();
        var x = pos.x.toString() + 'px';
        var y = pos.y.toString() + 'px';
        $('#' + iw_target).css('top', y).css('left', x).slideDown();
    } else {
        $('#' + iw_target).html(html).slideDown(); // include show (slideDown) just in case ...
    }

    $('#' + iw_target + '-close-info-window').click(function () {
        $('#' + iw_target).slideUp(); // bind a clickable close object
        //map.closeInfoWindow();
        console.log("close the info window");
    });
}

function closeCustomInfoWindowHtml() {
    $('#marker-info-window').slideUp();
}


function Marker_List_Item(m) {
    var icon_scaling = 'width="' + m.width + '" height="' + m.height + '"';
    var icon = '<img ' + icon_scaling + ' src="' + m.image + '" alt="img"/>';
    var top_pad = (m.height / 2 - 5); // determine top padding to center text vertically
    if (top_pad < 0) {
        top_pad = 1;
    }
    //var html = '<div style="white-space:nowrap; width: 400px; overflow: auto;"><div class="mylist_icon">' + icon +'</div><div class="mylist_text" style="padding-top:' + top_pad + 'px;">' + m.name + '</div></div>';
    var html = '<tr style="vertical-align: middle; border-bottom: 1px solid #CCCCCC;"><td class="mylist_icon">' + icon + '</td><td class="mylist_text">' + m.name + '</td></tr>';

    return (html);
}

function orderMarkers(marker, b) {
    console.log("in function order markers but not yet implemented inv3");
    return 1;
}

function orderMarkersV2(marker, b) {
    // Controls the order in which markers are layered.
    // The data are sorted by result in descending order by the SQL query.  A myZindex variable is
    // populated that indicates the sorting order.  This variable is here used to
    // ensure that high results values are layered below low results values.                  
    var tmp = 1;

    try {
        var tmp = google.maps.Overlay.getZIndex(marker.getPosition().lat()) + marker.myZindex * 1000000; //gmapv3
    } catch (error) {
        //alert("orderMarkers Error: " + tmp);
        tmp = 1;
    }

    return tmp;
}

