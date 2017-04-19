<?php

$ini = parse_ini_file("config.ini", false, INI_SCANNER_TYPED);
// for now, as we only have staging on geodata3, which also doesn't support INI_SCANNER_TYPED
$ini["devmode"] = true;

?>