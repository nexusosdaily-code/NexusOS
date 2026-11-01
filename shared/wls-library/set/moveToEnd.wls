WLS-MAP/1
MAP_SIZE ["size","set"]
MAP_HAS ["present","set","value"]
MAP_NEW ["result"]
CONST ["payload",""]
CONST ["index",0]
:scan
LT ["more","index","size"]
JTRUE ["more","copy"]
JTRUE ["present","append"]
RETURN ["result"]
:append
MAP_SET ["result","result","value","payload"]
RETURN ["result"]
:copy
MAP_KEY_AT ["key","set","index"]
EQ ["matches","key","value"]
JTRUE ["matches","next"]
MAP_SET ["result","result","key","payload"]
:next
INC ["index"]
JUMP ["scan"]
RETURN ["result"]
