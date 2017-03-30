<!DOCTYPE html>
<html>
  <head>
    <title>STEP Data Visualization Test</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=0.7">
    <link rel="stylesheet" href="https://ajax.googleapis.com/ajax/libs/jqueryui/1.11.4/themes/smoothness/jquery-ui.css" />
    <link rel="stylesheet" href="css/style.css" />
    <script src="js/lib/require.js" data-main="js/init-dvtest"></script>
    <script>
        parameters = {
            species: "<?= !empty($_GET["species"]) ? $_GET["species"] : "Largemouth Bass"; ?>", 
            contaminant: "<?= !empty($_GET["contaminant"]) ? $_GET["contaminant"] : "Mercury"; ?>", 
            startYear: "<?= !empty($_GET["startYear"]) ? $_GET["startYear"] : 1900; ?>", 
            endYear: "<?= !empty($_GET["endYear"]) ? $_GET["endYear"] : 9999; ?>"
        };
    </script>
  </head>
  <body style="overflow:scroll;">
    <div id="dv-container" style="padding:15px;">
      <div id="dv-stations-select-container" style="margin-left:20px;">Find My Station: </div>
      <div id="dv-svg-container"></div>
    </div>
  </body>
</html>
