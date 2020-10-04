const should = require("should");
const helper = require("node-red-node-test-helper");
const pubsubhubNode = require("../lib/pubsubhub.js");
const publishNode = require("../lib/publish.js");
const subscribeNode = require("../lib/subscribe.js");
const nodes=[pubsubhubNode,publishNode,subscribeNode]
const helperInNodeDef={id :"helperInNode",type : "helper"};
const helperNodeDef={id :"helperNode",type : "helper"};
const helperErrorNodeDef={id :"helperErrorNode",type : "helper"};
helper.init(require.resolve('node-red'));
function testEqual(a,b,done) {  //needed as bug in test-helper
    try {
    	if(JSON.stringify(a)==JSON.stringify(b)) return;
        throw Error("not equal");
     } catch(ex) {
        done(ex.message+" expected : "+JSON.stringify(b)+" found : "+JSON.stringify(a));
    }
}
function testNodeProperties(o) {
	const n = getNode(o);
	for(let p in o) {
		n.should.have.property(p, o[p]);
	}
	return n;
}
function testFlow() { 
	return [
		pubsubhubNodeDef,
		Object.assign({},helperInNodeDef,{wires : [ [ "p1" ] ]}),
		Object.assign({},subscribe1NodeDef,{wires : [ [ "helperNode" ] ]}),
		Object.assign({},subscribe2NodeDef,{wires : [ [ "helperErrorNodeDef" ] ]}),
		publishNodeDef,
		helperNodeDef,
		helperErrorNodeDef
		];
}
function getNode(def) {
	const id=typeof def== "object"?def.id:def;
	const n = helper.getNode(id);
	if(n==null) throw Error("node "+id+" not found");
	if(typeof n== "object")  return n;
	throw Error("get node found not an object for "+id);
	console.log(helper.log().args);	// this hopefully tells why 
}
const pubsubhubNodeDef={	id : "testhub",	type : "pubsubhub",name: "testhub"} ;
const publishNodeDef={	id : "p1",	type : "publish",hub:"testhub",name: "publish name",topic:"h1/s1"	} ;
const subscribe1NodeDef={id : "s1",	type : "subscribe",hub:"testhub",	name: "test name s1",topic:"h1/s1"} ;
const subscribe2NodeDef={id : "s2",	type : "subscribe",	hub:"testhub",name: "test name s2",	topic:"h1/s2"} ;

describe('pubsub', function() {

	beforeEach(function(done) {
		helper.startServer(done);
	});
	afterEach(function(done) {
		helper.unload();
		helper.stopServer(done);
	});

	it('test helper load', function(done) {
		helper.load(nodes, [helperNodeDef], function() {
			const helperNode = getNode(helperNodeDef);
			done();
		});
	});
	it('pubsubhub node load', function(done) {
		helper.load(nodes, [pubsubhubNodeDef], function() {
			done();
		});
	});
	it('publish node  load', function(done) {
		helper.load(nodes,[publishNodeDef], function() {
			const publishNode = getNode(publishNodeDef);
			done();
		});
	});
	it('subscribe node  load', function(done) {
		helper.load(nodes, [subscribe1NodeDef],pubsubhubNodeDef,function() {
			const subscribeNode = getNode(subscribe1NodeDef);
			done();
		});
	});
/*
	it('test  flow', function(done) {
		helper.load(nodes, testFlow(), function() {
			try{
				const helperNode = getNode(helperNodeDef)
				helperNode.on("input", function(msg) {
					console.log("**** helperNode input");
					testEqual(msg.payload.c,"test payload",done)
					done();
				});
				const helperErrorNode = getNode(helperErrorNodeDef);
				helperErrorNode.on("input", function(msg) {
					console.log("**** helperErrorNode input");
					done("error node called");
				});
				const helperInNode = testNodeProperties(helperInNodeDef);
				helperInNode.receive({
					topic:"h1/s1",
					payload :"test payload s1"
				});
				helperInNode.receive({
					topic:"h1/s2",
					payload :"test payload s2"
				});
			} catch(ex){
				done(ex.message);
			}
		});
	}).timeout(2000);
	*/
});