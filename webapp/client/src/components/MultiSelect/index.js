import React, {useState} from "react";
import Select from 'react-select';

const MultiSelect = ({options}) => {

  const [selectedOption, setSelectedOption] = useState(null);
  const[vehicle, setVehicle] = useState(options);

  // handle onChange event of the dropdown
  const handleChange = e => {
    var stringData = e.map(item => item.label).reduce(i => {
      return `${i}`
    });
    setSelectedOption(e);
  };

  return (
    <div>
      <Select
        isMulti
        placeholder="Select..."
        value={selectedOption} 
        options={options} // list of the data
        onChange={handleChange} // assign onChange function
      />
    </div>
  );
}

export default MultiSelect;