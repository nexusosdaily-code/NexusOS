WLS-MAP/1
MAP_SIZE ["size","map"]
MAP_HAS ["present","map","key"]
MAP_NEW ["result"]
CONST ["index",0]
JTRUE ["present","first"]
JUMP ["scan"]
:first
MAP_GET ["payload","map","key"]
MAP_SET ["result","result","key","payload"]
:scan
LT ["more","index","size"]
JTRUE ["more","copy"]
RETURN ["result"]
:copy
MAP_KEY_AT ["item","map","index"]
MAP_GET ["payload","map","item"]
MAP_SET ["result","result","item","payload"]
INC ["index"]
JUMP ["scan"]
RETURN ["result"]
