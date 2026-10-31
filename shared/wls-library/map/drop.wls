WLS-MAP/1
MAP_SIZE ["size","map"]
CONST ["zero",0]
LT ["negative","count","zero"]
JTRUE ["negative","clamp"]
JUMP ["start"]
:clamp
CONST ["count",0]
:start
MAP_NEW ["result"]
CONST ["index",0]
:scan
LT ["more","index","size"]
JTRUE ["more","check"]
JUMP ["done"]
:check
LT ["skip","index","count"]
JTRUE ["skip","next"]
MAP_KEY_AT ["key","map","index"]
MAP_GET ["value","map","key"]
MAP_SET ["result","result","key","value"]
:next
INC ["index"]
JUMP ["scan"]
:done
RETURN ["result"]
