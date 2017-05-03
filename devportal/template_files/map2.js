// load the Google Visualization API
google.load("visualization", "1.0", {
    packages: ["corechart"]
});

/* set or initialize some global variables */
var map = [];
var calCtr = new google.maps.LatLng(37.248542255560736, -120.60790624999998);
var mapJustLoaded = 0;
var data = {}; // initialize data JSON variable
var leg = {}; // initialize legend JSON variable
var maxZoom = 10; // define the maximum zoom level when panning to a station
var defaultZoom = 6; // define the default zoom level
var spinner = '<img src="labs_step/icons/spinner.gif" alt="" />';
var includeTrends = true; // toggle the trend plotting on and off -- we don't have all this data right now
var markerDescResize = false; // toggle resizing of marker description window on/off
//var filesURL = "http://eis.sfei.org/BOG_dev/step_dev_patty2/"; 
var filesURL = "./"; //keep all php files in same directory. makes it easy to clone directories and not need to change anything
var countiesGeoserverURL = "http://mapservices.sfei.org/geoserver/ecoatlas/wms/kml?layers=ecoatlas:counties_simplify&mode=download";

// Initialize default query parameters (objects) for the landing page
// qry stores the query parameters that are actually in use.
// qrytmp stores the query parameters that are being updated by user interaction
// once the user submits a new query qry is updated to qrytmp
// initialize them to the same values
var qry = {
    Parameter: 'Mercury',
    StartDate: 2007,
    EndDate: 2014,
    Species: 'Highest',
    StationName: '',
    id: '',
    changeThresh: 0,
    origSpecies: 'Highest'
};
var qrytmp = new cloneObject(qry); // make a clone of the qry parameters to store user interactions
// Pattyf note 06-10-2011: 
// qrytmp and qry objects are parallel universes created when there was a select list in the tab2 that behaved differently from the main UI select list
// Probably should get rid of this parallel universe and all the code for tab2 select lists if Jay agrees to keep new system after testing

function toggleCounty() {
    var isChecked = $('#showcounty').attr('checked');
    if (isChecked) {
        //if it is checked the user wants to see either one or all counties
        if (!countyKml || countyKml.getMap() == null) {
            //if no county poly is displayed then display all
            $('#county').html(''); //reset the county selector so that no specific county name displays
            zoomToCounty('All'); //show on map and zoom to counties
        }
    } else {
        //uncheck and set to null
        $('#county').html(''); //reset the county selector so that no specific county name displays
        countyKml.setMap(null); //remove the county kml layer from the map
        $('#showcounty').attr('checked', false); // uncheck the county checkbox
    }
}

var countyKml;

function zoomToCounty(county) {
   // Important NOTE: the county zoomto functionality is dependend on the geoserver instance on mapservices.sfei.org
   // If anything happens to the layer ecoatlas:counties_simplify on that geoserver instance this functionality will not work
    if (countyKml) {
        //if a county is being displayed on the map remove it
        countyKml.setMap(null);
        $('#showcounty').attr('checked', false); // uncheck the county checkbox
    }
    if (county == 'All') {
        countyKml = new google.maps.KmlLayer({
	    url: countiesGeoserverURL,
            clickable: false,
            preserveViewport: true
        });
        $('#showcounty').attr('checked', true); // check the county checkbox
        map.setCenter(calCtr);
        map.setZoom(defaultZoom);
    } else {
        county = county.replace(/\s+/g, "+"); //replace one or more white spaces with a plus for CQL filter
        countyKml = new google.maps.KmlLayer({
	    url: countiesGeoserverURL + "&CQL_FILTER=name+EQ+'" + county + "'",
            clickable: false
        });
        $('#showcounty').attr('checked', true); // check the county checkbox
    }

    countyKml.setMap(map);
}

function cloneObject(what) {
    // function to clone an object
    for (i in what) {
        this[i] = what[i];
        //alert( this[i] );
    }
}

function openSelectList(obj) {
    // function to open the select-body and update the image in the select-head
    // obj is the select-head that was clicked
    $('.select-body').hide(); // hide any open select-bodies before opening this one
    $('.select-head').removeClass('open'); // remove the open class from others before opening this one
    $(obj).next().show();
    $(obj).addClass('open');
}

function closeSelectList(obj) {
    // function to close the select-body and update the image in the select-head
    // obj is the select-head that was clicked
    $(obj).next().hide();
    $(obj).removeClass('open');
}


