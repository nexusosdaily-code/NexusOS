WLS-MAP/1
MAP_SIZE ["size","map"]
MAP_NEW ["result"]
MAP_HAS ["valid","result","value"]
CONST ["index",0]
CONST ["keeping",false]
:scan
LT ["more","index","size"]
JTRUE ["more","check"]
RETURN ["result"]
:check
MAP_KEY_AT ["key","map","index"]
MAP_GET ["payload","map","key"]
JTRUE ["keeping","copy"]
EQ ["matches","payload","value"]
JTRUE ["matches","begin"]
JUMP ["next"]
:begin
CONST ["keeping",true]
:copy
MAP_SET ["result","result","key","payload"]
:next
INC ["index"]
JUMP ["scan"]
RETURN ["result"]
