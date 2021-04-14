const logger = new (require("node-red-contrib-logger"))("networkInterfaces");
logger.sendInfo("Copyright 2020 Jaroslav Peter Prib");
function networkInterfaces() {
	this.interfaces=require('os').networkInterfaces();
}
networkInterfaces.prototype.forEachInterface=function(cb) {
	for (const property in this.interfaces) cb(this.interfaces[property]);
}
networkInterfaces.prototype.findAddress=function(address) {
	for (const property in this.interfaces) {
		const hostInterface=this.interfaces[property];
		for(let j=0;j<hostInterface.length;j++){
			const host=hostInterface[i];
			if(host.address==address ) return host;
		}
	}
	return;
}
networkInterfaces.prototype.findLocalAddress=function(address) {
//	if(logger.active) logger.send({label:"findLocalAddress",address:address,interfaces:this.interfaces})
	for (const property in this.interfaces) {
		const hostInterface=this.interfaces[property];
		for (const h in hostInterface) {
			const host=hostInterface[h];
			if(logger.active) logger.send({label:"findLocalAddress",address:address,host:host})
			if(hostInterface.internal==false) continue;
			if(host.address==address) return host;
		}
	}
	if(logger.active) logger.send({label:"findLocalAddress notfound",address:address})
	return;
}
module.exports=networkInterfaces;