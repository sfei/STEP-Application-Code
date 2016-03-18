<?php

//************************************************************************************************************
// Returns list of all species, JSON-encoded. See StepQueries->getAllSpecies() for format information.
//************************************************************************************************************

require_once('StepQueries.php');

echo json_encode(
	StepQueries::getInstance()->getAllSpecies()
);

?>
