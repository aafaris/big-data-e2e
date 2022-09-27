import React, { Fragment, useState } from "react";


const DatePicker = () => {

    const [date, setDate] = useState();

    console.log(date);

    return(
        <Fragment>
            <input type="date" onChange={e => setDate(e.target.value)} />
        </Fragment>
    );
}

export default DatePicker;