import React, { Fragment, useState, useEffect } from "react";
import Select from 'react-select';
import TimePicker from 'react-time-picker';
import { FaSearch, FaBus, FaRegCalendar, FaRegClock, FaMapMarkerAlt } from "react-icons/fa";
import { useNavigate } from 'react-router-dom';

import TypeWriter from './TypeWriter';


const Home = () => {

    // buttons state
    const [vehicleState, setVehicleState] = useState(false);
    const [dateState, setDateState] = useState(false);
    const [timeState, setTimeState] = useState(false);
    const [locationState, setLocationState] = useState(false);

    const [vehicleOptions, setVehicleOptions] = useState([]);

    // query variables
    const[file, setFile] = useState("");
    const [vehicle, setVehicle] = useState([]);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [location, setLocation] = useState("");
    const[logs, setLogs] = useState([]);

    const getResults = async() => {
        try{
            const response = await fetch("http://localhost:5000/");
            const jsonData = await response.json();

            // variables for multi-select
            const vehicles = [...new Set(jsonData.map(item => item.vehicle))].map((item, i) => ({value: i+1, label: item}));

            setVehicleOptions(vehicles);
            setLogs(jsonData);
        } catch(err){
            console.error(err.message);
        }
    }

    const navigate = useNavigate();
    const goToMap = (log, day) => {
        // navigate({
        //     pathname: '/map',
        //     search: `?route=${id}`,
        // });
        navigate(`/map/${log}/${day}`);
    }

    const onSubmitForm = async(e) => {
        // prevent refresh
        e.preventDefault();

        // QUERY HANDLING
        let url = "http://localhost:5000/logs";
        let extendedUrl = "";

        // CUSTOM FILTER BY TEXT
        if (file !== "") {
          if (extendedUrl !== "") { extendedUrl += "&"; }
          extendedUrl += `file=${file}`;
        }

        // FILTER BY VEHICLE
        if (vehicle.length !== 0) {
          if (extendedUrl !== "") { extendedUrl += "&"; }
          for (let i=0; i < vehicle.length; i++) {
            if (i === 0 || i !== vehicle.length-1) { } else { extendedUrl += "&"; }
            extendedUrl += `vehicle=${[vehicle[i]].map(item => item.label).reduce(i => {return `${i}`})}`;
          }
        }

        // FILTER BY DATE
        if (startDate !== "") {
          if (extendedUrl !== "") { extendedUrl += "&"; }
          extendedUrl += `startDate=${startDate}`;
          if (endDate !== "") {
            extendedUrl += (`&endDate=${endDate}`);
          }
        }

        // FILTER BY TIME
        if (startTime === "" || startTime === null) { }
        else {
          if (extendedUrl !== "") { extendedUrl += "&"; }
          extendedUrl += `startTime=${startTime}`;
          if (endTime === "" || endTime === null) { }
          else { extendedUrl += (`&endTime=${endTime}`); }
        }

        // FILTER BY LOCATION
        if (location !== "") {
          if (extendedUrl !== "") { extendedUrl += "&"; }
          extendedUrl += `loc=${location}`;
        }

        if (extendedUrl !== "") {
          url += ("?" + extendedUrl);
        }

        try{
          const response = await fetch(url);
          const parseResponse = await response.json();
          setLogs(parseResponse);
        } catch (err) {
          console.error(err.message);
        }
    };

    const reset = () => {
        setFile("");
        setVehicle([]);
        setStartDate("");
        setEndDate("");
        setStartTime("");
        setEndTime("");
        setLocation("");
    };

    useEffect(() => {
        getResults();
    }, []);


    return (
        <Fragment>
            <TypeWriter heading="SEARCH AV.ML.DB:" dataText={['GEOLOCATION;', 'LIDAR;', 'IMAGE;', 'OBJECTLIST;']} />
            <div className="rectangle bs-width mb-5">
                <div className="text-left my-2 font-weight-bold">
                    SELECT
                    <h4 className="subText mx-2">*</h4>
                    FROM
                    <h4 className="subText mx-2">LOGS</h4>
                    WHERE
                </div>
                <form className="d-flex" onSubmit={onSubmitForm}>
                    <input
                    type="text"
                    name="file"
                    placeholder="Try: 20220215_124241, After Street Kinetics, Ayer Rajah Cresent"
                    className="form-control"
                    value={file}
                    onChange={e => setFile(e.target.value)}
                    />
                    <button className="btn btn-success"><FaSearch /></button>
                </form>

                <p className="text-left my-4 font-weight-bold">FILTER BY...</p>

                <div className="text-left">
                    <div className="my-2 d-flex">
                        <button className="btn btn-success mr-3" onClick={() => setDateState(state => !dateState)}>
                            <FaRegCalendar className="pt-1" /> DATE
                        </button>
                        {dateState === true ? <div>
                                                <b>FROM: </b>
                                                <input type="date" onChange={e => setStartDate(e.target.value)} />
                                                <b> TO: </b>
                                                <input type="date" onChange={e => setEndDate(e.target.value)} />
                                            </div> : null}
                    </div>
                    <div className="my-2 d-flex">
                        <button className="btn btn-success mr-3" onClick={() => setTimeState(state => !timeState)}>
                            <FaRegClock className="pt-1" /> TIME
                        </button>
                        {timeState === true ? <div>
                                                <b>FROM: </b>
                                                <TimePicker onChange={setStartTime} value={startTime} />
                                                <b> TO: </b>
                                                <TimePicker onChange={setEndTime} value={endTime} />
                                            </div> : null}
                    </div>
                    <div className="my-2 d-flex">
                        <button className="btn btn-success mr-3" onClick={() => setVehicleState(state => !vehicleState)}>
                            <FaBus className="pt-1" /> VEHICLE
                        </button>
                        {vehicleState === true ? <Select
                                                    isMulti
                                                    placeholder="Select..."
                                                    value={vehicle}
                                                    options={vehicleOptions}
                                                    onChange={setVehicle}
                                                  /> : null}
                    </div>
                    <div className="my-2 d-flex">
                        <button className="btn btn-success mr-3" onClick={() => setLocationState(state => !locationState)}>
                            <FaMapMarkerAlt className="pt-1" /> LOCATION
                        </button>
                        {locationState === true ? <input
                                                    type="text"
                                                    name="location"
                                                    placeholder="Enter location..."
                                                    value={location}
                                                    onChange={e => setLocation(e.target.value)}
                                                /> : null}
                    </div>
                    {vehicleState || locationState || dateState || timeState === true ?
                    <label className="cursor-pointer my-2 font-weight-bold text-danger" onClick={() => {
                                                                                      setVehicleState(false);
                                                                                      setLocationState(false);
                                                                                      setDateState(false);
                                                                                      setTimeState(false);
                                                                                      reset(); }}
                                                                                      >CLEAR ALL
                    </label> : null}
                </div>
            </div>

            {/*TABLE*/}
            <div className="d-inline-block bs-width mb-5">
            <div className="d-flex justify-content-between">
                <label className="font-weight-bold my-2">
                    {logs.length > 1 ? <p>{logs.length} Results</p> : <p>{logs.length} Result</p>}
                </label>
                {/* <div className="d-flex">
                    <label className="font-weight-bold mr-3 my-2">SORT BY</label>
                    <MultiSelect options={[{'value': '1', 'label': 'RELEVANCE'}]} />
                    </div>*/}
            </div>

            <table className="table text-center my-2 table-striped table-hover">
                <thead className="bg-success text-white">
                <tr>
                    <th></th>
                    <th>YY-MM</th>
                    <th>DATE</th>
                    <th>SHARD ID</th>
                    <th>SHARD PATH</th>
                    <th>LOCATION</th>
                </tr>
                </thead>
                <tbody>
                {logs.map((log, index) => (
                  <tr key={index+1} onClick={() => goToMap(log.log_name, log.shard_date)}>
                    <td>{index+1}</td>
                    <td>{log.log_name}</td>
                    <td>{log.shard_date}</td>
                    <td>{log.shard_id}</td>
                    <td>{log.shard_path}</td>
                    <td>{log.location}</td>
                  </tr>
                ))}
                </tbody>
            </table>
            {logs.length === 0 && <p className="text-center my-5">No Results Found</p>}
            </div>
        </Fragment>
    );
};

export default Home;
