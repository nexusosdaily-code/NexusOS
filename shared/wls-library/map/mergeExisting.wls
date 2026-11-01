WLS-MAP/1
MAP_SIZE ["leftSize","left"]
MAP_SIZE ["rightSize","right"]
MAP_COPY ["result","left"]
CONST ["index",0]
:scan
LT ["more","index","rightSize"]
JTRUE ["more","check"]
RETURN ["result"]
:check
MAP_KEY_AT ["key","right","index"]
MAP_HAS ["present","left","key"]
JTRUE ["present","replace"]
JUMP ["next"]
:replace
MAP_GET ["payload","right","key"]
MAP_SET ["result","result","key","payload"]
:next
INC ["index"]
JUMP ["scan"]
RETURN ["result"]
