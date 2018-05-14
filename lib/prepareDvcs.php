<?php

//************************************************************************************************************
// Prepares the data for the compare stations data viz and stores it in the session. Sessions are used to keep
// the URI from getting too long. Open the data viz with dvcs.php (which retrieves the data gathered here from
// the session).
//************************************************************************************************************

// list of variables
require_once("dvcsVars.php");

// save results to session
if(!isset($_SESSION)) { session_start(); }
foreach($dvcsVars as $key) {
    $_SESSION[$key] = $_REQUEST[$key];
}

?>