WLS-MAP/1
MAP_SIZE ["size","map"]
MAP_SIZE ["rightSize","right"]
MAP_NEW ["result"]
CONST ["index",0]
CONST ["cut",0]
:find
LT ["more","index","size"]
JTRUE ["more","check"]
CONST ["index",0]
JUMP ["scan"]
:check
MAP_KEY_AT ["key","map","index"]
MAP_HAS ["present","right","key"]
INC ["index"]
JTRUE ["present","find"]
:advanceCut
LT ["more","cut","index"]
JTRUE ["more","step"]
JUMP ["find"]
:step
INC ["cut"]
JUMP ["advanceCut"]
:scan
LT ["more","index","cut"]
JTRUE ["more","copy"]
RETURN ["result"]
:copy
MAP_KEY_AT ["key","map","index"]
MAP_GET ["payload","map","key"]
MAP_SET ["result","result","key","payload"]
INC ["index"]
JUMP ["scan"]
RETURN ["result"]
