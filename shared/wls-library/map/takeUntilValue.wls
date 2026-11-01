WLS-MAP/1
MAP_SIZE ["size","map"]
MAP_NEW ["result"]
MAP_HAS ["valid","result","value"]
CONST ["index",0]
:scan
LT ["more","index","size"]
JTRUE ["more","check"]
RETURN ["result"]
:check
MAP_KEY_AT ["key","map","index"]
MAP_GET ["payload","map","key"]
EQ ["matches","payload","value"]
JTRUE ["matches","done"]
MAP_SET ["result","result","key","payload"]
INC ["index"]
JUMP ["scan"]
:done
RETURN ["result"]
