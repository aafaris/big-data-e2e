import React, { Fragment, useState } from 'react';
import TimePicker from 'react-time-picker';

const TimeSelect = () => {
    const [value, onChange] = useState('10:00');

    return (
      <Fragment>
          <TimePicker onChange={onChange} value={value} />
      </Fragment>
    );
}

export default TimeSelect;
