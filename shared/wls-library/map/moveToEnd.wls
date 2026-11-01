WLS-MAP/1
MAP_SIZE ["size","map"]
MAP_HAS ["present","map","key"]
MAP_NEW ["result"]
CONST ["index",0]
:scan
LT ["more","index","size"]
JTRUE ["more","copy"]
JTRUE ["present","append"]
RETURN ["result"]
:append
MAP_GET ["payload","map","key"]
MAP_SET ["result","result","key","payload"]
RETURN ["result"]
:copy
MAP_KEY_AT ["item","map","index"]
EQ ["matches","item","key"]
JTRUE ["matches","next"]
MAP_GET ["payload","map","item"]
MAP_SET ["result","result","item","payload"]
:next
INC ["index"]
JUMP ["scan"]
RETURN ["result"]
