<?php

	session_start();

	if(!array_key_exists('data', $_SESSION)) {
		die("Error retrieving report data");
	}
	
	$age = time();
	if(array_key_exists($ts = 'timestamp', $_SESSION)) {
		// one minute should be plenty
		if(time() - $_SESSION[$ts] > 60) {
			session_unset();
			die("Error data has expired");
		}
	}
	
	$data = $_SESSION['data'];
	$query = $_SESSION['query'];
	
	include("../layouts/reporttemplate.php");

?>