function loadQueryResults() {
    //$('#marker-desc').hide(); //Patty added: just in case it is open when we load new results, hide station marker desc tab info box (gmapv3 comment out)
    $('#ddlink').hide(); // hide current download link div

    $('#progress-alert').show();
    $.ajax({
        type: "GET",
        url: filesURL + "loadMap2QueryResults.php",
        cache: false,
        data: qry,
        success: function (returnData) {
            $('#progress-alert').hide();
            // returns three JSON arrays -> data (for markers), leg (for legend), thresh (for threshold selector)
            var myobj = $.parseJSON(returnData);
            data = myobj.data;
            leg = myobj.leg;
            thresh = myobj.thresh;

            // Create download contaminent data link
            // jnm 2011-06-30: Switched highest/lowest to "all"
            var requested_species = (qry.Species == "Highest" || qry.Species == "Lowest") ? "all" : qry.Species;
            ddlinkURL = './step_export.php?aname=' + qry.Parameter + '&syear=' + qry.StartDate + '&eyear=' + qry.EndDate + '&species=' + requested_species;
            ddcontent = '<a href="' + ddlinkURL + '">Download Map Data</a>';
            $('#ddlink').html(ddcontent); // add ddlink to page 
            $('#ddlink').show(); // show current download link div
            fetch_download_size(); // jnm 2011-07-07: Create a clone of the selected options

            renderMarkers(map, data); //(gmapv3)
            initStationSelect();
            initMapLegend();
            $('#threshold-selector-content').html(thresh.html); // add form to threshold-selector div

            // examine the URL to see if a county name is present.  If so, zoom to county
            // on page load. ---> Should set cookie so this only happens on initial page load.
            var county = $(document).getUrlParam('county');
            if (county != null) {
                county = county.replace('%20', ' '); // need to remove special characters
                $('#county-select .select-head #county').html(county);
                zoomToCounty(county);
            }

        },
        error: function (XMLHttpRequest, textStatus, errorThrown) {
            //alert(errorThrown);
            $('#progress-alert').hide();
            alert('This site is experiencing some technical difficulties. Please try again later. (ErrorCode 001)');
        }
    });
}

function bindMarkersToMarkerDesc() {
    // The markers already have a GEvent listener that makes them clickable.
    // But, the info goes into the #marker-foo element (which is hidden).
    // This function adds a listener to the marker that then calls the
    // openMarkerDescTab0 function.
    for (var i = 0; i < pts.length; i++) {
        google.maps.event.addDomListener(pts[i], 'click', function () { //gmapv3 change
            if (qry.origSpecies !== qry.Species) {
                qry.origSpecies = qry.Species;
            }
            if (qrytmp.origSpecies !== qrytmp.Species) {
                qrytmp.origSpecies = qrytmp.Species;
            }
            $('#tab2species').html('');
            openMarkerDescTab0();
        })
    }
}

function openMarkerDescTab0(statName, selectedTab) { //gmapv3 change
    // This function is called by the clickable marker and/or the station select list.
    // It gets marker info from the hidden #marker-foo element, initiates an ajax request
    // to get data for the given location and populates tab0 of the #marker-desc element.
    // Also updates the header of the #marker-desc element to contain the name of the
    // active marker and/or selected station
    
    //qry.StationName  = $('#marker-foo #marker-StationName').html(); //gmapv3 comment out
    //qrytmp.StationName  = $('#marker-foo #marker-StationName').html(); //gmapv3 comment out

    statName = (typeof statName == 'undefined') ? 'Lily Lake' : statName; //debug
    if (qry.origSpecies !== qry.Species) {
        qry.origSpecies = qry.Species;
    }
    if (qrytmp.origSpecies !== qrytmp.Species) {
        qrytmp.origSpecies = qrytmp.Species;
    }

    qry.StationName = statName;
    qrytmp.StationName = statName;

    //$('#marker-desc-name').html( "<p>"+$('#marker-foo #marker-StationName').html()+"</p>" );
    $('#marker-desc-name').html("<p>" + statName + "</p>");
    $('#marker-desc').show().draggable();
    $('#marker-desc-tab0-content').html(spinner);

    // Pattyf note 06-1-2011: parameterized this function so could open tab2
    qry.selectedTab = (typeof selectedTab == 'undefined') ? 0 : selectedTab;

    $.ajax({
        type: "GET",
        url: filesURL + "loadMap2Tab0.php",
        cache: false,
        data: qry,
        success: function (returnData) {
            //eval(returnData); // returns JSON array
            tab0 = $.parseJSON(returnData);

            $('#marker-desc-tab0-content').html(tab0.html);
            //$('#marker-desc-tab0-content').append("<br/><a class='help' href=''>How to interpret this table.</a>");
            resizeMarkerDesc();
            //$('#marker-desc #marker-desc-tabs').tabs('select',0);
            $('#marker-desc #marker-desc-tabs').tabs('select', qry.selectedTab);
            if (!includeTrends) {
                $('#marker-desc #marker-desc-tabs').tabs('option', 'disabled', [1]);
            }
            //$('#summary-table').addClass('tablesorter').tablesorter();

            if ($('#advisory_link').length > 0) {
                $('#advisory_link').remove();
            }

            if (tab0.advisoryHTML != 'Station Name: _Advisory_URL: ') {
                var advisory_parts = tab0.advisoryHTML.split(":")
                var advisory_url = "http:" + advisory_parts[3];
                $('#marker-desc-name').after('<span id="advisory_link" class="warning"><a href="' + advisory_url + '" target="_blank">View Safe Eating Guidelines for this water body.</a></span>');
            } else {
                if (qry.StationName.search(/reservoir|lake/i) >= 0) {
                    //display generic california lake/reservoir advisory
                    $('#marker-desc-name').after('<span id="advisory_link" class="warning"><a href="http://www.oehha.ca.gov/fish/special_reports/advisorylakesres.html" target="_blank">Specific Safe Eating Guidelines for this water body are not available. <br/>View general guidance on safe fish consumption for lakes and reservoirs.</a></span>');
                } else {
                    $('#marker-desc-name').after('<span id="advisory_link"><a href="http://www.oehha.ca.gov/fish/general/broch.html" target="_blank">Specific Safe Eating Guidelines for this water body are not<br />available. View general guidance on safe fish consumption.</a></span>');
                }
            }
        },
        error: function (XMLHttpRequest, textStatus, errorThrown) {
            //alert(errorThrown);
            $('#marker-desc-tab0-content').html('Error Tab0');
            alert('This site is experiencing some technical difficulties. Please try again later. (Error Tab0)');
        }
    });
}

