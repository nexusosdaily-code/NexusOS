WLS-MAP/1
MAP_SIZE ["size","map"]
MAP_SIZE ["rightSize","right"]
MAP_NEW ["result"]
MAP_HAS ["valid","result","fallback"]
CONST ["index",0]
:scan
LT ["more","index","size"]
JTRUE ["more","check"]
RETURN ["result"]
:check
MAP_KEY_AT ["key","map","index"]
MAP_GET ["payload","map","key"]
MAP_HAS ["present","right","payload"]
JTRUE ["present","translate"]
MAP_SET ["result","result","key","fallback"]
JUMP ["next"]
:translate
MAP_GET ["payload","right","payload"]
MAP_SET ["result","result","key","payload"]
:next
INC ["index"]
JUMP ["scan"]
RETURN ["result"]
