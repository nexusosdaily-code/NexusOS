WLS-MAP/1
MAP_SIZE ["size","map"]
MAP_NEW ["probe"]
MAP_HAS ["valid","probe","value"]
MAP_NEW ["result"]
CONST ["removed",false]
CONST ["index",0]
:scan
LT ["more","index","size"]
JTRUE ["more","check"]
RETURN ["result"]
:check
MAP_KEY_AT ["key","map","index"]
MAP_GET ["payload","map","key"]
JTRUE ["removed","copy"]
EQ ["matches","payload","value"]
JTRUE ["matches","remove"]
:copy
MAP_SET ["result","result","key","payload"]
JUMP ["next"]
:remove
CONST ["removed",true]
:next
INC ["index"]
JUMP ["scan"]
RETURN ["result"]
