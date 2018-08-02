<?php require_once("init.php"); ?>
<!DOCTYPE html>
<html>
  <head>
    <title>STEP Portal</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=0.7">
<?php if($ini["devmode"]) { ?> 
    <link rel="stylesheet" href="css/style.css" />
<?php } else { ?> 
    <link rel="stylesheet" href="build/style.css" />
<?php } ?>
  </head>
  <body>
    <!-- application container -->
    <div id="step-container">
      <!-- the actual OpenLayers map -->
      <div id="map-view"></div>
      <!-- layer/data controls -->
      <div id="controls-container" style="visibility:hidden;">
        <!-- <div id="controls-header">Safe-to-Eat Portal</div> -->
        <!-- search by location controls -->
        <div id="control-tab-location" class="control-tab">Find a Location</div>
        <div id="location-controls" class="controls-group">
          <p>Click one of the symbols on the map or click on the button below.</p>
          <select id="stations-select" data-placeholder="Select a Location.." disabled>
            <option>Loading..</option>
          </select>
        </div>
        <div id="control-tab-query" class="control-tab"><i></i>Customize the Statewide Map</div>
        <div id="query-controls" class="controls-group">
          <!-- filter/query controls -->
          <!-- species -->
          <div id="control-label-species" class="control-label">Select Species: </div>
          <select id="species-control" disabled>
            <option>Loading..</option>
          </select>
          <div class="control-spacer"></div>
          <!-- contaminants -->
          <div id="control-label-contaminant" class="control-label">Select Contaminant: </div>
          <select id="contaminant-control" disabled>
            <option>Loading..</option>
          </select> 
          <div class="control-spacer"></div>
          <!-- thresholds -->
          <div id="control-label-thresholds" class="control-label">Select Contaminant Threshold: </div>
          <select id="thresholds-control" disabled>
            <option>Loading..</option>
          </select>
          <div class="control-spacer"></div>
          <!-- years -->
          <div id="control-label-year-range" class="control-label">Select Year Range:</div>
          <div id="control-year-range-container">
            Loading..
          </div>
          <div class="control-spacer"></div>
          <!-- other controls -->
          <div id="show-no-data-container">
            <input type="checkbox" id="show-no-data-control" disabled />
            Hide stations with no matching results
          </div>
          <div class="control-spacer"></div>
          <div id="reset-controls" class="button control-button">
            Reset To Initial Settings
          </div>
          <div class="control-spacer"></div>
          <div id="download-control" class="button control-button">Download Data</div>
          <!-- location controls -->
          <div class="control-spacer2"></div>
          <div class="control-label">Zoom to County</div>
          <select id="counties-select" data-placeholder="Zoom to County.." disabled>
            <option>Loading..</option>
          </select>
          <div class="control-spacer2"></div>
          <!-- map/layer controls -->
          <div id="map-layer-sub-tab"><i></i> Map/Layer Options</div>
          <div id="map-layer-sub-control" style="display:none;">
            <div style="text-align:center;">
              <div id="zoom-stations-control" class="button control-button">Fit View to Stations</div>
            </div>
            <div class="control-spacer2"></div>
            <div class="control-label-inline">Base Layer:</div>
            <div id="base-layer-control-container"></div>
            <div class="control-spacer"></div>
            <div title='California County Subdivisions' class="control-label-inline">Show CA Counties Layer:</div>
            <input type="checkbox" id="show-counties-control" disabled />
            <div class="control-spacer"></div>
            <div title='Water Board Region Subdivisions' class="control-label-inline">Show CA Water Board Regions:</div>
            <input type="checkbox" id="show-waterboards-control" disabled />
            <div class="control-spacer"></div>
            <div title='Marine Protected Areas in California' class="control-label-inline">Show Marine Protected Areas:</div>
            <input type="checkbox" id="show-mpa-control" disabled />
          </div>
        </div>
        <!-- about -->
        <div id="control-tab-about" class="control-tab"><i></i>About</div>
        <div id="about-controls" class="controls-group">
          <p>The interactive map on this page allows you to explore fish contaminant data for your favorite fishing locations. Data are available from extensive monitoring by the Surface Water Ambient Monitoring Program and from other studies.</p>
          <p>This page was developed and is maintained by a collaboration between the San Francisco Estuary Institute and the Surface Water Ambient Monitoring Program.  The data displayed on this page are also available through the California Environmental Data Exchange Network (CEDEN). </p>
          <!-- <div id="btn-map-instructions" class="btn">Map Instructions</div> -->
          <div id="step-header-logo-container">
            <div class="step-header-logo-link">
              <a href="http://www.waterboards.ca.gov/water_issues/programs/swamp/">
                <img src="images/swamp.gif" class="attribution-logo" alt="SWAMP" /><br />
                SWAMP
              </a>
            </div>
            <div class="step-header-logo-link">
              <a href="http://www.sfei.org">
                <img src="images/SFEI.png" class="attribution-logo" alt="SFEI" /><br />
                SFEI
              </a>
            </div>
            <div class="step-header-logo-link">
              <a href="http://www.ceden.org">
                <img src="images/poweredbyceden.jpg" class="attribution-logo" alt="CEDEN" /><br />
                CEDEN
              </a>
            </div>
          </div>
        </div>
        <!-- more info -->
        <div id="control-tab-more-info" class="control-tab"><i></i>More Information</div>
        <div id="more-info-controls" class="controls-group">
          <ul>
            <li><a href="http://www.mywaterquality.ca.gov/safe_to_eat/thresholds">OEHHA Assessment thresholds</a></li>
            <li><a href="http://www.mywaterquality.ca.gov/monitoring_council/bioaccumulation_oversight_group/">Monitoring programs and reports</a></li>
            <li><a href="http://www.ceden.org/">Access complete datasets from CEDEN</a></li>
          </ul>
        </div>
        <div id="additional-buttons">
        </div>
      </div>
      <!-- notification popup thingamajig -->
      <div id="notification-container">
        <div id="notification-tab">Notifications go here</div>
      </div>
    </div>
    
<?php if($ini["devmode"]) { ?>
    <script src="js/lib/require.js" data-main="js/init"></script>
<?php } else { ?>
    <script src="build/require.js"></script>
    <script>require(["build/libs","build/step-app", "build/sreport"],function(){require(["../build/step"]);});</script>
<?php if(!empty($ini["gakey"])) { ?>
    <script>
      (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
      (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
      m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
      })(window,document,'script','https://www.google-analytics.com/analytics.js','ga');
      ga('create', <?= $ini["gakey"]; ?>, 'auto');
      //ga('send', 'pageview');  // done in init script to handle custom views
    </script>
<?php } ?>
<?php } ?>
  </body>
</html>
