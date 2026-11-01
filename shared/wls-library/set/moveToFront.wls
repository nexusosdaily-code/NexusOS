WLS-MAP/1
MAP_SIZE ["size","set"]
MAP_HAS ["present","set","value"]
MAP_NEW ["result"]
CONST ["payload",""]
CONST ["index",0]
JTRUE ["present","first"]
JUMP ["scan"]
:first
MAP_SET ["result","result","value","payload"]
:scan
LT ["more","index","size"]
JTRUE ["more","copy"]
RETURN ["result"]
:copy
MAP_KEY_AT ["key","set","index"]
MAP_SET ["result","result","key","payload"]
INC ["index"]
JUMP ["scan"]
RETURN ["result"]
