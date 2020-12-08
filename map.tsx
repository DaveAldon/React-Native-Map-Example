import React, { useRef, useEffect, useState, useCallback } from "react";
import { StyleSheet, ScrollView, RefreshControl } from "react-native";
import { View } from "../components/Themed";
import MapView, { LatLng, Polyline } from "react-native-maps";
import * as Location from "expo-location";
import theme from "../theme";
import enums from "../enums";
import { env } from "../env";
import axios from "axios";

interface IProps {
  route: {
    params: {
      shipmentID: string;
    };
  };
}

interface IShipmentData {
  stops: Array<any>;
  shipmentStatusId: number;
}

export default function LoadDetailsScreen(props: IProps) {
  // This isn't used in this sample, but it's necessary to get the shipment details in a separate api call
  const { shipmentID } = props.route.params;

  // Shipment states
  const [refreshing, setRefreshing] = useState(false);
  const [load, setLoadDetail] = useState<IShipmentData>();

  // Map states
  const mapRef = useRef(null);
  const [pcmilerPaths, setPcmilerPaths] = useState(Array<LatLng>());
  const [location, setLocation] = useState<Location.LocationObject>();

  // Map settings
  const padding = 0.5;
  const mapHeight = 300;

  // Gets the current location of the phone
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestPermissionsAsync();
      if (status !== "granted") {
        alert("You must give this app permission to use your location in order for the directions to be accurate.");
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest });
      setLocation(location);
    })();
  }, [refreshing]);

  // For the sake of keeping this code sample simple and focused on the map functionality, this useEffect
  // assumes that it retrieved shipment data from a separate api, based on shipmentID
  useEffect(() => {
    // This object is where the shipment data from an api would go
    const data: IShipmentData = {
      stops: [], // This array would hold lots of information about each stop inside a shipment
      shipmentStatusId: 0,
    };

    setLoadDetail(data);

    const firstStopCoords = { latitude: 0, longitude: 0 };
    const secondStopCoords = { latitude: 0, longitude: 0 };
    if (data) {
      for (let i = 0; i < data.stops.length; i++) {
        const stop = data.stops[i];
        if (stop.status === enums.STOPSTATUS.COMPLETE || data.shipmentStatusId === enums.SHIPMENTSTATUS.Delivered || data.shipmentStatusId === enums.SHIPMENTSTATUS.DeliveryConfirmed) {
          continue;
        } else {
          // If it fails all of the conditions, that means we found the first stop. And the next element is always the second stop.
          try {
            firstStopCoords.latitude = stop.latitude;
            firstStopCoords.longitude = stop.longitude;

            const secondStop = data.stops[i + 1];
            secondStopCoords.latitude = secondStop.latitude;
            secondStopCoords.longitude = secondStop.longitude;

            getPolylines(firstStopCoords, secondStopCoords);
          } catch {
            // If this fails, the coordinates were improperly retrived/returned on the backend, or there isn't a second stop.
            // This simply doesn't show the lines, then, because there won't be any to show.
          }
          break;
        }
      }
    }
  }, [refreshing]);

  // Send coords to PCMiler, which returns a pile of coordinates that draw a path
  const getPolylines = async (stop1: { latitude: number; longitude: number }, stop2: { latitude: number; longitude: number }) => {
    const coords = {
      lat1: stop1.latitude,
      long1: stop1.longitude,
      lat2: stop2.latitude,
      long2: stop2.longitude,
    };
    GetPCMilerPolylines(
      coords,
      (response: any) => {
        let PCMilerCoords: { latitude: any; longitude: any }[] = [];
        const unformatted = response.data.geometry.coordinates[0];

        unformatted.forEach((coord: any) => {
          PCMilerCoords.push({ latitude: coord[1], longitude: coord[0] });
        });
        setPcmilerPaths(PCMilerCoords);
      },
      (error: string) => {
        Analytics.logEvent(Analytics.EVENTS.ERROR, {
          error: error,
        });
      },
    );
  };

  // User pull-down refreshing handler
  const onRefresh = useCallback(() => {
    let isSubscribed = true;
    if (isSubscribed) {
      setRefreshing(true);
    }
    return () => (isSubscribed = false);
  }, []);

  return (
    <View style={styles.parentView}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              onRefresh();
            }}
          />
        }
      >
        <View style={styles.mapParent}>
          <MapView
            showsUserLocation={true}
            style={{ height: mapHeight }}
            ref={mapRef}
            initialRegion={paddedRegion(
              [
                { latitude: load.stops[0].latitude, longitude: load.stops[0].longitude },
                { latitude: load.stops[1].latitude, longitude: load.stops[1].longitude },
                { latitude: location?.coords.latitude, longitude: location?.coords.longitude },
              ],
              padding,
            )}
          >
            <Polyline coordinates={pcmilerPaths} strokeColor={theme.COLORS.PINK} strokeWidth={3} />
          </MapView>
        </View>
      </ScrollView>
    </View>
  );
}

async function GetPCMilerPolylines(coords: any, callback: any, errorCallback: any) {
  const config = {
    method: "get",
    url: `${env.PCMILER_URL}Service.svc/route/routepath?stops=${coords.long1}%2C${coords.lat1}%3B${coords.long2}%2C${coords.lat2}&avoidTolls=false&hubRouting=false&vehHeight=13%276%22&vehLength=53%27&vehWeight=80000&routeOpt=None&routeType=Practical&vehType=Truck&overrideClass=NationalNetwork&axles=5&vehDimUnits=English&openBorders=true&LCV=false&hwyOnly=false&useSites=false&distUnits=Miles&overrideRestrict=false&vehWidth=96%22&region=NA&dataset=Current`,
    headers: {
      Authorization: env.PCMILER_API_KEY,
    },
  };
  axios(config)
    .then(function (response) {
      callback(response);
    })
    .catch(function (error) {
      ReportError(config, error);
      errorCallback(error);
    });
}

function ReportError(config: any, error: any) {
  Analytics.logEvent(Analytics.EVENTS.ERROR, {
    errorInfo: config,
    error: error,
  });
}

// Calculates the delta coords so that there can be some padding on the initial region
// Logic from https://stackoverflow.com/questions/32557474/how-to-calculate-delta-latitude-and-longitude-for-mapview-component-in-react-nat
const paddedRegion = (points: any[], padding: number) => {
  let minLat: number, maxLat: number, minLng: number, maxLng: number;

  // Init first point
  ((point) => {
    minLat = point.latitude;
    maxLat = point.latitude;
    minLng = point.longitude;
    maxLng = point.longitude;
  })(points[0]);

  // Calculate rectangle
  points.forEach((point: { latitude: number; longitude: number }) => {
    minLat = Math.min(minLat, point.latitude);
    maxLat = Math.max(maxLat, point.latitude);
    minLng = Math.min(minLng, point.longitude);
    maxLng = Math.max(maxLng, point.longitude);
  });

  const midLat = (minLat + maxLat) / 2;
  const midLng = (minLng + maxLng) / 2;

  const deltaLatitiude = maxLat - minLat + padding;
  const deltaLongitude = maxLng - minLng + padding;

  return {
    latitude: midLat,
    longitude: midLng,
    deltaLatitiude: deltaLatitiude,
    deltaLongitude: deltaLongitude,
  };
};

const styles = StyleSheet.create({
  parentView: {
    flex: 1,
    backgroundColor: theme.COLORS.DARKEST,
    paddingTop: 50,
  },
  mapParent: {
    flex: 1,
    backgroundColor: theme.COLORS.DARKEST,
  },
});
