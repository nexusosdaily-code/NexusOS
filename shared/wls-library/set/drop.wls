WLS-MAP/1
MAP_SIZE ["size","set"]
CONST ["zero",0]
LT ["negative","count","zero"]
JTRUE ["negative","clamp"]
JUMP ["start"]
:clamp
CONST ["count",0]
:start
MAP_NEW ["result"]
CONST ["payload",""]
CONST ["index",0]
:scan
LT ["more","index","size"]
JTRUE ["more","check"]
JUMP ["done"]
:check
LT ["skip","index","count"]
JTRUE ["skip","next"]
MAP_KEY_AT ["key","set","index"]
MAP_SET ["result","result","key","payload"]
:next
INC ["index"]
JUMP ["scan"]
:done
RETURN ["result"]