function resizeMarkerDesc() {
    // obj is the marker-desc-tabN-content element where N is the tab number (0-2)
    // make marker-desc window resizable
    if (!markerDescResize) {
        return;
    } else {
        if ($('#marker-desc').hasClass('ui-resizable')) {
            $('#marker-desc').resizable('destroy');
        }
        var h = $('#marker-desc-tabs').innerHeight() + $('#marker-desc .drag-handle').innerHeight();
        $('#marker-desc-tabs').resizable({
            alsoResize: '#marker-desc',
            minWidth: 530,
            minHeight: h
        });
    }
}

function initStationSelect() {
    // create a station select list with all stations
    
    var html = '<ul>';
    for (var i = 0; i < data.length; i++) {
        html += "<li mid=" + data[i].marker_id + ">" + data[i].StationName + "</li>";
    }
    html += "</ul>";
    $('#station-select .select-body').html(html);
    // bind each li to the map marker so that selection activates the marker and shows 
    // the sation information in the marker-desc div
    $('#station-select .select-body li').unbind(); // first unbind anything ... just in case
    $('#station-select .select-body li').each(function () {
        $(this).click(function (e) {
            var obj = $(e.target);
            var mid = $(obj).attr('mid');
            closeSelectList($('#station-select .select-head'));

            map.setCenter(pts[mid].getPosition(), maxZoom); //gmapv3
            //console.log('in funct initstationselect and datamidname is: '+data[mid].name+ ' and data mid it_target is: ' + data[mid].it_target);
            if (data[mid].it_target <= 1) {
                // use the standard google bubble
                openGoogleTeaserWindow(pts[mid], "<b>" + data[mid].name + "</b>");
            } else if (data[mid].it_target == 2) {
                // use the custom div 
                // BUT CANNNOT because not gmapv3 compliant so just use googleTeaserWindow
                //openCustomTeaserWindowHtml(map,pts[mid],"<b>"+data[mid].name+"</b>");
                openGoogleTeaserWindow(pts[mid], "<b>" + data[mid].name + "</b>");
            }
            //gmapv3 changes next lines
            //
            map.setZoom(12);
            map.setCenter(pts[mid].getPosition());
            map.panBy(y = 100, x = 100)
            openMarkerDescTab0(pts[mid].title);
        });
    });
    if (mapJustLoaded === 0) {
        map.setCenter(calCtr);	 //gmapv3 change
        map.setZoom(defaultZoom); //gmapv3 change
        mapJustLoaded = 1;
    }
}


function initMapLegend() {
    // initialize the map legend and make it moveable
    $('#map-legend').html(leg.html);
    var foo = $('#map').offset();
    var y = foo.top + $('#map').height() - $('#map-legend').outerHeight() - 2;
    var x = 10; //$('#map').width() - 1.25*$('#map-legend').width();

    // jeffm 2011-05-24
    // Adjust position of the legend so that it appears on the right side of the map
    //x += 245;
    //y -= 245;
    x += 5; //pattyf 2011-12-22: i changed x and y after changing map div size to same as other state wb portal pages
    //y -= 35;
    y -= 25; //pattyf: gmap v3 tweak to push legend a little lower (closer to bottom of map div)

    $('#map-legend').css('top', y.toString() + 'px').css('left', x.toString() + 'px').show().draggable();
    a = $('#map-legend').css('top', y.toString() + 'px').css('left', x.toString() + 'px').show().draggable();
    //console.log(a);
}

