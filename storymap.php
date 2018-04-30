<?php require_once("init.php"); ?>
<!DOCTYPE html>
<html>
  <head>
    <title>STEP Portal</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=0.7">
    <?php if($ini["devmode"]) { ?>
    <link rel="stylesheet" href="css/style.css" />
    <link rel="stylesheet" href="css/storymap.css" />
    <script src="js/lib/require.js" data-main="js/init-storymap"></script>
    <?php } else { ?>
    <link rel="stylesheet" href="build/style.css" />
    <link rel="stylesheet" href="css/storymap.css" />
    <script src="build/require.js" data-main="build/storymap"></script>
    <?php include("analyticstracking.php"); ?>
    <?php } ?>
  </head>
  <body>
    <div id="step-container">
      <div id="map-view"></div>
    </div>
  </body>
</html>
