WLS-MAP/1
MAP_SIZE ["size","set"]
LT ["validated","offset","offset"]
LT ["validated","count","count"]
MAP_NEW ["result"]
CONST ["payload",""]
CONST ["index",0]
CONST ["selected",0]
:scan
LT ["more","index","size"]
JTRUE ["more","check"]
RETURN ["result"]
:check
LT ["skip","index","offset"]
JTRUE ["skip","next"]
LT ["wanted","selected","count"]
JTRUE ["wanted","copy"]
RETURN ["result"]
:copy
MAP_KEY_AT ["key","set","index"]
MAP_SET ["result","result","key","payload"]
INC ["selected"]
:next
INC ["index"]
JUMP ["scan"]
RETURN ["result"]
