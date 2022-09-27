import { useEffect, useRef } from "react";
import { useLeafletContext } from "@react-leaflet/core";
import "@geoman-io/leaflet-geoman-free";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";

const Geoman = ({ setProps, setPoints }) => {

  const context = useLeafletContext();
  const segment = useRef();
  var postals = [];

  const queryArea = (coords) => {
    try {
        var url = "https://nominatim.openstreetmap.org/reverse?format=json";

        // REVERSE GEOCODE FROM LATLNG TO ADDRESS
        if (coords.length === 1) {
          // Rectangle - 5 Sets of Coordinates
          for (let i=0; i<coords[0].length; i++) {
            reverseGeocode(url + '&lat=' + String(coords[0][i][1]) + '&lon=' + String(coords[0][i][0]));
          }
        } else {
          // Circle - 1 Set of Coordinates
          reverseGeocode(url + '&lat=' + String(coords[1]) + '&lon=' + String(coords[0]));
        }

    } catch(err) {
      console.error(err.message);
    }
  }

  const reverseGeocode = async(url) => {

      // METHOD 1
      // const xhr = new XMLHttpRequest();
      // xhr.onreadystatechange = function () {
      //   if (xhr.status === 200 && xhr.readyState === 4) {
      //     var locationArray = JSON.parse(xhr.responseText)['display_name'].split(", ");
      //     var id = locationArray[locationArray.length-2];
      //     console.log(id);
      //     // FILTER INTO UNIQUE POSTAL CODE
      //     if (!postals.includes(id)) {
      //       postals.push(id);
      //     }
      //   }
      // }

      // xhr.open('GET', url);
      // xhr.send();

      // METHOD 2
      fetch(url)
      .then(res => res.json())
      .then((out) => {
        var loc = out['display_name'].split(", ");
        var id = loc[loc.length-2];
        console.log(id);
        // FILTER INTO UNIQUE POSTAL CODE
        if (!postals.includes(id)) {
          postals.push(id);
        }
      })
      .catch(err => { throw err });
  }

  const getRouteFromPostal = async() => {
    // 5s delay to complete all http request
    await wait(5000);

    var httpExtension = "http://localhost:5000/map?";
    console.log(postals.length);
    // example: http://localhost:5000/map?postal=618310&postal=666666
    if (postals.length === 1) httpExtension += `postal=${postals[0]}`;
    else {
      for (let i=0; i<postals.length; i++) {
        httpExtension += `postal=${postals[i]}`;
        if (i !== postals.length-1) httpExtension += "&";
      }
    }

    console.log(httpExtension);
    // QUERY LOG NAME VIA LOCATION FROM POSTALCODE
    const response = await fetch(httpExtension);
    const routes = await response.json();
    setProps(routes);
    alert("Searching Route in Drawn Area Complete!");
  }

  // delay function
  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms))


  useEffect(() => {
    const leafletContainer = context.layerContainer || context.map;

    leafletContainer.pm.addControls({
      drawMarker: false,
      drawPolygon: false,
      drawPolyline: false,
      rotateMode: false,
      drawText: false,
      drawCircleMarker: false,
      editMode: false,
      dragMode: false,
      cutPolygon: false
    });

    leafletContainer.pm.setGlobalOptions({ pmIgnore: false });

    leafletContainer.on('pm:drawstart', ({ workingLayer }) => {
      if (segment.current === undefined) return;

      segment.current.layer.pm.remove();
      // const drawLayer = leafletContainer.pm.getGeomanDrawLayers(true);
      // console.log('layers', drawLayer);

      // workingLayer.on('pm:vertexadded', (e) => {
      //   console.log(e);
      // });
    });

    leafletContainer.on("pm:create", (e) => {
      if (e.layer && e.layer.pm) {
        const shape = e.layer.pm.getShape();
        segment.current = e;

        console.log(`object created: ${shape}`);

        // enable editing
        // e.layer.pm.enable();

        // console.log('geojson', leafletContainer.pm.getGeomanLayers(true).toGeoJSON());
        const areaCoords = leafletContainer.pm.getGeomanDrawLayers(true).toGeoJSON().features[0].geometry.coordinates;

        // Circle - 1 Set of Coordinates
        if (shape === "Circle") {
          queryArea(areaCoords);
        }
        // Rectangle - 5 Sets of Coordinates
        else {
          queryArea(areaCoords);
        }

        // QUERY POSTAL CODES FROM DATABASE
        getRouteFromPostal();


        leafletContainer.pm
          .getGeomanLayers()
          .map((layer, index) => layer.bindPopup(`I am figure N° ${index}`));

        // edit event
        // e.layer.on("pm:edit", (e) => {
          // const event = e;
          // console.log("on edit", e);
        // });
      }
    });

    leafletContainer.on("pm:remove", (e) => {
      // reset drawn area
      postals = [];
      setProps([]);
      setPoints([]);
      console.log(`object ${e.layer.pm.getShape()} removed`);
    });

    return () => {
      leafletContainer.pm.removeControls();
      leafletContainer.pm.setGlobalOptions({ pmIgnore: true });
    };
  }, [context]);

  return null;
};


export default Geoman;
