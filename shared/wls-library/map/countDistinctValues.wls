WLS-MAP/1
MAP_SIZE ["size","map"]
MAP_NEW ["seen"]
CONST ["empty",""]
CONST ["index",0]
:scan
LT ["more","index","size"]
JTRUE ["more","remember"]
MAP_SIZE ["result","seen"]
RETURN ["result"]
:remember
MAP_KEY_AT ["key","map","index"]
MAP_GET ["payload","map","key"]
MAP_SET ["seen","seen","payload","empty"]
INC ["index"]
JUMP ["scan"]
RETURN ["result"]
