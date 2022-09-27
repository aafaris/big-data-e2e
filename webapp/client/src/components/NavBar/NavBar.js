import React, { Fragment } from "react";
import "./NavBar.css";
import { Link } from "react-router-dom";

const NavBar = () => {
    return (
        <Fragment>
            <nav className="navbar">
                <Link to="/" className='navbar_item'>HOME</Link>
                <Link to="/map" className='navbar_item'>VIEW MAP</Link>
            </nav>
        </Fragment>
    );
};

export default NavBar;