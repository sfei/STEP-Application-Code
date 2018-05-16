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
    <div id="storymap-intro" class="sm-page flex-column">
      <h2 style="text-align:center;">Contaminants in California Sport Fish</h2>
    </div>
    <div id="storymap-container">
      <div id="narrative"></div>
      <div id="visual"></div>
    </div>
    <div id="storymap-outro" class="flex-column">
      <div class="flex-row">
        <img src="images/SFEI.png" alt="SFEI" />
        <img src="images/poweredbyceden.jpg" alt="CEDEN" />
        <img src="images/swamp.gif" alt="SWAMP" />
      </div>
      <div style="margin:auto;padding-top:12px;text-align:center;">
        <strong>Photo Credits:</strong><br />
        Jay Davis, Shira Bezalel
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
