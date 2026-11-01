WLS-MAP/1
MAP_SIZE ["size","map"]
MAP_SIZE ["rightSize","right"]
MAP_NEW ["result"]
CONST ["index",0]
CONST ["keeping",false]
:scan
LT ["more","index","size"]
JTRUE ["more","check"]
RETURN ["result"]
:check
MAP_KEY_AT ["key","map","index"]
JTRUE ["keeping","copy"]
MAP_HAS ["present","right","key"]
JTRUE ["present","next"]
CONST ["keeping",true]
:copy
MAP_GET ["payload","map","key"]
MAP_SET ["result","result","key","payload"]
:next
INC ["index"]
JUMP ["scan"]
RETURN ["result"]
