import React, { Fragment, useState, useEffect, useRef } from "react";
import TypeWriter from './TypeWriter';
import { FaSearch, FaCaretDown } from "react-icons/fa";
import { useParams } from 'react-router-dom';
import "./Map.css";

import startMarker from "./leaflet-markers/img/marker-icon-red.png";
import endMarker from "./leaflet-markers/img/marker-icon-black.png";
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker } from "react-leaflet";
import L from "leaflet";
import Geoman from "./Geoman";


const Map = () => {

	var { logId, dayId } = useParams();

	if (logId === undefined || dayId === undefined) {
		logId = "";
		dayId = "";
	}

	const [isRouteActive, setIsRouteActive] = useState(false);
	const [isRouteDayActive, setIsRouteDayActive] = useState(false);
	const [isShardActive, setIsShardActive] = useState(false);

	// dropdown
	const [shardList, setShardList] = useState([]);
	const [routeOptions, setRouteOptions] = useState([]);
	const [route, setRoute] = useState(logId);
	const [routeDayOptions, setRouteDayOptions] = useState([]);
	const [routeDay, setRouteDay] = useState(dayId);
	const [shardOptions, setShardOptions] = useState([]);
	const [shardId, setShardId] = useState("");

	// coordinates
	const [coords, setCoords] = useState([]);
	const [start, setStart] = useState([]);
	const [center, setCenter] = useState([]);
	const [end, setEnd] = useState([]);

	// toggle path
	const [toggle, setToggle] = useState(false);
	const [toggleText, setToggleText] = useState("OFF");

	// stats
	const [attrs, setAttrs] = useState([]);
	const [routeDayStats, setRouteDayStats] = useState("");

	// geoman
	const [resultsFromArea, setResultsFromArea] = useState([]);
	const [areaCoords, setAreaCoords] = useState({});

	const mapRef = useRef();
	const searchRef = useRef();
	const statsRef = useRef();
	const pathRef = useRef();
	const pointerRef = useRef();
	var pointCounter = 0;
	const DOWN_SAMPLE = 10;


    const getRoutes = async() => {
        try{
            const response = await fetch("http://localhost:5000/map");
            const routeList = await response.json();

            setShardList(routeList);
            const routes = routeList.map(item => item.primary_log_name).map((item) => (item))
            						.filter((item, i, arr) => arr.indexOf(item) === i);
            setRouteOptions(routes.sort());

            // useState setShardList is not updated immediately, thus call function directly
            if (logId && dayId)
            	filterRouteDays(logId, routeList);
		       	filterShards(dayId, routeList);

        } catch(err){
            console.error(err.message);
        }
    };

	const findRoute = async(e) => {
        // prevent refresh
        e.preventDefault();

        // QUERY HANDLING
        try{
        	// handle route and shard query
        	if (route === "" || routeDay === "")
        		return alert("Please select year-month and route day!");

        	if (resultsFromArea.length > 0) {
        		setResultsFromArea([]);
        		setAreaCoords([]);
        	}

        	let routeQuery = `http://localhost:5000/map/${route}/${routeDay}`;

        	if (shardId !== "") {
        		routeQuery += `?shard=${shardId}`;
        	}

			const response = await fetch(routeQuery);
			const coordsResponse = await response.json();

			setRouteDayStats(routeDay);
			setAttrs(coordsResponse);

			var coordsList = [];
			coordsResponse.map(item => coordsList.push([item.lat, item.lon]));

			var centerCoord = coordsList[(coordsList.length/2) << 0];

  		setStart(coordsList[0]);
			setCenter(centerCoord);
			setEnd(coordsList[coordsList.length-1]);
			setCoords([coordsList]);

			handleFlyToView(centerCoord);

        } catch (err) {
        	console.error(err.message);
        }
    };

    const findRouteFromArea = async() => {
    	try {
    		if (resultsFromArea.length === 0) {
    			console.log("No route found!");
    			return;
    		}

    		console.log("Finding routes from area...");

        	var dictCoords = {};
        	var coordsList = [];

        	for (let i=0; i<resultsFromArea.length; i++) {
				const response = await fetch(`http://localhost:5000/map/${resultsFromArea[i].primary_log_name}
												/${resultsFromArea[i].date}
												?shard=${resultsFromArea[i].shard_id}`);
				const coordsResponse = await response.json();
				coordsResponse.map(item => coordsList.push([item.lat, item.lon]));
				dictCoords[resultsFromArea[i].primary_log_name + resultsFromArea[i].shard_id] = [coordsList]
        	}

			setAreaCoords(dictCoords);

    	} catch (err) {
    		console.error(err.message);
    	}
    }

	const handleFlyToView = (latlong) => {
		// console.log(mapRef.current);
		// check NE-SW bounds
		// console.log(mapRef.current.getBounds());
		mapRef.current.flyTo(latlong, 16);
	};

	const changeIcon = (img) => {
		return new L.icon({
			iconUrl: img,
			iconAnchor: [12.5, 41]
		})
	};

	const filterRouteDays = (option, list=[]) => {
		var selectedRouteDays;

		// get unique route days [BUG]

		if (list.length === 0) {
			selectedRouteDays = shardList.filter(item => item.primary_log_name === option)
											.map(item => item.date).map(item => item)
											.filter((item, i, arr) => arr.indexOf(item) === i);
		}
		else {
			selectedRouteDays =	list.filter(item => item.primary_log_name === option)
										.map(item => item.date).map(item => item)
										.filter((item, i, arr) => arr.indexOf(item) === i);
		}

		setRouteDayOptions(selectedRouteDays.sort());
	}

	const filterShards = (option, list=[]) => {
		var selectedShards;

		if (list.length === 0) {
	        selectedShards = shardList.filter(item => item.date === option).map(item => item.shard_id).map(item => item);
		}
		else {
			selectedShards = list.filter(item => item.date === option).map(item => item.shard_id).map(item => item);
		}

		setShardOptions(selectedShards.sort());
	}

	const clickCoordinate = async(e) => {
		console.log("clicked")
		console.log(pathRef.current);
		// if ( === null)
		// pointCounter
		// statsRef.current.children[1].firstChild.data = attrs[pointCounter].speed.toFixed(2);
		// statsRef.current.children[3].firstChild.data = attrs[pointCounter].yaw.toFixed(2);
		// statsRef.current.children[5].firstChild.data = attrs[pointCounter].yaw_rate.toFixed(2);
  //       pointerRef.current.setLatLng(coords[0][pointCounter]);
	};

	const moveCoordinate = async(e) => {
	    switch (e.keyCode) {
	        case 37:
            	// press left arrow key
	        	if (coords[0] === undefined) break;

	            // IF JOIN PATH IS OFF -> [BUG -> MOVING DOWN SAMPLE COORDINATES]
	            // if (toggle === false && pointCounter%DOWN_SAMPLE !== 0)
	            // 	pointCounter--;
	            // 	break;

	            if (pointCounter === 0) {
	            	pointCounter = coords[0].length-1;
	            }
	            else {
		            pointCounter--;
	            }

	            if (pointerRef.current === null) return;

	            // change vehicular statistics
				statsRef.current.children[2].firstChild.data = attrs[pointCounter].speed.toFixed(2);
				statsRef.current.children[5].firstChild.data = attrs[pointCounter].yaw.toFixed(2);
				statsRef.current.children[8].firstChild.data = attrs[pointCounter].yaw_rate.toFixed(2);
				statsRef.current.children[11].firstChild.data = attrs[pointCounter].location;
	            pointerRef.current.setLatLng(coords[0][pointCounter]);
	            break;
	        case 39:
	        	// press right arrow key
	        	if (coords[0] === undefined) break;

	            // IF JOIN PATH IS OFF -> [BUG -> MOVING DOWN SAMPLE COORDINATES]
	            // if (toggle === false && pointCounter%DOWN_SAMPLE !== 0)
	            // 	pointCounter++;
	            // 	break;

	            if (pointCounter === coords[0].length-1) {
	            	pointCounter = 0;
	            }
	            else {
		            pointCounter++;
	            }

	            if (pointerRef.current === null) return;

	            console.log(pointCounter);
	            // change vehicular statistics
				statsRef.current.children[2].firstChild.data = attrs[pointCounter].speed.toFixed(2);
				statsRef.current.children[5].firstChild.data = attrs[pointCounter].yaw.toFixed(2);
				statsRef.current.children[8].firstChild.data = attrs[pointCounter].yaw_rate.toFixed(2);
				statsRef.current.children[11].firstChild.data = attrs[pointCounter].location;
	            pointerRef.current.setLatLng(coords[0][pointCounter]);
	            break;
	        default:
            	break;
	   	}
	};

	window.addEventListener('keydown', moveCoordinate);

	const resetMap = () => {
		if (coords.length === 0) return;
		console.log("Resetting Map...");
		setRoute("");
		setRouteDay("");
		setShardId("");
		setAttrs([]);
		setCoords([]);
		setStart([]);
		setCenter([]);
		setEnd([]);

		// reset geoman
		setResultsFromArea([]);
		setAreaCoords({});

		pointCounter = 0;
    };

    const toggleRoute = () => {
    	if (toggle === false) {
    		setToggle(true);
    		setToggleText("ON");
    	}
    	else {
    		setToggle(false);
			setToggleText("OFF");
    	}
    }

    useEffect(() => {
        getRoutes();
        if (logId && dayId) {
        	searchRef.current.click();
        }

        // remove event listener when component unmounts
        return () => window.removeEventListener('keydown', moveCoordinate);
    }, []);

    useEffect(() => {
    	findRouteFromArea();
    }, [resultsFromArea]);


	return (
		<Fragment>
			<TypeWriter heading="SEARCH AV.ROUTE:" dataText={["LOCATION;", "GPS ROUTE;", "GPS MAP;"]} />
			<div className="routeContainer d-flex align-items-center justify-content-center">
				{/*ROUTE-YY-MM*/}
				<div className="dropdown">
					<div className="dropdown-btn" onClick={e => setIsRouteActive(!isRouteActive)}>
						{route === "" ? "Select Year-Month..." : route}
						<FaCaretDown />
					</div>
					{isRouteActive && (
					<div className="dropdown-content">
					{routeOptions.map(option => (
						<div key={option} onClick={e => {
							setRoute(option);
							setRouteDay("");
							setShardId("");
							setIsRouteActive(false);
							filterRouteDays(option);
						}}
						className="dropdown-item">{option}
						</div>
						))}
					</div>
					)}
				</div>
				{/*ROUTE DAY*/}
				<div className="dropdown">
					<div className="dropdown-btn" onClick={e => setIsRouteDayActive(!isRouteDayActive)}>
						{routeDay === "" ? "Select Route Day..." : routeDay}
						<FaCaretDown />
					</div>
					{route && isRouteDayActive && (
					<div className="dropdown-content">
					{routeDayOptions.map(option => (
						<div key={option} onClick={e => {
							setRouteDay(option);
							setShardId("");
							setIsRouteDayActive(false);
							filterShards(option);
						}}
						className="dropdown-item">{option}
						</div>
						))}
					</div>
					)}
				</div>

				{/*ROUTE SHARD ID*/}
				<div className="dropdown">
					<div className="dropdown-btn" onClick={e => setIsShardActive(!isShardActive)}>
						{shardId === "" ? "Select Shard ID..." : shardId}
						<FaCaretDown />
					</div>
					{route && routeDay && isShardActive && (
					<div className="dropdown-content">
					{shardOptions.map(option => (
						<div key={option} onClick={e => {
							setShardId(option);
							setIsShardActive(false);
						}}
						className="dropdown-item">{option}
						</div>
						))}
					</div>
					)}
				</div>
				<button className="btn btn-success" ref={searchRef} onClick={findRoute}><FaSearch /></button>
			</div>

			{/*MAP*/}
    		<div className="osmContainer mb-5">
    			<MapContainer
					whenCreated={ mapInstance => { mapRef.current = mapInstance } }
    				center={center.length > 0 ? center : [1.339471, 103.712539]}
    				maxBounds={[[1.2236809188963782, 103.60090255737306 ], [1.4758366245624137, 104.0449905395508]]}
        			maxBoundsViscosity={1}
					zoom={16}
					minZoom={13}
					scrollWheelZoom={true}
				>
					<TileLayer
				    	attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
					    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
					/>

					{/*HANDS-FREE DRAWING*/}
					<Geoman setProps={setResultsFromArea} setPoints={setAreaCoords} />

					{attrs.length > 0 &&
						<div>
							<div className="statsBox mt-3 mr-3">
								<div className="h6 font-weight-bold text-left mt-3 ml-3">
									Vehicular Statistics: {routeDayStats}
									<div ref={statsRef}><br/>
					    				<div className="infoBox text-center">Velocity</div><span>{attrs[pointCounter].speed.toFixed(2)}</span> m/s<br/>
					    				<div className="infoBox text-center">Yaw</div><span>{attrs[pointCounter].yaw.toFixed(2)}</span> rad<br/>
					    				<div className="infoBox text-center">Yaw Rate</div><span>{attrs[pointCounter].yaw_rate.toFixed(2)}</span> rad/s<br/>
					    				<div className="infoBox text-center">Address</div><span>{attrs[pointCounter].location}</span>
					    			</div>
			    				</div>
			    			</div>
							<button className="resetBox h6 font-weight-bold mt-3 ml-3 text-center" onClick={resetMap}>RESET</button>
							<button className="toggleBox h6 font-weight-bold mt-3 ml-3 text-center" onClick={toggleRoute} >PATH: {toggleText}</button>
		    			</div>
	    			}

					{/*ROUTE FROM DRAWN AREA*/}
			        {toggle === true ? Object.keys(areaCoords).length > 0 &&
		        		Object.entries(areaCoords).map(([key, value], index) => {
		        			/*return every set of coords as new polyline [BUG]*/
							return <Polyline key={key} color="red" weight={4} positions={value} />
						}) :
		        		Object.entries(areaCoords).map(([key, value], index) => value.map(arr => arr.map((item, index) => {
	        				if (index === arr[0].length-1 || index%DOWN_SAMPLE === 0)
								return <CircleMarker key={index} color="red" center={item} radius={4} />
							return null
						})))
		        	}

				 	{coords.length > 0 && (
			 		<div>
				 		<Marker position={start} icon={changeIcon(startMarker)}>
		    				<Popup>
					    		AV route starts here! <br /> Start point.
					    	</Popup>
						</Marker>
						 <Marker position={end} icon={changeIcon(endMarker)}>
					    	<Popup>
						    	AV route ends here! <br /> End point.
						    </Popup>
						</Marker>

						{/*MAIN ROUTE*/}
						{toggle === true ? <Polyline ref={pathRef} weight={4} positions={coords} onClick={clickCoordinate} /> :
											// Array.prototype.map expects value to be returned at the end of arrow function [BUG]
											coords[0].map((value, index) => {
												// downsample coordinates by 10
												if (index === coords[0].length-1 || index%DOWN_SAMPLE === 0)
													return <CircleMarker key={index} center={value} radius={4} />
												return null;
											})
						}
						<CircleMarker ref={pointerRef} color="red" center={coords[0][pointCounter]} radius={6} />
					</div>)}
				</MapContainer>
    		</div>

    		{/*TABLE*/}
            <div className="d-inline-block bs-width mb-5">
            <div className="d-flex justify-content-between">
                <label className="font-weight-bold my-2">
                    <h4>ROUTE INFORMATION</h4>
                </label>
                <label className="font-weight-bold my-2">
                    {resultsFromArea.length > 1 ? <p>{resultsFromArea.length} Results</p> : <p>{resultsFromArea.length} Result</p>}
                </label>
            </div>

            <table className="table text-center my-2 table-striped table-hover">
                <thead className="bg-success text-white">
                <tr>
                	<th></th>
                    <th>ROUTE YEAR-MONTH</th>
                    <th>ROUTE DATE</th>
                    <th>SHARD ID</th>
                </tr>
                </thead>
                <tbody>
                {resultsFromArea.map((results, index) => (
                  <tr key={index+1}>
                  	<td>{index+1}</td>
                    <td>{results.primary_log_name}</td>
                    <td>{results.date}</td>
                    <td>{results.shard_id}</td>
                  </tr>
                ))}
                </tbody>
            </table>
            {resultsFromArea.length === 0 && <p className="text-center my-5">No Route Found</p>}
            </div>
		</Fragment>
	)
};

export default Map;
