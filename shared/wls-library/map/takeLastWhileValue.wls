WLS-MAP/1
MAP_SIZE ["size","map"]
MAP_NEW ["result"]
MAP_HAS ["valid","result","value"]
CONST ["index",0]
CONST ["cut",0]
:find
LT ["more","index","size"]
JTRUE ["more","check"]
JUMP ["scan"]
:check
MAP_KEY_AT ["key","map","index"]
MAP_GET ["payload","map","key"]
INC ["index"]
EQ ["matches","payload","value"]
JTRUE ["matches","find"]
:advanceCut
LT ["more","cut","index"]
JTRUE ["more","step"]
JUMP ["find"]
:step
INC ["cut"]
JUMP ["advanceCut"]
:scan
LT ["more","cut","size"]
JTRUE ["more","copy"]
RETURN ["result"]
:copy
MAP_KEY_AT ["key","map","cut"]
MAP_GET ["payload","map","key"]
MAP_SET ["result","result","key","payload"]
INC ["cut"]
JUMP ["scan"]
RETURN ["result"]
