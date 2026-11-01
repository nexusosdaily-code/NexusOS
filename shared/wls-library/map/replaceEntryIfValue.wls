WLS-MAP/1
MAP_SIZE ["size","map"]
MAP_HAS ["present","map","key"]
MAP_NEW ["probe"]
MAP_HAS ["valid","probe","expected"]
MAP_HAS ["valid","probe","replacement"]
MAP_COPY ["result","map"]
JTRUE ["present","check"]
RETURN ["result"]
:check
MAP_GET ["payload","map","key"]
EQ ["matches","payload","expected"]
JTRUE ["matches","replace"]
RETURN ["result"]
:replace
MAP_SET ["result","result","key","replacement"]
RETURN ["result"]
