const logger = new (require("node-red-contrib-logger"))("pubsubhub");
logger.sendInfo("Copyright 2020 Jaroslav Peter Prib");

const PubSubNode=require("./PubSubNode");
const getHostDetails=require("./getHostDetails");
const Instances=require("./Instances");
const httpAdmin=require("./httpAdmin");
const http=require("http");
const https=require("https");
const isEqual=require("./isEqual");

let hubs={},remoteURIs={};
let checkHubsTimer

function checkHubs() {
	logger.info({label:"checkHubs heartbeat ",hubs:Object.keys(hubs)})
	try{
		for(const hub in hubs){
			const hubNode=hubs[hub]
			if(logger.active) logger.send({label:"checkHubs heartbeat",hub:hub})
			hubNode.hub.instances.forEachInstance(instance=>instance.request("/"+logger.label+"/ruOK/",
					(data)=>{if(logger.active) logger.send({label:"ruOK all OK",instance:instance.url,data:data})},
					(err)=>{
						logger.warn({label:"ruOK instance onReadyStackProcess",instance:instance.url,error:err})
						instance.onReadyStackProcess();
					}
			))
			if(hubNode.retryStack.length==0) continue;
			logger.info("checkHubs retries for "+hub)
			hubNode.retryStackProcess=hubNode.retryStack;
			hubNode.retryStack=[];
			while(hubNode.retryStackProcess.length) 
				this.callWithRetry(hubNode.retryStackProcess.shift())
		}		
	} catch(ex){
		logger.error({label:"checkHubs",error:ex.message,stack:ex.stack})
	}
}
function callWithRetry(retry){
	try{
		retry.callFunction.apply(retry.base,retry.args)
	} catch(ex) {
		logger.info({label:"checkHubs retry failure",hub:hub,label:label,error:ex.message})
		if(retry.count) retry.count++;
		else retry.count=0;
		this.retryStack(retry);
	}
}
function defaultFunction(msg){
	if(logger.active) logger.send({label:"defaultFunction",node:this.id,name:this.name,msg:msg._msgid,clone:this.clone})
	this.send(msg,this.clone);
}
function PubSubHub(name,instances,node) {
	this.name=name;
	this.node=node;
	this.instances=instances;
	this.hub=new PubSubNode(logger);
};
PubSubHub.prototype.clear=function(){
	if(logger.active) logger.send({label:"PubSubHub.clear"});
	this.hub.clear();
};
PubSubHub.prototype.getConsistencyKey=function(){
	return this.hub.getConsistencyKey()
};
PubSubHub.prototype.isConsistent=function(key){
	return this.hub.isConsistent(key)
};
PubSubHub.prototype.subscribe=function(node,topic,options,callFunction){
	if(logger.active) logger.send({label:"PubSubHub.subscribe",node:node.id,name:node.name,topic:topic,options:options})
	if(!topic) logger.warn({label:"subscribe",node:node.id,name:node.name,warning:"no topic"});
	const headings=topic.split("/");
	return this.hub.subscribe(node,headings||[],options,(callFunction||defaultFunction).bind(node));
};
PubSubHub.prototype.subscribePool=function(node,topic,id,options,callFunction){
	if(logger.active) logger.send({label:"PubSubHub.subscribePool",topic:topic,id:id,options:options,callFunction:callFunction!==null,node:{id:node.id,name:node.name}});
	const headings=topic.split("/");
	return this.hub.subscribePool(node,headings,id,options,(callFunction||node.send).bind(node));
};
PubSubHub.prototype.publish= function(topic,msg){
	if(logger.active) logger.send({label:"PubSubHub.publish",msg:msg._msgid,topic:topic});
	const headings=topic.split("/");
	return this.hub.publish(headings,msg)
};
function publishRemote(node,options,msg,callback){
	let remote=msg._remote;
	while(remote) {
		if(isEqual(remote.options,options)) return;
		remote=msg._remote;
	}
	if(logger.active) logger.send({label:"publishRemote",options:options});
	try{
		const msgRemote={topic:msg.topic ,payload:msg.payload ,_remote:{_id:msg._id,options:options,_remote:msg._remote}}
		const data=JSON.stringify(msgRemote)
		const requestOptions=Object.assign({headers: {'Content-Type': 'application/json','Content-Length': data.length}},options)
		const request=http.request(requestOptions, response=>{
			if(logger.active) logger.send({label:"publishRemote request callback",options:options,statusCode:response.statusCode,statusMessage:response.statusMessage,headers:response.headers});
			const {statusCode}=response;
			try{
				if(statusCode!==200) throw Error("error status code:"+statusCode)
			} catch(ex) {
				logger.sendError({label:"publishRemote request callback",options:options,error:ex.message});
			}
			callback&&callback()
		}).on('error', error=>{
			logger.sendError({label:"publishRemote on error",options:options,error:error});
			callback&&callback()
		}).on('timeout',function(){
			const error="timeout";
			logger.sendError({label:"publishRemote on timeout",options:options,error:error});
			node.sendError(msg,error);
			node.error(error);
			callback&&callback()
		});
		request.write(data);
		request.end();
	} catch(ex) {
		logger.error({label:"publishRemote",options:options,error:ex.message,stack:ex.stack});
		callback&&callback()
	}
}
module.exports = function(RED) {
	function baseNode(n) {
		RED.nodes.createNode(this,n);
		const node=Object.assign(this,{name:"_default",retryStack:[],subscriptions:{},callWithRetry:callWithRetry.bind(this)},n);
		try{
			if(logger.active) logger.send({label:"PubSubHub.publish",node:n});
			if(node.name in hubs) throw Error("duplicate hub name for "+node.name+" id: "+node.id + " active id: "+hubs[node.name].id);
			hubs[node.name]=node;
			node.hub=new PubSubHub(node.name,new Instances(node.hubs,RED.settings.uiPort),node);
		} catch(ex) {
			logger.error({label:"baseNode",error:ex.message,stack:ex.stack});
			node.error(ex.message);
		}
	};
	RED.events.on("flows-started",function() {  // don't do done as stops other success
		if(logger.active) logger.send({label:"flows-started"});
//		const checkHubs=checkHubs.bind()
		checkHubsTimer = setInterval(checkHubs,1000*60,this);  //every minute
	});
	RED.events.on("flows-stopped",function() {  // don't do done as stops other success
		if(logger.active) logger.send({label:"flows-stopped"});
		if(checkHubsTimer) {
			 clearTimeout(checkHubsTimer)
			 checkHubsTimer=null
		}
		hubs={};
	});

	RED.nodes.registerType(logger.label,baseNode,{
		credentials: {
				user: {type: "text"},
				password: {type: "password"}
		 }
	})
	httpAdmin(RED,logger,hubs,"get",{
		getInstances:(request,response,hubNode,callback,error)=>{
			callback(hubNode.hub.instances.getInstances())
		},
		getConfig:(request,response,hubNode,callback,error)=>{
			callback(hubNode.hub.instances.getConfig())
		},
		getDetails:(request,response,hubNode,callback,error)=>{
			callback(hubNode.hub.instances.getDetails())
		},
		ruOK:(request,response,hubNode,callback,error)=>{ 
			const c=request.connection;
			logger.info({label:"httpAdmin ruOK",remoteAddress:c.remoteAddress,remotePort:c.remotePort})
			if(!request.query.syncKey) throw Error("missing syncKey");
			if(hubNode.hub.isConsistent(request.parms)) callback()
			else {
				logger.info({label:"httpAdmin ruOK resync",remoteAddress:c.remoteAddress,remotePort:c.remotePort})
				// remote to redo remote subscribes
			}
		},
		subscribe:(request,response,hubNode,callback,error)=>{
			if(!request.query.topic) throw Error("missing topic");
			if(!request.query.port) throw Error("missing port");
			const options={method: "POST",hostname:request.ip, port:request.query.port,path:"/"+logger.label+"/"+hubNode.name+"/publish?topic="+request.query.topic};
			const subscriptionId=options.hostname+options.port+options.path
			if(hubNode.subscriptions.hasOwnProperty(subscriptionId)){
				logger.warn({label:"subscribe",message:"already subscribed"})
				callback(subscriptionId);
				return;
			}
			hubNode.subscriptions[subscriptionId]={};
			const publishRemoteFunction=publishRemote.bind(hubNode)
			const callFunction=(msg,callback)=>publishRemoteFunction(hubNode,options,msg,callback);
			hubNode.hub.subscribe(hubNode,request.query.topic,options,callFunction)
			callback();
		},
		subscribePool:(request,response,hubNode,callback,error)=>{
			if(!request.query.topic) throw Error("missing topic");
			if(!request.query.port) throw Error("missing port");
			const options={method: "POST",hostname:request.ip, port:request.query.port,path:"/"+logger.label+"/"+hubNode.name+"/publish?topic="+request.query.topic};
			const publishRemoteFunction=publishRemote.bind(hubNode)
			const callFunction=(msg,callback)=>publishRemoteFunction(hubNode,options,msg,callback);
			hubNode.hub.subscribePool(hubNode,request.query.topic,options,callFunction)
			callback();
		}
	});
	httpAdmin(RED,logger,hubs,"post",{
		publish:(request,response,hubNode,callback,error)=>{
			if(!request.query.topic) throw Error("missing topic");
			if(!request.body) throw Error("missing message");
			if(logger.active) logger.send({label:"httpAdmin post",msg:request.body});
			if(request.aborted) throw Error("aborted")
			const msg=request.body;
			Object.assign({_remote:{id:"direct",url:request.url,originalUrl:request.originalUrl}},msg)
			hubNode.hub.publish(request.query.topic,msg);
		}
	});
};