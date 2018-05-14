<?php require_once("init.php"); ?>
<!DOCTYPE html>
<html>
  <head>
    <title>STEP Compare Stations</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=0.7">
    <?php if($ini["devmode"]) { ?>
    <link rel="stylesheet" href="css/style.css" />
    <?php } else { ?>
    <link rel="stylesheet" href="build/style.css" />
    <?php include("analyticstracking.php"); ?>
    <?php } ?>
    <script>
        var parameters = {
            <?php
                if(!isset($_SESSION)) { session_start(); }
                // list of variables
                require_once("lib/dvcsVars.php");
                $first = true;
                foreach($dvcsVars as $key) {
                    if($first) {
                        $first = false;
                    } else {
                        echo ", ";
                    }
                    echo $key . ":\"" . addslashes($_SESSION[$key]) . "\"";
                }
            ?>
        };
        parameters.barHeight = parseFloat(parameters.barHeight);
        parameters.thresholds = parameters.thresholds ? JSON.parse(parameters.thresholds) : null;
        parameters.colors = parameters.colors ? JSON.parse(parameters.colors) : null;
    </script>
  </head>
  <body style="overflow-x:scroll;overflow-y:hidden;">
    <div id="dv-container">
      <div id="dv-controls-container">
        <div id="dv-title"></div>
        <div id="dv-stations-select-container">Find My Station: </div>
      </div>
      <div id="dv-svg-container">
        <div id="dv-svg-spacer"></div>
      </div>
    </div>
    
    <?php if($ini["devmode"]) { ?>
    <script src="js/lib/require.js" data-main="js/init-dvcs"></script>
    <?php } else { ?>
    <script src="build/require.js"></script>
    <script>require(["build/libs"],function(){require(["../build/dvcs"]);});</script>
    <?php include("analyticstracking.php"); ?>
    <?php } ?>
  </body>
</html>
