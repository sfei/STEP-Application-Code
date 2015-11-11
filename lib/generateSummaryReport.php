<?php

	session_start();

	if(!array_key_exists('data', $_SESSION)) {
		die("Error retrieving report data, data may have expired");
	}
		
	$data = $_SESSION['data'];
	$query = $_SESSION['query'];
	
	include("../layouts/reporttemplate.php");

?>