function updateSelectList(obj, selectlist) {
    // obj is the select-head
    // obj.next is the select-body
    $(obj).next().html(selectlist.html);
    $(obj).next().find('li').each(function () {
        $(this).click(function (e) { // make the items clickable
            var result = $(e.target).attr('result'); // get the selected value
            $(obj).html(result); // put selected values in select-head
            closeSelectList(obj); // close the select-body
            // update the query variable
            if ($(obj).parent().attr('id') == 'select-species') {
                qrytmp.Species = result;
            } else if ($(obj).parent().attr('id') == 'select-parameter') {
                qrytmp.Parameter = result;
            } else if ($(obj).parent().attr('id') == 'select-start-date') {
                qrytmp.StartDate = result;
            } else if ($(obj).parent().attr('id') == 'select-end-date') {
                qrytmp.EndDate = result;
            }
        });
    });
}

function initTab1Selectors() {
    // Function to initialize a series of selection boxes within tab1 (the Trends tab).
    var html = "<div id='chart'></div>";
    $('#marker-desc-tab1-content').html(html);
}

function loadTab1(StationQuery, ParameterQuery) {
    // This function gets the data from the server and creates a Trend Chart using
    // the Google Visualization API.  The input parameter (q) is a JSON variable.
    // This function is initialy called when the user clicks on the "Trends" tab (tab 1)
    // of the marker-desc window.  In this case, q is equal to qry, which is the active
    // set of query parameters.  If this function may also be called by a selection box
    // within the marker-desc window.  In this case, q is not equal to qry.  The results
    // in tab1 will thus be different than those on the map.  This is  desired feature so
    // that users can view trends of different contaminants and species at the given
    // location without having to go back to the map and changing the query.
    
    $('#marker-desc-tab1-content #chart').html(spinner);
    
    //console.log("the station for the query is " + StationQuery);
    //console.log("the ParameterQuery for the query is " + ParameterQuery);


    // initiate an ajax call to get the trends data
    $.ajax({
        type: "GET",
        url: filesURL + "loadMap2Tab1.php",
        data: { StationName : StationQuery, Parameter : ParameterQuery },
        cache: false,
        success: function (returnData) {
            //console.log("data is " + returnData);
            tab1 = $.parseJSON(returnData);
            $('#marker-desc-tab1-content #chart').html(''); // removes the spinner
            createTrendPlot(tab1);
        },
        error: function (XMLHttpRequest, textStatus, errorThrown) {
            //alert(errorThrown);
            $('#marker-desc-tab1-content').html('Error Tab1');
            alert('This site is experiencing some technical difficulties. Please try again later. (Error Tab1)');
        }
    });
}

function loadTab2(q) {
    // this is tab2 - the "Compare" tab
    $('#marker-desc-tab2-content').html(spinner);

    //Pattyf 06-10-2011: changed function to set origSpecies for tab2 to keep track of what user
    //selected as species before opening tab2 and maybe changing species to highest/lowest/species therein
    if (q.origSpecies === 'NONE') {
        q.origSpecies = q.Species;
    }

    // initiate an ajax call to get nearby stations
    $.ajax({
        type: "GET",
        url: filesURL + "loadMap2Tab2.php",
        cache: false,
        data: q,
        success: function (returnData) {
            tab2 = $.parseJSON(returnData);
            $('#tab2species').html(tab2.changeSpeciesHTML);

            $('#marker-desc-tab2-content').html(tab2.html);
            $('#marker-desc-tab2 #select-parameter  .select-head').html(q.Parameter);
            if (q.Species == 'Highest') {
                $('#marker-desc-tab2 #select-species .select-head').html('Species With Highest Avg Concentration');
            } else {
                $('#marker-desc-tab2 #select-species .select-head').html(q.Species);
            }
            $('#marker-desc-tab2 #select-start-date  .select-head').html(q.StartDate);
            $('#marker-desc-tab2 #select-end-date  .select-head').html(q.EndDate);
        },
        error: function (XMLHttpRequest, textStatus, errorThrown) {
            //alert(errorThrown);
            $('#marker-desc-tab2-content').html('Error Tab2');
            alert('This site is experiencing some technical difficulties. Please try again later. (Error Tab2)');
        }
    });
}

function updateTab2() {
    //Pattyf 06-11-2-11: I think this func obsolete now using updateTab2b
    // function to update the content of tab 2 based on new user queries
    loadTab2(qrytmp);
    $('.toggle-view').next().hide();
}

