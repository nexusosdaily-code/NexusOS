WLS-MAP/1
MAP_SIZE ["size","map"]
MAP_HAS ["present","map","key"]
MAP_NEW ["probe"]
MAP_HAS ["valid","probe","expected"]
MAP_COPY ["result","map"]
JTRUE ["present","check"]
RETURN ["result"]
:check
MAP_GET ["payload","map","key"]
EQ ["matches","payload","expected"]
JTRUE ["matches","delete"]
RETURN ["result"]
:delete
MAP_DELETE ["result","result","key"]
RETURN ["result"]
