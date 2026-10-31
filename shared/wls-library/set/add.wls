WLS-MAP/1
MAP_NEW ["result"]
CONST ["payload",""]
MAP_SIZE ["size","set"]
CONST ["index",0]
:scan
LT ["more","index","size"]
JTRUE ["more","copy"]
MAP_SET ["result","result","value","payload"]
RETURN ["result"]
:copy
MAP_KEY_AT ["key","set","index"]
MAP_SET ["result","result","key","payload"]
INC ["index"]
JUMP ["scan"]
RETURN ["result"]
