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
  <body style="overflow-y:hidden;">
    <div id="storymap-intro" class="sm-page">
      <h2 style="text-align:center;margin-top:30%">Storymap Splash</h2>
    </div>
    <div id="storymap-container">
      <div id="narrative"></div>
      <div id="visual"></div>
    </div>
    <div id="storymap-outro" class="sm-page" style="height:300px;">
      <h2 style="text-align:center;margin-top:100px;">Storymap Credits</h2>
    </div>
    <div id="storymap-loading">Loading...</div>
  </body>
</html>
