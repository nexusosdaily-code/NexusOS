WLS-MAP/1
MAP_SIZE ["size","left"]
MAP_SIZE ["otherSize","right"]
EQ ["equal","size","otherSize"]
JTRUE ["equal","start"]
RETURN ["equal"]
:start
CONST ["index",0]
:scan
LT ["more","index","size"]
JTRUE ["more","check"]
CONST ["equal",true]
RETURN ["equal"]
:check
MAP_KEY_AT ["key","left","index"]
MAP_KEY_AT ["other","right","index"]
EQ ["equal","key","other"]
JTRUE ["equal","values"]
RETURN ["equal"]
:values
MAP_GET ["payload","left","key"]
MAP_GET ["otherPayload","right","other"]
EQ ["equal","payload","otherPayload"]
JTRUE ["equal","next"]
RETURN ["equal"]
:next
INC ["index"]
JUMP ["scan"]
RETURN ["equal"]
