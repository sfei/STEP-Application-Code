<?php

require_once("init.php");

if($ini['devportal']) {
	header("Location: devportal/index.html");
} else {
	header("Location: step.php");
}

?>