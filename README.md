# KDB client in NodeJS

The interface is promise-based which makes pushing data from web services
easier:

    khp=require("qnode")
    k = new khp("0", "5000");
    k.k("1+1").then(console.log);

