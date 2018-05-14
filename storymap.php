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
    <div id="storymap-intro" class="sm-page">
      <h2 style="text-align:center;margin-top:25%">Contaminants in California Sport Fish</h2>
    </div>
    <div id="storymap-container">
      <div id="narrative"></div>
      <div id="visual"></div>
    </div>
    <div id="storymap-outro" class="sm-page" style="height:300px;">
      <h2 style="text-align:center;margin-top:100px;">Storymap Credits</h2>
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
