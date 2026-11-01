WLS-MAP/1
MAP_HAS ["hasFirst","map","first"]
MAP_HAS ["hasSecond","map","second"]
MAP_COPY ["result","map"]
JTRUE ["hasFirst","checkSecond"]
RETURN ["result"]
:checkSecond
JTRUE ["hasSecond","swap"]
RETURN ["result"]
:swap
MAP_GET ["firstValue","map","first"]
MAP_GET ["secondValue","map","second"]
MAP_SET ["result","result","first","secondValue"]
MAP_SET ["result","result","second","firstValue"]
RETURN ["result"]
