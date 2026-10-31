WLS-MAP/1
MAP_COPY ["result","left"]
MAP_SIZE ["size","right"]
CONST ["index",0]
:scan
LT ["more","index","size"]
JTRUE ["more","apply"]
RETURN ["result"]
:apply
MAP_KEY_AT ["key","right","index"]
MAP_GET ["value","right","key"]
MAP_SET ["result","result","key","value"]
INC ["index"]
JUMP ["scan"]
RETURN ["result"]
