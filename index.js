c=require("./c.js"),net=require("net"),events=require("events"),Promise=require("bluebird"), memcpy=require("memcpy"),util=require("util");

function khp(h,p, auth){
  if(!(this instanceof khp)) return new khp(h,p,auth);
  events.EventEmitter.call(this);

  var self = this;
  self.tasks = [];
  self.socket = net.connect(p,h, function(err) { if(err !== undefined && err !== null) oops(err); });

  if(auth === undefined) auth = "anonymous"; else if (typeof auth === "object") auth = auth.u + ":" + auth.p;
  (function() {var n=Buffer.byteLength(auth),b=new Buffer(n+2);b.write(auth,0,n,'ascii');b.writeUInt8(1,n);b.writeUInt8(0,n+1);self.socket.write(b);})();
  var read = (function() {
    var b = new Buffer(0);
    return function(chunk) {
      b = Buffer.concat([b,chunk]);
      while(b.length >= 8) {
        var n=b.readUInt32LE(4);
        if(n<b.length)break;
        var err,body,t=b.readInt8(8);
        if(t===-128) {
          err=new Error("error "+b.toString("ascii",9,n-1));
        } else {
          var a;memcpy(a=new ArrayBuffer(n),b.slice(0,n));
          try { body = c.dec(a); err=null; } catch(e) { body=null, err=e; };
        }
        if(err !== null || b.readUInt8(1)==2) {
          var t = self.tasks.splice(0,1);
          if(t.length > 0) t[0](err,body);
        } else if(Array.isArray(body) && (a[0] === "upd" || a[0] === "data")) {
          self.emit("data", a[1], a[2]);
        }
        b = b.slice(n);
      }
      if(!self.tasks.length) self.socket.unref();
    };
  })();
  self.socket.once("data", function(chunk) {
    if(chunk.length < 1) return;
    if(chunk[0] !== 1) return oops(new Error("Can't login"));
    self.socket.on("data", read);
    read(chunk.slice(1));
  });

  self.socket.on("end", function() { self.emit("end") });
  return self;

  function oops(e) {
    self.ks = function(){};
    self.k = function(){
      if(arguments.length > 0) {
        var f=arguments[arguments.length-1];
        if(typeof f === "function") return f(e);
      }
      return Promise.reject(e);
    };
    self.tasks.splice(0,self.tasks.length).forEach(function(f) { f(e); });
  }
}
util.inherits(khp, events.EventEmitter);


khp.prototype.clode=khp.prototype.kclose=function() {
  var n=arguments.length;
  var r, cb = arguments[n-1];
  if(typeof cb === "function") {
    r=this; --n;
    this.socket.on("close", cb);
  } else {
    var d = Promise.defer();
    this.socket.on("close", function() { d.resolve(true); });
    r = d.promise;
  }
  
  this.socket.end();
  return r;
};

khp.prototype.ks = function() {
  var a,b;
  if(arguments.length == 1) a=c.enc(arguments[0]); else a=c.enc([].slice.call(arguments,0));
  memcpy(b=new Buffer(a.byteLength),a);
  this.socket.write(b)
  return this;
};
khp.prototype.k = function() {
  var a,b,cb,r,n=arguments.length;
  if(typeof arguments[n-1]==="function") {
    --n;cb=arguments[n];r=this;
  }else {
    var d = Promise.defer();
    r=d.promise, cb=function(err,body) { if(err)d.reject(err);return d.resolve(body) };
  }
  if(n == 1) a=c.enc(arguments[0]); else a=c.enc([].slice.call(arguments,0,n));
  memcpy(b=new Buffer(a.byteLength),a);
  b.writeUInt8(1,1);
  this.tasks.push(cb);
  this.socket.write(b);
  return r;
}



if(module.id === ".") {
  var x = new khp("0", "1234");
  x.k("2+2").then(console.log);
}
module.exports = khp;
