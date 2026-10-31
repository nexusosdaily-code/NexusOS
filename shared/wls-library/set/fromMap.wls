WLS-MAP/1
MAP_NEW ["result"]
CONST ["payload",""]
MAP_SIZE ["size","map"]
CONST ["index",0]
:scan
LT ["more","index","size"]
JTRUE ["more","copy"]
RETURN ["result"]
:copy
MAP_KEY_AT ["key","map","index"]
MAP_SET ["result","result","key","payload"]
INC ["index"]
JUMP ["scan"]
RETURN ["result"]
