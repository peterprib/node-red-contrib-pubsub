const logger = new (require("node-red-contrib-logger"))("getHostDetails");
logger.sendInfo("Copyright 2020 Jaroslav Peter Prib");

function dsnLookupService(address,port,callback,error) {
	const dns=require('dns');
	dns.lookupService(address, port, (err, hostname, service) => {
		if(err) {
			logger.error({label:"dns.lookupService",error:err});
			if(error)	error(err + " address: "+address+" port: "+port );
			return ;
		}
		logger.sendInfo({label:"dns.lookupService",address:address,hostname:hostname,port:port,service:service});
		callback({address:address,hostname:hostname,port:port,service:service})
	}); 
}

function getHostDetails(host,port,callback,error) {
	const hostParts=host.split(".")
	if(hostParts.length==4) {// may be ip address
		const isIPaddress=hostParts.find(c=>!Number.isInteger(c) || c<0 || c>255 )==undefined;
		if(isIPaddress) {
			if(logger.active) logger.send({label:"getHostDetails host is ip address",host:host})
			dsnLookupService(host,port,callback,error);
			return;
		}
	}
	const dns=require('dns');
	if(!Number.isInteger(port)) throw Error("port not a number");
	dns.lookup(host, {all:true},(err, address, family) => {
		if(err) {
			logger.error({label:"dns.lookup",host:host,port:port,error:err});
			if(error)	error(err + " host: "+host);
			return ;
		}
		logger.sendInfo({label:"dns.lookup",host:host,port:port,address:address,family:family});
		dsnLookupService(address[0].address,port,
			(data)=>callback(Object.assign(data,{host:host,family:family})),
			(err)=>error(err+" host: "+host)
		);
	});
}
module.exports=getHostDetails;