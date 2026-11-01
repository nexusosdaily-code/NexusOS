WLS-MAP/1
MAP_SIZE ["size","map"]
MAP_NEW ["last"]
CONST ["index",0]
:remember
LT ["more","index","size"]
JTRUE ["more","save"]
MAP_NEW ["result"]
CONST ["index",0]
JUMP ["scan"]
:save
MAP_KEY_AT ["key","map","index"]
MAP_GET ["payload","map","key"]
MAP_SET ["last","last","payload","key"]
INC ["index"]
JUMP ["remember"]
:scan
LT ["more","index","size"]
JTRUE ["more","check"]
RETURN ["result"]
:check
MAP_KEY_AT ["key","map","index"]
MAP_GET ["payload","map","key"]
MAP_GET ["lastKey","last","payload"]
EQ ["matches","key","lastKey"]
JTRUE ["matches","copy"]
JUMP ["next"]
:copy
MAP_SET ["result","result","key","payload"]
:next
INC ["index"]
JUMP ["scan"]
RETURN ["result"]