function updateTab2b(speciesChange) {
    // function to update the content of tab 2 based on user radio checkbox selections
    // replaces previous method (function updateTab2) based on a second select list in tab2 
    // This func also updates the map, legend, and main select list - pattyf 06-10-2011
    if (speciesChange !== qrytmp.Species) {
        qrytmp.Species = speciesChange;
        qry = qrytmp; //set the current map qry params to qrytmp params - the params changed in the tab2 box

        //update map and legend
        if (qry.Species == 'Highest') {
            $('#select-species .select-head').html('Species With Highest Avg Concentration');
        } else if (qry.Species == 'Lowest') {
            $('#select-species .select-head').html('Species With Lowest Avg Concentration');
        } else {
            $('#select-species .select-head').html(qry.Species);
        }

        $('#select-parameter .select-head').html(qry.Parameter);
        $('#select-start-date .select-head').html(qry.StartDate);
        $('#select-end-date .select-head').html(qry.EndDate);

        //for (var i=0; i<pts.length; i++){ map.removeOverlay(pts[i]); }//gmapv3 change
        for (var i = 0; i < pts.length; i++) {
            pts[i].setMap(null); //map.removeOverlay(pts[i]);  //v3 change
        }

        clearMapVariables();
        $('#threshold-selector').hide();

        loadQueryResults(); //change map to reflect changed query
        openMarkerDescTab0(qry.StationName,2);    //update tab0 - this will force a reload of tab2 when the user clicks on tab2 
        			    
        loadTab2(qrytmp);	   

        $('#marker-desc-tab2 .select-body').show(); 
    }
}


function createTrendPlot(data) {
    // creates a trend plot and places it in #marker-desc-tab1-content #chart element
    // input variable data is a JSON variable
    // console.log("the input data is " data);
    
    var gdata = new google.visualization.DataTable();
    
    //add columns
    var columnNames = [];
    //date Y axis
    gdata.addColumn('number', 'Date');
    
    //column for each commonname
    for (var i = 0; i < data.length; i++) {
        //create column for each distinct commonname
        if (columnNames.indexOf(data[i].commonname) === -1) {
            gdata.addColumn('number', data[i].commonname);
            columnNames.push(data[i].commonname)
            //console.log("Added commonname " + data[i].commonname);
            //add a tooltip for this commonname
            gdata.addColumn({type: 'string', role: 'tooltip', p: {html:true}});

        }
    }
 
    //add the rows - one per result
    gdata.addRows(data.length);

    for (var i = 0; i < data.length; i++) {
       
        //put date in column 0
        gdata.setValue(i, 0, data[i].date);
        
        //loop through the common names and insert result where there's a match
        for (var j = 1; j < (gdata.getNumberOfColumns()); j++) {
            if (gdata.getColumnLabel(j) === data[i].commonname) {
                gdata.setValue(i, j, (data[i].result).toFixed(2));
                //add the tooltip info
                gdata.setValue(i, j+1, ("<ul style='list-style:none; font-size:11px; font-weight:bold; margin-left: -3px; margin-right: 4px;' ><li>Sample: " + data[i].commonname + "<li>Date: " + data[i].date +"</li><li> Result: " + (data[i].result).toFixed(2) + " " + data[i].unit + "</li><li>Sample Type: " + data[i].sampletype + "</li><li> Tissue: " + data[i].tissue + "</li><li> Prepcode: " + data[i].prepcode));

            }
        }
        
    }// close outer for






    var chart = new google.visualization.ScatterChart($('#marker-desc-tab1-content #chart').get(0));
    
    chart.draw(gdata, {
        title: data[0].station,  
        titleTextStyle: {
             fontSize: 15
        },
        legend: {position: 'right'},
        hAxis: {format: '####',  minValue:2000, maxValue:2020 },
        vAxis: {title: data[0].parameter +' '+ data[0].unit},
        width: 560, height: 260,
        chartArea: {width: '55%'},
        tooltip: {isHtml: true, trigger: 'focus', showColorCode: true},
        pointSize: 10,
        dataOpacity: 0.9
    });

}

function showThresholdSelector() {
    // Function to show the popup window for threshold selection
    $('#threshold-selector').show();
}

function updateResultsWithThresholds() {
    // NOTE: THis func uses eval - bad to use eval 
    // TODO: remove eval
    
    //alert("in func updateResultsWithThresholds");
    // first loop through to make sure they are in sequential order
    var ok = true;
    var foo = 0;
    var v0;
    var v1;
    $('input[name="ThresholdType"]').each(function () {
        if ($(this).is(':checked')) {
            if (foo == 0) {
                v0 = $('#thresh' + $(this).val()).val();
                v0 = parseFloat(v0);
            } else {
                v1 = $('#thresh' + $(this).val()).val();
                v1 = parseFloat(v1);
                if (v1 >= v0) {
                    alert('Thresholds must be in descending order. Please change your thresholds and resubmit.');
                    ok = false;
                }
                v0 = v1;
            }
        }
        foo++;
    });
    if (!ok) {
        return;
    } // if the thresholds are not in ascending order then break this function!
    var foo = 0;
    $('input[name="ThresholdType"]').each(function () {
        if ($(this).is(':checked')) {
            eval('qry.usethresh' + $(this).val() + '=1;');
            foo++;
        } else {
            eval('qry.usethresh' + $(this).val() + '=0;');
        }
        var tmp = $('#thresh' + $(this).val()).val();
        eval('qry.thresh' + $(this).val() + '= tmp;');
    });
    if (foo == 0) {
        alert('Must select at least one concentration threshold. Please make your selection and try again.');
    } else {
        //for (var i=0; i<pts.length; i++){ map.removeOverlay(pts[i]); } //gmapv3 change
        for (var i = 0; i < pts.length; i++) {
            pts[i].setMap(null); //gmapv3 change
        }
        $('#map-legend').hide();
        clearMapVariables();
        data = {};
        qry.changeThresh = 1; // change the threshold filtering parameter so that the filter is applied on the php side.
        $('#threshold-selector').hide();
        loadQueryResults();
    }
}

