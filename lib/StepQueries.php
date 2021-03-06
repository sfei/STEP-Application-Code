<?php

/** Since this is a common function, write it here outside the class for ease of editing. Safely gets the 
 * query contaminants. Query parameters looked for are:
 * <ul>
 *   <li>(String) <i>query</i> - name of query, if calling dynamically via query.php, available options are
 *       same as method names in StepQueries</li>
 *   <li>(String) <i>species</i> - species name (which may also be 'highest' or 'lowest')</li>
 *   <li>(String) <i>contaminant</i> - contaminant name</li>
 *   <li>(int) <i>startYear</i> - start year / min. year</li>
 *   <li>(int) <i>endYear</i> - end year / max. year</li>
 *   <li>(String) <i>station</i> - station name</li>
 *   <li>(int) <i>radiusMiles</i> - search radius in miles</li>
 * </ul>
 * @return array Query object (associative array) with values (String) <i>species</i>, (String) 
 *         <i>contaminant</i>, (int) <i>startYear</i>, (int) <i>endYear</i>, (boolean) <i>isASpecies</i>, (String)
 *         <i>station</i>, and (int) <i>radiusMiles</i>.  */
function getQuery() {
    $query       = filter_input(INPUT_GET, 'query', FILTER_SANITIZE_STRING);
    $species     = filter_input(INPUT_GET, 'species', FILTER_SANITIZE_STRING);
    $contaminant = filter_input(INPUT_GET, 'contaminant', FILTER_SANITIZE_STRING);
    $startYear   = filter_input(INPUT_GET, 'startYear', FILTER_SANITIZE_NUMBER_INT);
    $endYear     = filter_input(INPUT_GET, 'endYear', FILTER_SANITIZE_NUMBER_INT);
    $station     = filter_input(INPUT_GET, 'station', FILTER_SANITIZE_STRING);
    $radiusMiles = filter_input(INPUT_GET, 'radiusMiles', FILTER_SANITIZE_NUMBER_INT);

    if($startYear && $endYear) {
        if($startYear > $endYear) {
            $tempyr = $startYear;
            $startYear = $endYear;
            $endYear = $tempyr;
        }
    } else if($startYear) {
        $endYear = $startYear;
    } else if($endYear) {
        $startYear = $endYear;
    }

    $isASpecies = $species && strtolower($species) != 'highest' && strtolower($species) != 'lowest';

    // escape any single quotes for sql query (which is two single-quotes)
    $station = str_replace("'", "''", $station);
    $station = str_replace("&#39;", "''", $station);

    if($radiusMiles < 0) { $radiusMiles = 0; }

    return array(
        'query' => $query, 
        'species' => $species, 
        'contaminant' => $contaminant, 
        'startYear' => $startYear, 
        'endYear' => $endYear, 
        'isASpecies' => $isASpecies,
        'station' => $station, 
        'radiusMiles' => $radiusMiles
    );
}

/** Singleton class makes it easy to consolidate common functions (and thus edit them in one pass). As a 
 * singleton, only one instance may exist at one time to reduce redundancy, in an almost static type of class
 * functionality. Use StepQueries::getInstance() to get the instance, all functions can then be done on the
 * acquired instance.
 * <br /><br />
 * Note that while most functions take a generic $param object (usually retrieved from the {@link getQuery() 
 * getQuery()} global method outside this class), methods follow the search heirarchy of 
 * species->contaminant->years. E.g. {@link getAvailableContaminants($params) getAvailableContaminants()} 
 * retrieves available contaminants filtering by the species specified by the parameters but for any years 
 * (ignoring any year range specified in the parameters). The only exception is {@link 
 * getAvailableSpecies($params) getAvailableSpecies()}, which so far is unused (use {@link 
 * getAllSpecies($params) getAllSpecies()} instead). */
class StepQueries {
    
    private static $hide_field_names = true;
    private static $dbconn = null;
    private static $instance;
    public static $isDev = false;

