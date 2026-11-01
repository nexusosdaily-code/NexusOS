WLS-MAP/1
MAP_SIZE ["size","map"]
MAP_NEW ["seen"]
CONST ["empty",""]
CONST ["index",0]
CONST ["result",false]
:scan
LT ["more","index","size"]
JTRUE ["more","check"]
RETURN ["result"]
:check
MAP_KEY_AT ["key","map","index"]
MAP_GET ["payload","map","key"]
MAP_HAS ["present","seen","payload"]
JTRUE ["present","duplicate"]
MAP_SET ["seen","seen","payload","empty"]
INC ["index"]
JUMP ["scan"]
:duplicate
CONST ["result",true]
RETURN ["result"]
