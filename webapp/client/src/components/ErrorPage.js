import React, { Fragment } from "react";
import { FaCode } from "react-icons/fa";

const ErrorPage = () => {

	return (
		<Fragment>
			<div className="mt-6 text-center align-items-center justify-content-center">
				<FaCode size={120} />
				<h1>404: PAGE NOT FOUND</h1>
				<p>Oops! We can't find the page you were looking for!</p>
			</div>
		</Fragment>
	)
};

export default ErrorPage;