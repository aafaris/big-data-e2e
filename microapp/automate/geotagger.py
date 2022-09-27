import requests
from pyproj import Proj


class GeoTagger:
    def __init__(self):
        pass

    def utmToAddress(self, lon, lat):
        """ converts UTM to an address using free online API
        :param x: x coordinates
        :param y: y coordinates
        :param utm: the zone to take reference from
        :return: the address of the location as string
        """

        query = 'http://nominatim.openstreetmap.org/reverse?format=json'
        query += '&lat=' + str(lat) + '&lon=' + str(lon)
        result = requests.get(query)
        address = result.json()['display_name']

        return address

    def utmToLatLong(self, x, y, utm='48N'):

        proj = Proj(proj='utm', zone=utm, ellps='WGS84', preserve_units=False)
        lon, lat = proj(x, y, inverse=True)

        return (lon, lat)
