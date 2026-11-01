WLS-MAP/1
MAP_SIZE ["size","map"]
MAP_NEW ["probe"]
MAP_HAS ["valid","probe","value"]
MAP_NEW ["result"]
CONST ["index",0]
CONST ["dropping",true]
:scan
LT ["more","index","size"]
JTRUE ["more","check"]
RETURN ["result"]
:check
MAP_KEY_AT ["key","map","index"]
MAP_GET ["payload","map","key"]
JTRUE ["dropping","compare"]
JUMP ["copy"]
:compare
EQ ["matches","payload","value"]
JTRUE ["matches","next"]
CONST ["dropping",false]
:copy
MAP_SET ["result","result","key","payload"]
:next
INC ["index"]
JUMP ["scan"]
RETURN ["result"]
