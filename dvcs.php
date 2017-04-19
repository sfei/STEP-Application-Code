<?php require_once("init.php"); ?>
<!DOCTYPE html>
<html>
  <head>
    <title>STEP Compare Stations</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=0.7">
    <link rel="stylesheet" href="https://ajax.googleapis.com/ajax/libs/jqueryui/1.11.4/themes/smoothness/jquery-ui.css" />
    <?php if($ini["devmode"]) { ?>
    <link rel="stylesheet" href="css/style.css" />
    <script src="js/lib/require.js" data-main="js/init-dvcs"></script>
    <?php } else { ?>
    <link rel="stylesheet" href="build/style.css" />
    <script src="js/lib/require.js" data-main="build/dvcs"></script>
    <?php } ?>
    <script>
        parameters = {
            width: <?= !empty($_GET["width"]) ? $_GET["width"] : 760; ?>, 
            species: "<?= !empty($_GET["species"]) ? $_GET["species"] : "Largemouth Bass"; ?>", 
            contaminant: "<?= !empty($_GET["contaminant"]) ? $_GET["contaminant"] : "Mercury"; ?>", 
            startYear: "<?= !empty($_GET["startYear"]) ? $_GET["startYear"] : 1900; ?>", 
            endYear: "<?= !empty($_GET["endYear"]) ? $_GET["endYear"] : 9999; ?>"
        };
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
  </body>
</html>
