WLS-MAP/1
MAP_SIZE ["size","map"]
MAP_NEW ["probe"]
MAP_HAS ["valid","probe","value"]
CONST ["index",0]
CONST ["present",false]
CONST ["last",""]
:find
LT ["more","index","size"]
JTRUE ["more","check"]
MAP_NEW ["result"]
CONST ["index",0]
JUMP ["scan"]
:check
MAP_KEY_AT ["key","map","index"]
MAP_GET ["payload","map","key"]
EQ ["matches","payload","value"]
JTRUE ["matches","remember"]
JUMP ["findNext"]
:remember
CONST ["present",true]
MAP_KEY_AT ["last","map","index"]
:findNext
INC ["index"]
JUMP ["find"]
:scan
LT ["more","index","size"]
JTRUE ["more","copyCheck"]
RETURN ["result"]
:copyCheck
MAP_KEY_AT ["key","map","index"]
JTRUE ["present","compare"]
JUMP ["copy"]
:compare
EQ ["matches","key","last"]
JTRUE ["matches","next"]
:copy
MAP_GET ["payload","map","key"]
MAP_SET ["result","result","key","payload"]
:next
INC ["index"]
JUMP ["scan"]
RETURN ["result"]
