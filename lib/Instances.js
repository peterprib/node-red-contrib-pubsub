const logger=new (require("node-red-contrib-logger"))("Instances");
const networkInterfaces=new (require("./networkInterfaces"));
const getHostDetails=require("./getHostDetails");
const https=require("https");
const http=require("http");
let requests={};requestIdCounter=0;

function httpError(requestId,ex,error,instance){
	const request=requests[requestId]
	if(request){
		request.updated=new Date();
		request.failed=ex.message;
		request.attempt+=1;
	}
	if(ex.message.startsWith("Error: connect ECONNREFUSED")) 
		logger.error({label:"httpError",requestId:requestId,instance:instance.urlDetails,error:"instance unavailable"});
	else
		logger.error({label:"httpError",requestId:requestId,requestFound:!(request==null),instance:instance.urlDetails,error:ex.message,stack:ex.stack});
	error&&error(ex)
}

function Instance(properties) {   //{host:host,port:port}
	Object.assign(this,properties);
	this.callbackStack=[];
	this.onReadyStack=[];
	if(this.readyInstance) this.callbackStack.push({callback:this.readyInstance,thisBase:this});
	if(this.ready) this.callbackStack.push({callback:this.readyInstance,thisBase:this});
	this.setDetail();
};
Instance.prototype.getDetails=function(){
	const properties=Object.keys(this),node=this;
	return properties.filter(p=>!["callbackStack","onReadyStack"].includes(p)).reduce((a,p)=>{a[p]=this[p];return a},{callbacks:this.callbackStack.length,onReadyFunctions:this.onReadyStack.length})
};
Instance.prototype.onReady=function(callback,thisBase=this,onlyOnce=false){
	const call=typeof callback === 'function'?{callback:callback,thisBase:thisBase}:callback;
	logger.info({label:"Instance onReady",instance:this.urlDetails,onlyOnce:onlyOnce})
	if(onlyOnce==false) this.onReadyStack.push(call);
	if(this.checkingDetail) {
		if(onlyOnce==true) this.callbackStack.push(call);
	} else{
		call.callback.apply(thisBase,[this]);
	}
	if(logger.active) logger.send({label:"Instance onReady",details:this.getDetails()})
};
Instance.prototype.request=function(path,callback,error){
	if(this.self) throw Error("not available as is self")
	const requestId=requestIdCounter++;
	const instance=this;
	try{
		const options={
			method:"GET",
			hostname:this.local.address,
			port:this.port,
			path:path
		};
		if(logger.active) logger.send({label:"Instance.request",requestId:requestId,options:options});
		requests[requestId]={instance:this,path:path,created: new Date()};
		const request=this.requestBase(options, response=>{
			if(logger.active) logger.send({label:"Instance.request callback",requestId:requestId,statusCode:response.statusCode,statusMessage:response.statusMessage,headers:response.headers,options:options});
			const {statusCode}=response;
			if(statusCode!==200) {
				httpError(requestId,Error("status "+statusCode),error,instance)
				return;
			}
			delete requests[requestId];
			response.setEncoding("utf8");
			let rawData = '';
			response.on('data', chunk=>rawData+=chunk);
			response.on('end', ()=>{
				let body;
				if(rawData)
					try{
						body=JSON.parse(rawData);
						if(instance.syncKey) instance.syncKey=body.syncKey;
					} catch(ex) {
						logger.error({label:"instance request return not json",data:rawData})
						httpError(requestId,ex,error,instance);
						return;
					}
				callback&&callback(body)
			});
		}).on('error', err=>{
			httpError(requestId,Error(err),error,instance);
		}).on('timeout',function(){
			httpError(requestId,Error("timeout"),error,instance);
		});
		request.end();
	} catch(ex) {
		httpError(requestId,ex,error,instance);
	}
}
Instance.prototype.setDetail=function(){
	const instance=this,setDetailComplete=this.setDetailComplete.bind(instance);
	this.checkingDetail=1;
	getHostDetails(instance.host,instance.port,
			(details)=>{
				instance.local=networkInterfaces.findLocalAddress(details.address);
				if(logger.active) logger.send({label:"instance found",networkDetails:instance.local,details:details});
				setDetailComplete();
			},
			(err)=>{
				this.error("instance error host: "+instance.host+" port: "+instance.port+" error: "+err);
				setDetailComplete();
			}
	) ;
};
Instance.prototype.onReadyStackProcess=function(){
	this.onReadyStack.forEach(call=>{
		try{
			call.callback.apply(call.thisBase,[this]);
		} catch(ex) {
			logger.error({label:"Instance onReadyStackProcess",callback:call.callback,error:ex.message,stack:ex.stack});
		}
	})
};
Instance.prototype.setDetailComplete=function(){
	if(logger.active) logger.send({label:"Instance setDetailComplete",checkingDetail:this.checkingDetail,details:this.getDetails()});
	if(--this.checkingDetail) return;
	this.completedTS=new Date();
	this.urlDetails={hostname:this.local.address,port:this.port};
	this.requestBase=this.local.address=="127.0.0.1"?http.request:https.request;
	this.onReadyStackProcess();
	while(this.callbackStack.length) {
		const call=this.callbackStack.shift();
		try{
			call.callback.apply(call.thisBase,[this]);
		} catch(ex) {
			logger.error({label:"Instance setDetailComplete",callback:call.callback,error:ex.message,stack:ex.stack});
		}
	}
}
Instance.prototype.setSelf=function(port){
	this.self=this.local&&this.port==port
	this.available=!this.self;
};

