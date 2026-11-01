WLS-MAP/1
MAP_SIZE ["size","map"]
MAP_NEW ["seen"]
MAP_NEW ["result"]
CONST ["empty",""]
CONST ["index",0]
:scan
LT ["more","index","size"]
JTRUE ["more","check"]
RETURN ["result"]
:check
MAP_KEY_AT ["key","map","index"]
MAP_GET ["payload","map","key"]
MAP_HAS ["present","seen","payload"]
JTRUE ["present","next"]
MAP_SET ["seen","seen","payload","empty"]
MAP_SET ["result","result","key","payload"]
:next
INC ["index"]
JUMP ["scan"]
RETURN ["result"]
