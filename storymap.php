<?php require_once("init.php"); ?>
<!DOCTYPE html>
<html>
  <head>
    <title>STEP Portal</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <?php if($ini["devmode"]) { ?> 
    <link rel="stylesheet" href="css/style.css" />
    <link rel="stylesheet" href="css/storymap.css" />
    <?php } else { ?> 
    <link rel="stylesheet" href="build/style.css" />
    <link rel="stylesheet" href="build/storymap.css" />
    <?php } ?>
  </head>
  <body style="overflow-y:hidden;">
    <div id="storymap-container">
      <div id="narrative"></div>
      <div id="visual"></div>
    </div>
    <div id="storymap-outro" class="flex-column">
      <div class="flex-row">
        <a href="http://www.sfei.org"><img src="images/SFEI.png" alt="SFEI" /></a>
        <a href="http://www.ceden.org/"><img src="images/poweredbyceden.jpg" alt="CEDEN" /></a>
        <a href="http://www.waterboards.ca.gov/water_issues/programs/swamp/"><img src="images/swamp.gif" alt="SWAMP" /></a>
      </div>
      <div style="min-width:30%;margin:auto;margin-top:6px;padding-top:6px;text-align:center;border-top:1px dashed #888;">
        <strong>Photo Credits:</strong><br />Jay Davis, Shira Bezalel
      </div>
    </div>
    <div id="storymap-loading">Loading...</div>
    
    <?php if($ini["devmode"]) { ?> 
    <script src="js/lib/require.js" data-main="js/init-storymap"></script>
    <?php } else { ?> 
    <script src="build/require.js"></script>
    <script>require(["build/libs","build/step-app","build/sreport"],function(){require(["../build/storymap"]);});</script>
    <?php include("analyticstracking.php"); ?> 
    <?php } ?>
  </body>
</html>