<?php

$ini = parse_ini_file("config.ini", false, INI_SCANNER_TYPED);
// set such that any relative paths are from the location on init.php, despite if this is called as a require
// from elsewhere
chdir(dirname(__FILE__));
$dbconnPath = realpath($ini["path_conns"]) . "/" . ($ini["devmode"] ? $ini["conn_dev"] : $ini["conn_prd"]);
// error display
if($ini["devmode"]) {
	error_reporting(E_ALL);
	ini_set('display_errors', 1);
}

?>