function Instances(instances,port) {
	this.instances={};
	this.waitingCnt=0;
	if(instances) this.add(instances);
	this.setOwnPort(port);
	this.onInstanceReadyStack=[];
	this.onInstancesReadyStack=[];
	this.onReadyStack=[{callback:this.readyInstance.bind(this),thisBase:this}];
};
Instances.prototype.add=function(p){
	const list=Array.isArray(p)?p:[p],addInstance=this.addInstance.bind(this);
	list.forEach(c=>addInstance(c));
};
Instances.prototype.addInstance=function(properties){
	this.waitingCnt++;
	new Instance(Object.assign(properties,{readyInstance:this.readyInstance.bind(this)}));
};
Instances.prototype.getConfig=function(c){
	return {port:this.port};
};
Instances.prototype.getDetails=function(c){
	return {port:this.port,
		instances:this.getInstances(),
		onInstanceReadyCount:this.onInstanceReady.length
	};
};
Instances.prototype.getInstances=function(){
	let r=[]
	this.forEachInstance(instance=>r.push(instance.getDetails()))
	return r;
};
Instances.prototype.forEachInstanceAvailable=function(callback,thisBase=this){
	this.forEachInstance((instance,instanceURI,instances)=>{if(instance.available)  callback(instance,instanceURI,instances);});
};
Instances.prototype.forEachInstance=function(callback,thisBase=this){
	if(!this.instances) throw Error("not coalled correctly")
	if(logger.active) logger.send({label:"forEachInstance",instances:Object.keys(this.instances)});
	const callFunction=callback.bind(thisBase);
	for(const instanceURI in this.instances){
		const instance=this.instances[instanceURI];
		if(instance.self) continue;
		if(logger.active) logger.send({label:"forEachInstance instance",instanceURI:instanceURI});
		callFunction(instance,instanceURI,this);
	}
};
Instances.prototype.onReady=function(callback,thisBase=this){
	if(logger.active) logger.send({label:"onReady"});
//	this.onReadyStack.push({callback:thisBase.callback,thisBase:thisBase});
	this.forEachInstanceAvailable(instance=>instance.onReady(callback,thisBase));
};
Instances.prototype.onInstanceReady=function(callback,thisBase=this){
	if(logger.active) logger.send({label:"onInstanceReady"});
	this.onInstanceReadyStack.push({callback:callback,thisBase:thisBase});
};
Instances.prototype.onInstancesReady=function(callback,thisBase=this){
	if(logger.active) logger.send({label:"onInstancesReady"});
	this.onInstancesReadyStack.push({callback:callback,thisBase:thisBase});
};
Instances.prototype.readyInstance=function(instance,thisBase=this){
	const waitingCnt=--this.waitingCnt; // done first as other statements could cause delays and sequence issues
	if(logger.active) logger.send({label:"readyInstance",waitingCnt:waitingCnt,instance:instance.getDetails()});
	this.instances[instance.uri]=instance;
	instance.setSelf(this.port);
	if(instance.self==false) {
		const instances=this;
		instance.onReady(()=>instances.onInstanceReadyStack.forEach((f,i)=>{f.callback.apply(f.thisBase,[instance])}))
	}
	if(waitingCnt) return;
	if(this.ready) ready(instances);
};
Instances.prototype.setOwnPort=function(port){
	this.port=port;
	this.forEachInstance(instance=>{
		if(logger.active) logger.send({label:"setOwnPort",instance:instance,instanceP:Object.keys(instance)});
		instance.setSelf(port);
	});
	return this;
};
module.exports=Instances;