function HomeControl(controlDiv, map) {
/**
 *  HomeControl adds a control to the map to reset the map to the full extent (ctr & zoom level)
 *  of the state
 * */

    var controlUI, controlText;

    controlDiv.style.paddingTop = '10px';
    controlDiv.style.paddingRight = '29px';

    controlUI = document.createElement('DIV'); // Set CSS for the control border
    controlUI.style.cursor = 'pointer';
    controlUI.style.textAlign = 'center';
    controlUI.title = 'Zoom to State View';
    controlDiv.appendChild(controlUI);

    controlText = document.createElement('DIV'); // Set CSS for the control interior
    controlText.innerHTML = '<img src="./icons/ca.gif" height="30px" width="30px">';
    controlUI.appendChild(controlText);

    google.maps.event.addDomListener(controlUI, 'click', function () { // Setup the click event listeners: 
        map.setCenter(calCtr); //forcing zoomlevel change to trigger refreshDynaMaps to address FF misalignment bug
        map.setZoom(defaultZoom);
    });
}

$(document).ready(function () {
    // do some house cleaning to make the landing page
    $('.close-parent').click(function () {
        $(this).parent().parent().hide();
    }); // make the .close-parent div clickable
    $('#marker-desc').hide();
    $('#progress-alert').hide();
    $('#map-legend').hide();
    $('.select-body').hide();
    var pos = $('#map').position();
    var y = pos.top + 0.5 * $('#map').height();
    var x = pos.left + 0.5 * $('#map').width() - 0.5 * $('#progress-alert').width();
    $('#progress-alert').css('top', y.toString() + 'px').css('left', x.toString() + 'px');

    // Marker-Desc Tab2 Toggle --
    /*
      $('.toggle-view').click(function(){ 
	 $(this).next().toggle();
	 $('#marker-desc-tab2 .select-body').show();  // fixes weird IE8 bug
	 $('#marker-desc-tab2 .select-body').hide();  // fixes weird IE8 bug
      }).next().hide();
        */

    // Initialize the Google Map 
    // PLF: Updated to gmapv3 code
    map = new google.maps.Map(
        document.getElementById('map'), {
            center: calCtr,
            zoom: defaultZoom,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            streetViewControl: false,
            scaleControl: true,
            scaleControlOptions: {
                position: google.maps.ControlPosition.LEFT_BOTTOM
            }, //scalebar position NOT WORKING??
            styles: [{
                featureType: "poi",
                elementType: "labels",
                stylers: [{
                    visibility: "off"
                }]
            }], //turn off gmapv3 default infowindows
            mapTypeControlOptions: {
                style: google.maps.MapTypeControlStyle.DROPDOWN_MENU,
                position: google.maps.ControlPosition.TOP_RIGHT
            },
            panControlOptions: {
                style: google.maps.ZoomControlStyle.SMALL,
                position: google.maps.ControlPosition.RIGHT_TOP
            },
            //position: google.maps.ControlPosition.LEFT_TOP},
            zoomControlOptions: {
                style: google.maps.ZoomControlStyle.SMALL,
                position: google.maps.ControlPosition.RIGHT_TOP
            }
            //position: google.maps.ControlPosition.LEFT_TOP}
        });

    /**
     * Add home control to return view to full state
     */
    homeControlDiv = document.createElement('DIV');
    homeControl = new HomeControl(homeControlDiv, map);
    homeControlDiv.index = 3;
    map.controls[google.maps.ControlPosition.RIGHT_TOP].push(homeControlDiv);
    //map.controls[google.maps.ControlPosition.LEFT_TOP].push(homeControlDiv);  

    /**
     * Drag Zoom control
     * See ref: http://google-maps-utility-library-v3.googlecode.com/svn/trunk/keydragzoom/docs/reference.html
     * In order to make this load you must include the js file and the icon in the directory referenced below.
     */
    map.enableKeyDragZoom({
        visualEnabled: true,
        visualPosition: google.maps.ControlPosition.LEFT, //these are good but absolute position
        //visualPosition: google.maps.ControlPosition.LEFT_TOP,       //these are good but absolute position
        visualPositionOffset: new google.maps.Size(391, 220), //these are good but absolute position
        //visualPositionIndex:-1,
        visualSprite: "./icons/dragzoom_btn3.png",
        visualSize: new google.maps.Size(30, 30),
        visualTips: {
            off: "Drag Zoom In",
            on: "Turn Off"
        }
    });


    // Add county overlay - updated for gmapv3
    $('#showcounty').attr('checked', false); // check the input box?

    // make the select-heads clickable and bind an ajax call
    $('.select-head.ajax').each(function () {
        $(this).click(function (e) {
            var obj = $(this); // obj is the select-head
            if ($(this).next().is(':hidden')) {
                openSelectList(obj);
                $(obj).next().html(spinner);
                qrytmp.id = $(obj).parent().attr('id');
                $.ajax({
                    type: "GET",
                    url: filesURL + "loadMap2SelectList.php",
                    cache: false,
                    data: qrytmp,
                    success: function (returnData) {
                        selectlist = $.parseJSON(returnData);
                        updateSelectList(obj, selectlist);
                    },
                    error: function (XMLHttpRequest, textStatus, errorThrown) {
                        //alert(errorThrown);
                        alert('This site is experiencing some technical difficulties. Please try again later. (Error SelectList)');
                    }
                });
            } else {
                closeSelectList(obj);
            }
        });
    });

    // make the station-select and county-select select-head clickable
    $('#station-select .select-head, #county-select .select-head').click(function () {
        if ($(this).next().is(':hidden')) {
            openSelectList($(this));
        } else {
            closeSelectList($(this));
        }
    });

    // bind a click function to the county-select list
    $('#county-select .select-body li').each(function () {
        $(this).click(function (e) {
            var obj = $(e.target);
            var county = $(obj).attr('name');
            $('#county-select .select-head #county').html(county);
            closeSelectList($('#county-select .select-head'));
            zoomToCounty(county);
            //menuCountySelect(county);
            //if ( $('#showcounty').attr('checked') ) { menuCountySelect(county); }
        });
    });

    // bind a click function to the marker-desc close-info-window button
    $('#marker-desc #marker-desc-close').click(function () {
        $('#marker-desc').hide();
        $('#marker-desc-tab-selectors').hide();

        //map.closeInfoWindow();//commnent out not gmapv3 compatible
        qrytmp = new cloneObject(qry); // reset the temporary query variable in case it was changed within
        // the marker-desc window
    });

    // activate the marker-desc tabs
    $('#marker-desc #marker-desc-tabs').tabs();


    // bind a click function to the main submit button
    $('#main-select-submit').click(function () {
        for (var i = 0; i < pts.length; i++) {
            //map.removeOverlay(pts[i]); 
            pts[i].setMap(null); //gmapv3 change
        }
        $('#map-legend').hide();
        $('#tab2species').html('');
        clearMapVariables();
        data = {};
        qrytmp.origSpecies = qrytmp.Species;
        qry = new cloneObject(qrytmp); // update the query parameters based on user selections
        qry.changeThresh = 0; // change the threshold filtering parameter so that the filter is not applied on the php side.
        loadQueryResults();
    });


    // Bind clickable events to the marker-desc tabs.
    // Tab 0 is automatically loaded, but need to activate tabs 1 and 2
    $('#marker-desc-tabs').bind('tabsselect', function (evt, ui) {
        // ui.index is a zero-based index into the tabs
        // use it to determine which event was fired
        if (ui.index == 1) {
            initTab1Selectors();
            loadTab1(qry.StationName, qry.Parameter);
        } else if (ui.index == 2) {
            loadTab2(qry);
        }
    });

    // add default query parameters to the selectors
    if (qry.Species == 'Highest') {
        $('#select-species .select-head').html('Species With Highest Avg Concentration');
    } else {
        $('#select-species .select-head').html(qry.Species);
    }
    $('#select-parameter .select-head').html(qry.Parameter);
    $('#select-start-date .select-head').html(qry.StartDate);
    $('#select-end-date .select-head').html(qry.EndDate);

    // load the default data
    loadQueryResults();

    // jnm 2011-06-29 - Create the modal data download confirmation dialog
    $('#ddlink a').live('click', function (e) {
        // Scroll to the top of the page
        window.scrollTo(0, 0);

        // Override the click
        e.preventDefault();

        // Display the box
        $('#modal-overlay').css('display', 'block');

    });

    // Wire the Cancel button so that it hides the overlay and tooltip
    $('#hide-overlay').live('click', function () {
        $('.tipsylink').blur();
        $('#modal-overlay').css('display', 'none');
    });

    // Wire the overlay so that it triggers the tooltip
    $('#modal-overlay').hover(function () {
        $('.tipsylink').tipsy({
            gravity: 'w',
            fade: true
        });
        if ($('.tipsy').length == 0) {
            $('.tipsylink').click();
        }
    });

    $('#select-container ul li').live('click', function () {
        // Because IE wants to be different and position things according to its own definition of two-dimensional space, we have to do a browser check:
        if ($.browser.msie) {
            $('#ddlink').after('<div class="tipsy tipsy-north" id="gobuttonnote" style="position: absolute !important; margin: 25px 0 0 -146px !important; display: none; padding-bottom: 2px !important; float: left; width: 115px;"><div class="tipsy-inner">Click the Go button to refresh the map.</div></div>');
        } else {
            $('#ddlink').after('<div class="tipsy tipsy-north" id="gobuttonnote" style="position: absolute !important; margin: 6px 0 0 -38px !important; display: none; padding-bottom: 2px !important; float: left; width: 105px;"><div class="tipsy-inner">Click the Go button to refresh the map.</div></div>');
        }
        $('#gobuttonnote').fadeIn("slow");
    });

    $('#main-select-submit').live('click', function () {
        $('#gobuttonnote').remove();
    });

    $('#final_download').live('click', function () {
        $('.tipsylink').blur();
        $('#modal-overlay').css('display', 'none');
    });

    map.setCenter(calCtr); //gmapv3 change
    map.setZoom(defaultZoom);
});

