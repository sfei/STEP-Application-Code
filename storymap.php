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
    <div id="storymap-loading">Loading...</div>
    
<?php if($ini["devmode"]) { ?>
    <script src="js/lib/require.js" data-main="js/init-storymap"></script>
<?php } else { ?>
    <script src="build/require.js"></script>
    <script>require(["build/libs","build/step-app","build/sreport"],function(){require(["../build/storymap"]);});</script>
<?php if(!empty($ini["gakey"])) { ?>
    <script>
      (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
      (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
      m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
      })(window,document,'script','https://www.google-analytics.com/analytics.js','ga');
      ga('create', <?= $ini["gakey"]; ?>, 'auto');
      ga('send', 'pageview');
    </script>
<?php } ?>
<?php } ?>
  </body>
</html>