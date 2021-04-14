const https=require("https");
function error(ex) {
	logger.sendError({label:"https.request compare",error:ex.message,options:options});
	this.sendError(msg,"compare request unexpected error");
	this.error(ex);
}

const optionsGetToken=(length)=>({
			hostname: 'localhost',  
			port: 443,
			path: '/oauth/token',
			method: 'POST',
			headers: {
				"accept": "*"+"/"+"*",
				"content-length": length,
				"Content-Type": "application/json"
			},
//			requestCert:false,
			timeout:10000 // ten seconds
});

function postHTTP(msg) {
	const node=this;
	if(logger.active) logger.send({label:"postHTTP"});
	try{
		const options={
//			headers: Object.assign({"X-Authentication-Token": node.credentials.token},formData.getHeaders())
			method:"POST"
		};
		const request=https.request(options, response=>{
			if(logger.active) logger.send({label:"compare http callback",statusCode:response.statusCode,statusMessage:response.statusMessage,headers:response.headers});
			const {statusCode}=response;
			try{
				checkStatus(statusCode);
			} catch(ex) {
				error(ex);
			}
			response.setEncoding("utf8");
			let rawData = '';
			response.on('data', chunk=>rawData+=chunk);
			response.on('end', ()=>{
				try{
					const body=JSON.parse(rawData);
				} catch(ex) {
					error(ex);
				}
			});
		}).on('error', error=>{
			error(Error(error));
		}).on('timeout',function(){
			error(Error("timeout"));
		});
		request.write(tokenData);
		request.end();
	} catch(ex) {
		logger.send({label:"sendCompare request error",error:ex.message,stack:ex.stack});
		node.error(ex);
		node.sendError(msg,"Unexpected error, response object parsing error");
	}
}
const  checkStatus=(statusCode)=>{
	switch(statusCode) {
		case 200: return;
		case 401: throw Error("token unauthorised");
		default: throw Error("statusCode: "+statusCode);
	}
}