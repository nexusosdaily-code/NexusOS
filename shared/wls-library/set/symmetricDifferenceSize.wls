WLS-MAP/1
MAP_SIZE ["leftSize","left"]
MAP_SIZE ["rightSize","right"]
CONST ["result",0]
CONST ["index",0]
:leftScan
LT ["more","index","leftSize"]
JTRUE ["more","leftCheck"]
CONST ["index",0]
JUMP ["rightScan"]
:leftCheck
MAP_KEY_AT ["key","left","index"]
MAP_HAS ["present","right","key"]
JTRUE ["present","leftNext"]
INC ["result"]
:leftNext
INC ["index"]
JUMP ["leftScan"]
:rightScan
LT ["more","index","rightSize"]
JTRUE ["more","rightCheck"]
RETURN ["result"]
:rightCheck
MAP_KEY_AT ["key","right","index"]
MAP_HAS ["present","left","key"]
JTRUE ["present","rightNext"]
INC ["result"]
:rightNext
INC ["index"]
JUMP ["rightScan"]
RETURN ["result"]
