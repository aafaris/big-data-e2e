import React, { Fragment } from "react";
import { Routes, Route } from 'react-router-dom';
import './App.css';

import NavBar from './components/NavBar/NavBar';
import Home from './components/Home';
import Map from './components/Map';
import ErrorPage from './components/ErrorPage';

function App() {

  return (
    <Fragment>
      <NavBar />
      <div className="container text-center">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/map" element={<Map />} />
          <Route path="/map/:logId/:dayId" element={<Map/>} />
          <Route path="*" element={<ErrorPage />} />
        </Routes>
      </div>
    </Fragment>
  );
}

export default App;