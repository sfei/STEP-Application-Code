<?php

$ini = parse_ini_file("config.ini", false, INI_SCANNER_TYPED);
// super-secret dev mode
$ini["devdb"] = isset($_GET["dev"]) && strtolower($_GET["dev"]) == "true";
// put dev mode in session (this is since ajax calls to database won't pass the "dev" parameter)
if(session_id() == '' || !isset($_SESSION)) {
    session_start();
}
$_SESSION["devdb"] = $ini["devmode"] || $ini["devdb"];
// set such that any relative paths are from the location on init.php, despite if this is called as a require
// from elsewhere
chdir(dirname(__FILE__));
$dbconnPath = (
    realpath($ini["path_conns"]) . "/" . 
    ($_SESSION["devdb"] ? $ini["conn_dev"] : $ini["conn_prd"])
);
// error display
if($ini["devmode"]) {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
}

?>