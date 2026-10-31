WLS-COLLECTION/1
// Fixed 20-item unrolling: no new opcode, decrement or host algorithm.
LIST_NEW ["result"]
LIST_LEN ["size","items"]
CONST ["index",19]
LT ["within","index","size"]
JTRUE ["within","a19"]
JUMP ["n19"]
:a19
LIST_AT ["item","items","index"]
LIST_PUSH ["result","item"]
:n19
CONST ["index",18]
LT ["within","index","size"]
JTRUE ["within","a18"]
JUMP ["n18"]
:a18
LIST_AT ["item","items","index"]
LIST_PUSH ["result","item"]
:n18
CONST ["index",17]
LT ["within","index","size"]
JTRUE ["within","a17"]
JUMP ["n17"]
:a17
LIST_AT ["item","items","index"]
LIST_PUSH ["result","item"]
:n17
CONST ["index",16]
LT ["within","index","size"]
JTRUE ["within","a16"]
JUMP ["n16"]
:a16
LIST_AT ["item","items","index"]
LIST_PUSH ["result","item"]
:n16
CONST ["index",15]
LT ["within","index","size"]
JTRUE ["within","a15"]
JUMP ["n15"]
:a15
LIST_AT ["item","items","index"]
LIST_PUSH ["result","item"]
:n15
CONST ["index",14]
LT ["within","index","size"]
JTRUE ["within","a14"]
JUMP ["n14"]
:a14
LIST_AT ["item","items","index"]
LIST_PUSH ["result","item"]
:n14
CONST ["index",13]
LT ["within","index","size"]
JTRUE ["within","a13"]
JUMP ["n13"]
:a13
LIST_AT ["item","items","index"]
LIST_PUSH ["result","item"]
:n13
CONST ["index",12]
LT ["within","index","size"]
JTRUE ["within","a12"]
JUMP ["n12"]
:a12
LIST_AT ["item","items","index"]
LIST_PUSH ["result","item"]
:n12
CONST ["index",11]
LT ["within","index","size"]
JTRUE ["within","a11"]
JUMP ["n11"]
:a11
LIST_AT ["item","items","index"]
LIST_PUSH ["result","item"]
:n11
CONST ["index",10]
LT ["within","index","size"]
JTRUE ["within","a10"]
JUMP ["n10"]
:a10
LIST_AT ["item","items","index"]
LIST_PUSH ["result","item"]
:n10
CONST ["index",9]
LT ["within","index","size"]
JTRUE ["within","a9"]
JUMP ["n9"]
:a9
LIST_AT ["item","items","index"]
LIST_PUSH ["result","item"]
:n9
CONST ["index",8]
LT ["within","index","size"]
JTRUE ["within","a8"]
JUMP ["n8"]
:a8
LIST_AT ["item","items","index"]
LIST_PUSH ["result","item"]
:n8
CONST ["index",7]
LT ["within","index","size"]
JTRUE ["within","a7"]
JUMP ["n7"]
:a7
LIST_AT ["item","items","index"]
LIST_PUSH ["result","item"]
:n7
CONST ["index",6]
LT ["within","index","size"]
JTRUE ["within","a6"]
JUMP ["n6"]
:a6
LIST_AT ["item","items","index"]
LIST_PUSH ["result","item"]
:n6
CONST ["index",5]
LT ["within","index","size"]
JTRUE ["within","a5"]
JUMP ["n5"]
:a5
LIST_AT ["item","items","index"]
LIST_PUSH ["result","item"]
:n5
CONST ["index",4]
LT ["within","index","size"]
JTRUE ["within","a4"]
JUMP ["n4"]
:a4
LIST_AT ["item","items","index"]
LIST_PUSH ["result","item"]
:n4
CONST ["index",3]
LT ["within","index","size"]
JTRUE ["within","a3"]
JUMP ["n3"]
:a3
LIST_AT ["item","items","index"]
LIST_PUSH ["result","item"]
:n3
CONST ["index",2]
LT ["within","index","size"]
JTRUE ["within","a2"]
JUMP ["n2"]
:a2
LIST_AT ["item","items","index"]
LIST_PUSH ["result","item"]
:n2
CONST ["index",1]
LT ["within","index","size"]
JTRUE ["within","a1"]
JUMP ["n1"]
:a1
LIST_AT ["item","items","index"]
LIST_PUSH ["result","item"]
:n1
CONST ["index",0]
LT ["within","index","size"]
JTRUE ["within","a0"]
JUMP ["n0"]
:a0
LIST_AT ["item","items","index"]
LIST_PUSH ["result","item"]
:n0
RETURN ["result"]