    private function __construct() {
        // first check session to set devdb (so init.php returns correct dbconn path)
        if(session_id() == '' || !isset($_SESSION)) {
            session_start();
        }
        if(isset($_SESSION["devdb"]) && $_SESSION["devdb"]) {
            $_GET["dev"] = "true";
        }
        // pull db conn info from ini/config
        require("../init.php");
        require($dbconnPath);
        StepQueries::$isDev = $ini["devmode"] || $ini["devdb"];
        // create connection
        if(!StepQueries::$dbconn) {
            if($ini["driver"] == "odbc") {
                StepQueries::$dbconn = new PDO("odbc:Driver={SQL Server};Server=$host;Database=$dbname", $user, $pass);
            } else if($ini["driver"] == "dblib") {
                StepQueries::$dbconn = new PDO("dblib:host=$host;dbname=$dbname", $user, $pass);
            } else {
                die("Unspecified PDO driver");
            }
            if(!StepQueries::$dbconn) {
                die('Could not connect to server');
            }
        }
    }

    /** Get the existing instance of STEPQueries (create if none exists)
     * @return StepQueries Singleton instance of class
     * @static */
    public static function getInstance() {
        if(is_null(self::$instance)) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * Get config options.
     * @return array Associative array with config options
     *         <ul>
     *           <li>(string) mapServerUrl - MapServer base URL</li>
     *         </ul>
     */
    public function getConfigOptions() {
        $ini = parse_ini_file($_SERVER["DOCUMENT_ROOT"]."/config.ini", true, INI_SCANNER_TYPED);
        return array(
            'gaKey'        => $ini["Config"]["gakey"], 
            'mapServerUrl' => $ini["MapServer"][$ini["MapServer"]["use_ms"]]
        );
    }

    /** Get the default thresholds for contaminant.
     * @param array $params Associative array of query parameters See {@link getQuery() getQuery()}, only
     *        'contaminant' is used thought.
     * @return array Associative array of thresholds in ascending order with format:
     *         <ul>
     *           <li>(float) value - threshold value</li>
     *           <li>(String) units - units abbreviation (e.g. ppm)</li>
     *           <li>(String) comments - description of threshold usually</li>
     *         </ul> */
    public function getThresholds($params) {
        $query = StepQueries::$dbconn->prepare(
            "SELECT Threshold, Units, ThresholdGroup, Comments "
                . "FROM [dbo].[STEP_Thresholds_v2] "
                . "WHERE Parameter = '" . $params['contaminant'] . "' ORDER BY SortOrder ASC"
        );
        $query->execute();
        if($query->errorCode() != 0) {
            die("Query Error: " . $query->errorCode());
        }
        $raw = $query->fetchAll(PDO::FETCH_ASSOC);
        
        if(!StepQueries::$hide_field_names) {
            return $raw;
        } else {
            $thresholds = array();
            for($i = 0; $i < count($raw); $i++) {
                $thresholds[] = array(
                    "value" => $raw[$i]['Threshold'], 
                    "units" => $raw[$i]['Units'], 
                    "group" => $raw[$i]['ThresholdGroup'], 
                    "comments" => $raw[$i]['Comments']
                );
            }
            return $thresholds;
        }
    }

    /** Get list of all stations.
     * @return array Associative array of stations with keys/values:
     *         <ul>
     *           <li>(String) name - station name</li>
     *           <li>(String) waterType - station water type (e.g. river, coast, lake, etc.)</li>
     *           <li>(float) lat -latitude coordinates</li>
     *           <li>(float) long -longitude coordinates</li>
     *           <li>(String) advisoryName - regional name for where advisories are issues (or null)</li>
     *           <li>(String) advisoryUrl - link to site-specific advisory webpage if it exists</li>
     *         </ul> */
    public function getAllStations() {
        $query = StepQueries::$dbconn->prepare(
            "SELECT * FROM [dbo].[STEP_StationGroup] AS a "
                . "CROSS APPLY ("
                    . "SELECT TOP 1 b.WaterType, b.AdvisoryID "
                    . "FROM [dbo].[STEP_Stations] AS b "
                    . "WHERE a.StationGroupID = b.StationGroupID"
                . ") AS c "
                . "LEFT JOIN [dbo].[STEP_Advisories] AS d "
                    . "ON c.AdvisoryID = d.AdvisoryID "
                . "ORDER BY StationGroupName ASC"
        );
        $query->execute();
        if($query->errorCode() != 0) {
            die("Query Error: " . $query->errorCode());
        }
        $raw = $query->fetchAll(PDO::FETCH_ASSOC);
        
        if(!StepQueries::$hide_field_names) {
            return $raw;
        } else {
            $stations = array();
            for($i = 0; $i < count($raw); $i++) {
                $stations[] = array(
                    "name" => $raw[$i]['StationGroupName'], 
                    "waterType" => $raw[$i]['WaterType'], 
                    "lat" => $raw[$i]['StationGroupLat'], 
                    "long" => $raw[$i]['StationGroupLong'], 
                    "advisoryName" => $raw[$i]['AdvisoryName'], 
                    "advisoryUrl" => $raw[$i]['AdvisoryURL']
                );
            }
            return $stations;
        }
    }

    /** Get station data the matches the given query parameters of species, contaminant, and years.
     * @param array $params Associative array of query parameters. See {@link getQuery() getQuery()}.
     * @return array Associative array of stations in alphabetical order with keys/values:
     *         <ul>
     *           <li>(String) name - station name</li>
     *           <li>(String) waterType - station water type (e.g. river, coast, lake, etc.)</li>
     *           <li>(float) lat -latitude coordinates</li>
     *           <li>(float) long -longitude coordinates</li>
     *           <li>(String) advisoryName - regional name for where advisories are issues (or null)</li>
     *           <li>(String) advisoryUrl - link to site-specific advisory webpage if it exists</li>
     *           <li>(float) value - the value for the contaminant specified</li>
     *         </ul> */
    public function getStations($params) {
        $query = StepQueries::$dbconn->prepare(
            "EXEC [dbo].[P_STEP_MAP] "
                . "@param=N'" . $params["contaminant"] . "', "
                . "@startyr=" . $params["startYear"] . ", "
                . "@endyr=" . $params["endYear"] . ", "
                . "@species=N'" . $params["species"] . "'"
        );
        $query->execute();
        if($query->errorCode() != 0) {
            die("Query Error: " . $query->errorCode());
        }
        $raw = $query->fetchAll(PDO::FETCH_ASSOC);

        if(!StepQueries::$hide_field_names) {
            return $raw;
        } else {
            $stations = array();
            for($i = 0; $i < count($raw); $i++) {
                $stations[] = array(
                    "name" => $raw[$i]['StationName'], 
                    "waterType" => $raw[$i]['WaterType'], 
                    "lat" => $raw[$i]['lat'], 
                    "long" => $raw[$i]['lon'], 
                    "advisoryName" => $raw[$i]['AdvisoryName'], 
                    "advisoryUrl" => $raw[$i]['AdvisoryURL'], 
                    "value" => $raw[$i]['Result']
                );
            }
            return $stations;
        }
    }

    /** Get all distinct species that exist in database.
     * @return array Associate array of all species names, sorted alphabetically. The array is two-deep, 
     *        i.e. to get the name, it is usually $array[0][0] or $array[0]['result']. */
    public function getAllSpecies() {
        $query = StepQueries::$dbconn->prepare(
            "SELECT DISTINCT CommonName AS result "
                . "FROM [dbo].[STEP_Table_AllResults] ORDER BY result"
        );
        $query->execute();
        if($query->errorCode() != 0) {
            die("Query Error: " . $query->errorCode());
        }
        return $query->fetchAll();    // fetch with keys as both numeric and as 'result'
    }

    /** Get all available species from given contaminants.
     * @param array $params Associative array of query parameters. See {@link getQuery() getQuery()}.
     * @return array Associate array of all species names that result from the given criteria, sorted 
     *         alphabetically. The array is two-deep, i.e. to get the name, it is usually $array[0][0] or
     *         $array[0]['result'].*/
    public function getAvailableSpecies($params) {
        $query = StepQueries::$dbconn->prepare(
            "SELECT DISTINCT CommonName AS result "
                . "FROM [dbo].[STEP_Table_AllResults] "
                . "WHERE Parameter = '" . $params["contaminant"] . "' AND "
                    . "SampleYear >= " . $params["startYear"] . " AND "
                    . "SampleYear <= " . $params["endYear"]
                . " ORDER BY result"
        );
        $query->execute();
        if($query->errorCode() != 0) {
            die("Query Error: " . $query->errorCode());
        }
        return $query->fetchAll();    // fetch with keys as both numeric and as 'result'
    }
    
    public function getAllContaminants($params) {
        $queryString = "SELECT DISTINCT Parameter AS result FROM [dbo].[STEP_Table_AllResults] ORDER BY result";
        // Sample years and below heirarchy so ignore them for query
        $query = StepQueries::$dbconn->prepare($queryString);
        $query->execute();
        if($query->errorCode() != 0) {
            die("Query Error: " . $query->errorCode());
        }
        return $query->fetchAll();    // fetch with keys as both numeric and as 'result'
    }

    /** Get all available contaminants that have a record for the given species. Due to the 
     * species->contaminant->years search hierarchy, any year values in $params are ignored. That is, returns 
     * all existing contaminants recorded regardless of year.
     * @param array $params Associative array of query parameters. See {@link getQuery() getQuery()}.
     * @return array Associate array of all contaminants that have a record for the given species, sorted 
     *         alphabetically. The array is two-deep, i.e. to get the contaminant name, it is usually 
     *         $array[0][0] or $array[0]['result'].*/
    public function getAvailableContaminants($params) {
        $queryString = "SELECT DISTINCT Parameter AS result FROM [dbo].[STEP_Table_AllResults] ";
        if($params['isASpecies']) {
            $queryString .= "WHERE CommonName = '" . $params['species'] . "' ";
        }
        $queryString .= "ORDER BY result";
        // Sample years and below heirarchy so ignore them for query
        $query = StepQueries::$dbconn->prepare($queryString);
        $query->execute();
        if($query->errorCode() != 0) {
            die("Query Error: " . $query->errorCode());
        }
        return $query->fetchAll();    // fetch with keys as both numeric and as 'result'
    }
    
    /** Get all available contaminants that have a record for the given species. Due to the 
     * species->contaminant->years search hierarchy, any year values in $params are ignored. That is, returns 
     * all existing contaminants recorded regardless of year.
     * @param array $params Associative array of query parameters. See {@link getQuery() getQuery()}.
     * @return array Associate array of all contaminants that have a record for the given species, sorted 
     *         alphabetically. The array is two-deep, i.e. to get the contaminant name, it is usually 
     *         $array[0][0] or $array[0]['result'].*/
    public function getAvailableContaminantsAtStation($params) {
        $queryString = "SELECT DISTINCT Parameter AS result FROM [dbo].[STEP_Table_AllResults] "
            . "WHERE StationName='" . $params['station'] . "' ORDER BY result";
        // Sample years and below heirarchy so ignore them for query
        $query = StepQueries::$dbconn->prepare($queryString);
        $query->execute();
        if($query->errorCode() != 0) {
            die("Query Error: " . $query->errorCode());
        }
        return $query->fetchAll();    // fetch with keys as both numeric and as 'result'
    }

    /** Get the min and max year range for the given contaminants (species and contaminant type). If no 
     * records exist, will return false.
     * @param array $params Associative array of query parameters. See {@link getQuery() getQuery()}.
     * @return array Associate array with keys/values:
     *         <ul>
     *           <li>(int) min - Minimum year value found</li>
     *           <li>(int) max - Maximum year value found</li>
     *         </ul> */
    public function getAvailableYearSpan($params) {
        $queryString = "SELECT MIN(SampleYear) AS 'min', MAX(SampleYear) AS 'max' "
            . "FROM [dbo].[STEP_Table_AllResults] "
            . "WHERE Parameter = '" . $params['contaminant'] . "' ";
        if($params['isASpecies']) {
            $queryString .= "AND CommonName = '" . $params['species'] . "'";
        }
        $query = StepQueries::$dbconn->prepare($queryString);
        $query->execute();
        if($query->errorCode() != 0) {
            die("Query Error: " . $query->errorCode());
        }
        return $query->fetch(PDO::FETCH_ASSOC);
    }

    /** Get all distinct years where data points exist for the given species and contaminant.
     * @param array $params Associative array of query parameters. See {@link getQuery() getQuery()}.
     * @return array Associate array of the distinct years that have a record for the given species and 
     *         contaminant, in ascending order. The array is two-deep, i.e. to get the contaminant name, it is 
     *         usually $array[0][0] or $array[0]['result'] */
    public function getDistinctYears($params) {
        $queryString = "SELECT DISTINCT SampleYear AS result FROM [dbo].[STEP_Table_AllResults] "
            . "WHERE Parameter = '" . $params['contaminant'] . "' ";
        if($params['isASpecies']) {
            $queryString .= "AND CommonName = '" . $params['species'] . "' ";
        }
        $queryString .= "ORDER BY result";
        $query = StepQueries::$dbconn->prepare($queryString);
        $query->execute();
        if($query->errorCode() != 0) {
            die("Query Error: " . $query->errorCode());
        }
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    /** Get all individual records for a given station, contaminant, and year range.
     * @param array $params Associative array of query parameters. See {@link getQuery() getQuery()}.
     * @return array Associate array of all records that match the contaminants with keys/values:
     *         <ul>
     *           <li>(String) species - species name</li>
     *           <li>(String) contaminant - the contaminant (which is redundant as we search by contaminant but
     *               for now include it always)</li>
     *           <li>(float) value - the value for given contaminant</li>
     *           <li>(String) units - units of the contaminant</li>
     *           <li>(int) sampleYear - year sample was taken/li>
     *           <li>(String) sampleType - type of sample (e.g. average of composites or individuals)</li>
     *           <li>(String) tissueCode - tissue code</li>
     *           <li>(String) prepCode - preparation code (e.g skin off)</li>
     *         </ul> */
    public function getStationRecords($params) {
        $queryString = "EXEC [dbo].[P_STEP_Data] "
            . "@station=N'" . $params["station"] . "', "
            . "@param=N'" . $params["contaminant"] . "', "
            . "@startyr=" . $params["startYear"] . ", "
            . "@endyr=" . $params["endYear"];
        $query = StepQueries::$dbconn->prepare($queryString);
        $query->execute();
        if($query->errorCode() != 0) {
            die("Query Error: " . $query->errorCode());
        }
        $raw = $query->fetchAll(PDO::FETCH_ASSOC);
        
        if(!StepQueries::$hide_field_names) {
            return $raw;
        } else {
            $records = array();
            for($i = 0; $i < count($raw); $i++) {
                $records[] = array(
                    "species" => $raw[$i]['CommonName'], 
                    "contaminant" => $raw[$i]['Parameter'], 
                    "value" => $raw[$i]['AvgResult'], 
                    "units" => $raw[$i]['UnitName'], 
                    "sampleYear" => $raw[$i]['SampleYear'], 
                    "sampleType" => $raw[$i]['sampletype_grp'], 
                    "tissueCode" => $raw[$i]['TissueCode'], 
                    "prepCode" => $raw[$i]['PrepCode']
                );
            }
            return $records;
        }
    }

    /** Gets a singular record from the 10 nearest stations for the given year range and contaminant. If a 
     * specific species is specified, filters by the species type -- otherwise selects highest or lowest value
     * for any records. In cases of multiple records fitting this contaminant, the record with the most recent
     * sample year is used. 
     * <br /><br />
     * In cases of exact ties, more than 10 records may be returned. E.g. if searching by "highest" and one 
     * station has two records of two separate species both taken in the same year with the same values 
     * resulting, both will be returned in the list.
     * <br /><br />
     * There does appear to be a cutoff distance but not sure what it is yet.
     * @param array $params Associative array of query parameters. See {@link getQuery() getQuery()}.
     * @return array Associative array of records ordered by distance with keys/values:
     *         <ul>
     *           <li>(String) station - the station name for this record</li>
     *           <li>(int) distanceMiles - the distance to this station from the given station in miles</li>
     *           <li>(String) species - species name for this record</li>
     *           <li>(String) contaminant - the contaminant (which is redundant as we search by contaminant 
     *               but for now include it always)</li>
     *           <li>(float) value - the value for given contaminant</li>
     *           <li>(String) units - units of the contaminant</li>
     *           <li>(int) sampleYear - year sample was taken/li>
     *           <li>(String) sampleType - type of sample (e.g. average of composites or individuals)</li>
     *           <li>(String) prepCode - preparation code (e.g skin off)</li>
     *         </ul> */
    public function getNearbyData($params) {
        $avg = ($params["species"] == "highest" || $params["species"] == "lowest");
        $queryString = "EXEC [dbo].[P_STEP_Nearby] "
            . "@station=N'" . $params["station"] . "', "
            . "@param=N'" . $params["contaminant"] . "', "
            . "@species='" . $params["species"] . "', "
            . "@startyr=" . $params["startYear"] . ", "
            . "@endyr=" . $params["endYear"];
        $query = StepQueries::$dbconn->prepare($queryString);
        $query->execute();
        if($query->errorCode() != 0) {
            die("Query Error: " . $query->errorCode());
        }
        $raw = $query->fetchAll(PDO::FETCH_ASSOC);
        
        if(!StepQueries::$hide_field_names) {
            return $raw;
        } else {
            $records = array();
            for($i = 0; $i < count($raw); $i++) {
                $records[] = array(
                    "station" => $raw[$i]['StationName_Nearby'], 
                    "distanceMiles" => $raw[$i]['Distance_Miles'], 
                    "species" => $raw[$i]['CommonName'], 
                    "contaminant" => $raw[$i]['Parameter'], 
                    "value" => ($avg) ? $raw[$i]['Result'] : $raw[$i]['AvgResult'], 
                    "units" => $raw[$i]['UnitName'], 
                    "sampleYear" => $raw[$i]['SampleYear'], 
                    "sampleType" => $raw[$i]['sampletype_grp'], 
                    "prepCode" => $raw[$i]['PrepCode']
                );
            }
            return $records;
        }
    }

    /** Get a list of stations within a specified distance (in miles) from the selected station.
     * @param array $params Associative array of query parameters. See {@link getQuery() getQuery()}. In 
     *         particular it needs the station name and max. distance in miles.
     * @return array Associative array of the specified station and nearby stations within the specified
     *         distance by keys/values:
     *         <ul>
     *           <li>(String) station - the station name for this record</li>
     *           <li>(int) distanceMiles - the distance to this station from the given station in miles</li>
     *           <li>(float) lat -latitude coordinates</li>
     *           <li>(float) long -longitude coordinates</li>
     *           <li>(String) waterType - station water type (e.g. river, coast, lake, etc.)</li>
     *         </ul> */
    public function getNearbyStations($params) {
        // first the get station info for the selected station
        $queryString = "SELECT TOP 1 a.WaterType, a.Lat, a.Long, b.AdvisoryURL "
            . "FROM [dbo].[STEP_Stations] AS a " 
                . "LEFT JOIN [dbo].[STEP_Advisories] AS b ON (a.AdvisoryID = b.AdvisoryID) "
            . "WHERE a.StationNameRevised = '" . $params["station"] . "'";
        $query = StepQueries::$dbconn->prepare($queryString);
        $query->execute();
        if($query->errorCode() != 0) {
            die("Query Error: " . $query->errorCode());
        }
        $result = $query->fetch(PDO::FETCH_ASSOC);
        
        $records = array();
        $records[] = array(
            "station" => $params["station"], 
            "distanceMiles" => 0, 
            "waterType" => $result['WaterType'], 
            "lat" => $result['Lat'], 
            "long" => $result['Long'], 
            "advisoryUrl" => $result['AdvisoryURL'], 
            'value' => 0    // so it doesn't appear as no data value on init
        );

        // then fill in the data for nearby stations
        $queryString = "SELECT a.StationName_Nearby, a.Distance_Miles, b.WaterType, b.Lat, b.Long, d.AdvisoryURL "
            . "FROM [dbo].[STEP_Table_ClosestStations] AS a "
            . "CROSS APPLY ("
                . "SELECT TOP 1 c.StationNameRevised, c.WaterType, c.Lat, c.Long, c.AdvisoryID "
                . "FROM [dbo].[STEP_Stations] as c "
                . "WHERE a.StationName = '" . $params["station"] . "' AND a.StationName_Nearby = c.StationNameRevised"
            . ") AS b "
            . "LEFT JOIN [dbo].[STEP_Advisories] as d "
                . "ON (b.AdvisoryID = d.AdvisoryID) "
            . "WHERE a.Distance_Miles <= " . $params["radiusMiles"] . " "
            . "ORDER BY a.Distance_Miles";
        $query = StepQueries::$dbconn->prepare($queryString);
        $query->execute();
        if($query->errorCode() != 0) {
            die("Query Error: " . $query->errorCode());
        }
        $raw = $query->fetchAll(PDO::FETCH_ASSOC);
        
        for($i = 0; $i < count($raw); $i++) {
            $records[] = array(
                "station" => $raw[$i]['StationName_Nearby'], 
                "distanceMiles" => $raw[$i]['Distance_Miles'], 
                "waterType" => $raw[$i]['WaterType'], 
                "lat" => $raw[$i]['Lat'], 
                "long" => $raw[$i]['Long'], 
                "advisoryUrl" => $raw[$i]['AdvisoryURL'], 
                'value' => 0    // so it doesn't appear as no data value on init
            );
        }
        return $records;
    }

    /** Get a list of stations within a specified distance (in miles) from the selected station, as well as 
     * the records for each station. Basically a combination of {@link getNearbyStations($params) 
     * getNearbyStations()} and {@link getStationRecords($params) getStationRecords()}.
     * @param array $params Associative array of query parameters. See {@link getQuery() getQuery()}. In 
     *        particular it needs the station name and max. distance in miles.
     * @return array Associative array of records ordered by distance with keys/values:
     *         <ul>
     *           <li>(String) station - the station name for this record</li>
     *           <li>(int) distanceMiles - the distance to this station from the given station in miles</li>
     *           <li>(float) lat -latitude coordinates</li>
     *           <li>(float) long -longitude coordinates</li>
     *           <li>(String) waterType - station water type (e.g. river, coast, lake, etc.)</li>
     *           <li>(Array) records
     *             <ul>
     *               <li>(String) species - species name</li>
     *               <li>(String) contaminant - the contaminant (which is redundant as we search by 
     *                   contaminant but for now include it always)</li>
     *               <li>(float) value - the value for given contaminant</li>
     *               <li>(String) units - units of the contaminant</li>
     *               <li>(int) sampleYear - year sample was taken/li>
     *               <li>(String) sampleType - type of sample (e.g. average of composites or individuals)</li>
     *               <li>(String) tissueCode - tissue code</li>
     *               <li>(String) prepCode - preparation code (e.g skin off)</li>
     *             </ul>
     *            </li>
     *         </ul> */
    public function getNearbyStationsRecords($params) {
        $stations = $this->getNearbyStations($params);
        for($i = 0; $i < count($stations); $i++) {
            $params['station'] = $stations[$i]['station'];
            $stations[$i]['records'] = $this->getStationRecords($params);
        }
        return $stations;
    }
    
    /** Get a list of the 10 nearest stations from the selected station.
     * @param array $params Associative array of query parameters. See {@link getQuery() getQuery()}. In 
     *        particular it needs the station name and max. distance in miles.
     * @return array Associative array of the specified station and nearby stations within the specified
     *         distance by keys/values:
     *         <ul>
     *           <li>(String) station - the station name for this record</li>
     *           <li>(float) lat -latitude coordinates</li>
     *           <li>(float) long -longitude coordinates</li>
     *           <li>(String) waterType - station water type (e.g. river, coast, lake, etc.)</li>
     *         </ul> */
    public function get10NearestStations($params) {
        // first the get station info for the selected station
        $queryString = "SELECT TOP 1 a.WaterType, a.Lat, a.Long, b.AdvisoryURL "
            . "FROM [dbo].[STEP_Stations] AS a " 
                . "LEFT JOIN [dbo].[STEP_Advisories] AS b ON (a.AdvisoryID = b.AdvisoryID) "
            . "WHERE a.StationNameRevised = '" . $params["station"] . "'";
        $query = StepQueries::$dbconn->prepare($queryString);
        $query->execute();
        if($query->errorCode() != 0) {
            die("Query Error: " . $query->errorCode());
        }
        $result = $query->fetch(PDO::FETCH_ASSOC);
        
        $records = array();
        $records[] = array(
            "station" => $params["station"], 
            "distanceMiles" => 0, 
            "waterType" => $result['WaterType'], 
            "lat" => $result['Lat'], 
            "long" => $result['Long'], 
            "advisoryUrl" => $result['AdvisoryURL'], 
            'value' => 0    // so it doesn't appear as no data value on init
        );
        
        // then fill in the data for nearby stations
        $queryString = "SELECT TOP 10 "
            . "a.StationName_Nearby, a.Distance_Miles, b.WaterType, b.Lat, b.Long, d.AdvisoryURL "
            . "FROM [dbo].[STEP_Table_ClosestStations] AS a "
            . "CROSS APPLY ("
                . "SELECT TOP 1 c.StationNameRevised, c.WaterType, c.Lat, c.Long, c.AdvisoryID "
                . "FROM [dbo].[STEP_Stations] as c "
                . "WHERE a.StationName = '" . $params["station"] . "' AND a.StationName_Nearby = c.StationNameRevised"
            . ") AS b "
            . "LEFT JOIN [dbo].[STEP_Advisories] as d "
                . "ON (b.AdvisoryID = d.AdvisoryID) "
            . "ORDER BY a.Distance_Miles";
        $query = StepQueries::$dbconn->prepare($queryString);
        $query->execute();
        if($query->errorCode() != 0) {
            die("Query Error: " . $query->errorCode());
        }
        $raw = $query->fetchAll(PDO::FETCH_ASSOC);
        
        for($i = 0; $i < count($raw); $i++) {
            $records[] = array(
                "station" => $raw[$i]['StationName_Nearby'], 
                "distanceMiles" => $raw[$i]['Distance_Miles'], 
                "waterType" => $raw[$i]['WaterType'], 
                "lat" => $raw[$i]['Lat'], 
                "long" => $raw[$i]['Long'], 
                "advisoryUrl" => $raw[$i]['AdvisoryURL'], 
                'value' => 0    // so it doesn't appear as no data value on init
            );
        }
        return $records;
    }
    
    /** Get a list of the 10 nearest stations from the selected station, as well as the records for each 
     * station. Basically a combination of {@link getNearbyStations($params)  get10NearestStations()} and 
     * {@link getStationRecords($params) getStationRecords()}.
     * @param array $params Associative array of query parameters. See {@link getQuery() getQuery()}. In 
     *        particular it needs the station name and max. distance in miles.
     * @return array Associative array of records ordered by distance with keys/values:
     *         <ul>
     *           <li>(String) station - the station name for this record</li>
     *           <li>(float) lat -latitude coordinates</li>
     *           <li>(float) long -longitude coordinates</li>
     *           <li>(String) waterType - station water type (e.g. river, coast, lake, etc.)</li>
     *           <li>(Array) records
     *             <ul>
     *               <li>(String) species - species name</li>
     *               <li>(String) contaminant - the contaminant (which is redundant as we search by 
     *                   contaminant but for now include it always)</li>
     *               <li>(float) value - the value for given contaminant</li>
     *               <li>(String) units - units of the contaminant</li>
     *               <li>(int) sampleYear - year sample was taken/li>
     *               <li>(String) sampleType - type of sample (e.g. average of composites or individuals)</li>
     *               <li>(String) tissueCode - tissue code</li>
     *               <li>(String) prepCode - preparation code (e.g skin off)</li>
     *             </ul>
     *           </li>
     *         </ul> */
    public function get10NearestStationsRecords($params) {
        $stations = $this->get10NearestStations($params);
        for($i = 0; $i < count($stations); $i++) {
            $params['station'] = $stations[$i]['station'];
            $stations[$i]['records'] = $this->getStationRecords($params);
        }
        return $stations;
    }

    /** Get any and all existing records for the parameters provided.
    * @param array $params Associative array of query parameters. See {@link getQuery() getQuery()}. In 
    *        particular it needs the contaminant, the species (if highest/lowest, grabs all species), and 
    *        start and end years.
    * @return array Associative array of records. As this is function is really only used for preparing 
    *         records for download, the specifics of each column are not specified here. */
    public function getAllRecords($params) {
        if($params["species"] == "highest" || $params["species"] == "lowest") {
            $params["species"] = "all";
        }
        $queryString = "EXEC [dbo].[P_STEP_Download] "
            . "@param=N'" . $params["contaminant"] . "', "
            . "@species='" . $params["species"] . "', "
            . "@startyr=" . $params["startYear"] . ", "
            . "@endyr=" . $params["endYear"];
        // This is weird, but one of the queries (PCBs/all-species) is a lot of records and takes awhile to 
        // query, but meanwhile something on the server thinks it's timed-out/unresponsive. Adding a blank 
        // print before executing the query solves this somehow.
        print("");
        $query = StepQueries::$dbconn->prepare($queryString);
        $query->execute();
        if($query->errorCode() != 0) {
            die("Query Error: " . $query->errorCode());
        }
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

}