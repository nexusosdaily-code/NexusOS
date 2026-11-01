WLS-MAP/1
MAP_SIZE ["size","map"]
LT ["valid","count","count"]
CONST ["lead",0]
:advance
LT ["more","lead","count"]
JTRUE ["more","bounded"]
JUMP ["start"]
:bounded
LT ["within","lead","size"]
JTRUE ["within","advanceNext"]
JUMP ["start"]
:advanceNext
INC ["lead"]
JUMP ["advance"]
:start
CONST ["limit",0]
:offset
LT ["more","lead","size"]
JTRUE ["more","skip"]
MAP_NEW ["result"]
CONST ["index",0]
JUMP ["scan"]
:skip
INC ["lead"]
INC ["limit"]
JUMP ["offset"]
:scan
LT ["more","index","limit"]
JTRUE ["more","copy"]
RETURN ["result"]
:copy
MAP_KEY_AT ["key","map","index"]
MAP_GET ["payload","map","key"]
MAP_SET ["result","result","key","payload"]
INC ["index"]
JUMP ["scan"]
RETURN ["result"]
