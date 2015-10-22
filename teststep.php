<?php
    $conn = new PDO("dblib:host=data2;dbname=STEPDEV", "step", "WAatfff1");
    if (!$conn) {
        die('Something went wrong while connecting to data2');
    }
 
    $stmt = $conn->query("select * from step_stations");
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