function fetch_download_size() {
    // Grab the download URL
    var target_url = $('#ddlink a').attr('href');

    // Get the total rows requested and the estimated download size
    var url_parts = target_url.split("?");
    var count = 0;
    var estimated_size = 0;
    $.ajax({
        type: "GET",
        url: "step_export_count.php",
        data: url_parts[1],
        success: function (data) {
            estimated_size = parseInt(data);
            estimated_size = estimated_size.toFixed(1);
            clone_selection_box(target_url, estimated_size)
        },
        error: function (xhr, ajaxOptions, thrownError) {
            alert(xhr.statusText);
        }
    });
}

function clone_selection_box(target_url, estimated_size) {
    // Create a copy of the data form
    var container_clone = $('#select-container').clone();
    $(container_clone).addClass("container-clone");

    // Draw a proper container for the modal box
    $(container_clone).css('padding', '15px 15px 10px');
    $(container_clone).css('margin', '-45% auto 0');

    // Remove the existing Go/Reset buttons
    $(container_clone).find('#main-select-submit').remove();
    $(container_clone).find('.select-submit').remove();

    // Remove extra line breaks
    $(container_clone).find('br+br').remove();

    // Remove the download link
    $(container_clone).find('#ddlink').remove();

    // Set the background color of the .ajax boxes
    $(container_clone).find('.ajax').css('background', '#E7E9EC');

    // Get value of selected species box
    var selected_species = $(container_clone).find('#select-species .select-head').html();
    if (selected_species == "Species With Highest Avg Concentration" || selected_species == "Species With Lowest Avg Concentration" || selected_species == "Lowest") {
        $(container_clone).find('#select-species .select-head').html("All species");
        $(container_clone).find('#select-species .select-head').attr("title", "NOTE: Downloads of the highest species at each location or the lowest species at each location are not available at this time.  If these options are selected a download of the data for all species will be provided.");
        $(container_clone).find('#select-species .select-head').addClass("tipsylink");
    }

    // Rewrite the labels
    $(container_clone).find('#select-species p').html('Species:');
    $(container_clone).find('#select-parameter p').html('Contaminant:');
    $(container_clone).find('#select-start-date p').html('Start Date:');
    $(container_clone).find('#select-end-date p').html('End Date:');

    // Rewrite the contents
    var contents = $(container_clone).html();
    contents = '<h2 style="margin-top: 0; padding-bottom: 10px; border-bottom: 1px solid #CCD4DF; font-size: 1.3em; text-align: center;">Confirm Your Download Options</h2>' + contents;
    if (estimated_size >= 5) {
        contents = contents + '<div style="margin-bottom: 5px; border: 1px solid #efde5a; background-color: #fffce5; padding: 10px;">';
        contents = contents + '<p style="padding-top: 1px; margin: 0; background: transparent url(icons/error.png) top left no-repeat; padding-left: 25px;">This file is approximately ' + estimated_size + ' MBs.</p></div>';
    }
    contents = contents + '<br /><div style="text-align: right;"><span class="select-submit"><a href="#" id="hide-overlay">Cancel</a></span> <span class="select-submit"><a href="' + target_url + '" id="final_download">Download</a></span></div><br />';
    $(container_clone).html(contents);

    // Insert the modal box into the hidden overlay
    $('#modal-overlay').html(container_clone);

}
