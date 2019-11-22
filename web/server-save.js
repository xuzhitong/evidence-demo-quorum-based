var Web3 = require('web3');
var express = require('express');
var app = express();
var keythereum = require('keythereum');
var async = require('async');
var Tx = require('ethereumjs-tx');
var bodyParser = require('body-parser');
var EviDb = require("./db");
var EviDfs = require("./dfs");
var Minio = require("minio");
//var SolidityCoder = require("web3/lib/solidity/coder.js");
const Mutex = require('await-semaphore').Mutex;
const crypto = require('crypto');
const fs = require('fs');
const multer = require('multer');
const NonceTracker = require('nonce-tracker');
const upload = multer({
  dest: 'uploads/' // this saves your file into a directory called "uploads"
});
const blockTracker = {
    getCurrentBlock: getBlockNumber,
    getLatestBlock: getBlockNumber,
    getTransactionCount:getTransactionCount
};
//var provider = new Web3.providers.HttpProvider("http://localhost:50000");
var provider = new Web3.providers.WebsocketProvider("ws://localhost:60000",{headers:{Origin: "lvdutech"}});
var web3 = new Web3(provider,null,{transactionConfirmationBlocks: 1,transactionBlockTimeout:50});
var eviDfs = new EviDfs();
console.log(typeof(provider));
var pendingTxsMap = new Map();
var confirmedTxsMap = new Map();
var eventsMap = new Map();
function getPendingTxs(address){
    var pendingTxs = pendingTxsMap.get(address);
    if (pendingTxs == undefined)
        pendingTxs = [];
    return pendingTxs;
};
function getConfirmedTxs(address){
    var txList = confirmedTxsMap.get(address);
    if (txList == undefined)
        txList = [];
    return txList;
};
var nonceTracker = new NonceTracker({provider:provider,blockTracker:blockTracker,getPendingTransactions:getPendingTxs,getConfirmedTransactions:getConfirmedTxs});
var contractAddress = "0x89faf6205b0ed909b742c2fb3abea7d46ff1fbe3";
var abi = [{"constant": false,"inputs": [{"name": "caseId","type": "string"}],"name": "createCase","outputs": [],"payable": false,"stateMutability": "nonpayable","type": "function"},{"anonymous": false,"inputs": [{"indexed": false,"name": "_addr","type": "address"}],"name": "GetCaseAddr","type": "event"},{"anonymous": false,"inputs": [{"indexed": false,"name": "caseId","type": "string"}],"name": "CaseIdNotExist","type": "event"},{"constant": false,"inputs": [{"name": "caseId","type": "string"},{"name": "fileNameHash","type": "bytes16"},{"name": "fileName","type": "string"},{"name": "fileHash","type": "bytes16"},{"name": "fileUploadTime","type": "uint256"}],"name": "saveEvidence","outputs": [{"name": "code","type": "uint256"},{"name": "addr","type": "address"}],"payable": false,"stateMutability": "nonpayable","type": "function"},{"constant": false,"inputs": [{"name": "caseId","type": "string"},{"name": "_hash","type": "bytes16"},{"name": "_index","type": "uint256"},{"name": "_account","type": "address"}],"name": "setMutiSigAccount","outputs": [],"payable": false,"stateMutability": "nonpayable","type": "function"},{"constant": true,"inputs": [{"name": "caseId","type": "string"}],"name": "getEviAddr","outputs": [{"name": "addr","type": "address"}],"payable": false,"stateMutability": "view","type": "function"},{"constant": true,"inputs": [{"name": "caseId","type": "string"},{"name": "fileHash","type": "bytes16"}],"name": "getEvidence","outputs": [{"name": "_code","type": "uint256"},{"name": "_name","type": "string"},{"name": "_hash","type": "bytes16"},{"name": "_upTime","type": "uint256"},{"name": "_upOperator","type": "address"}],"payable": false,"stateMutability": "view","type": "function"}];
var abiFile = [{"constant": true,"inputs": [{"name": "_hash","type": "bytes16"}],"name": "getFileEvi","outputs": [{"name": "_name","type": "string"},{"name": "_file","type": "bytes16"},{"name": "_upTime","type": "uint256"},{"name": "_upOperator","type": "address"}],"payable": false,"stateMutability": "view","type": "function"},{"constant": false,"inputs": [{"name": "_hash","type": "bytes16"},{"name": "_name","type": "string"},{"name": "_file","type": "bytes16"},{"name": "_upTime","type": "uint256"}],"name": "saveFileEvi","outputs": [],"payable": false,"stateMutability": "nonpayable","type": "function"},{"constant": false,"inputs": [{"name": "hash","type": "bytes16"},{"name": "index","type": "uint256"},{"name": "account","type": "address"}],"name": "setMutiSigAccount","outputs": [],"payable": false,"stateMutability": "nonpayable","type": "function"},{"inputs": [{"name": "_id","type": "string"}],"payable": false,"stateMutability": "nonpayable","type": "constructor"},{"anonymous": false,"inputs": [{"indexed": false,"name": "_oper","type": "address"},{"indexed": false,"name": "_time","type": "uint256"},{"indexed": false,"name": "_name","type": "string"},{"indexed": false,"name": "_flag","type": "uint256"}],"name": "SaveEvi","type": "event"},{"anonymous": false,"inputs": [{"indexed": false,"name": "_hash","type": "bytes16"}],"name": "MuitSigNotSet","type": "event"},{"anonymous": false,"inputs": [{"indexed": false,"name": "_hash","type": "bytes16"},{"indexed": false,"name": "index","type": "uint256"},{"indexed": false,"name": "_account","type": "address"}],"name": "MuitSigInvalidAccount","type": "event"},{"anonymous": false,"inputs": [{"indexed": false,"name": "_hash","type": "bytes16"},{"indexed": false,"name": "needSigNumber","type": "uint256"}],"name": "MuitSigWaitOtherSign","type": "event"},{"anonymous": false,"inputs": [{"indexed": false,"name": "_hash","type": "bytes16"}],"name": "EviFileExist","type": "event"}];
//var urlencodedParser = bodyParser.urlencoded({ extended: false });
var eviContract = new web3.eth.Contract(abi,contractAddress);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use(express.static(__dirname));
app.all('*', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "*");
    res.header("Access-Control-Allow-Methods","*");
    //res.header("X-Powered-By",' 3.2.1')
    //res.header("Content-Type", "application/json;charset=utf-8");
    next();
});
var evidb = new EviDb();
//app.use('/download', express.static(path.join(__dirname, 'download')));
function dateFtt(val){
    var date = new Date(val);
    return date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() +" " +date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds();
}
Date.prototype.Format = function(fmt) { 
     var o = { 
        "M+" : this.getMonth()+1,                 //月份 
        "d+" : this.getDate(),                    //日 
        "h+" : this.getHours(),                   //小时 
        "m+" : this.getMinutes(),                 //分 
        "s+" : this.getSeconds(),                 //秒 
        "q+" : Math.floor((this.getMonth()+3)/3), //季度 
        "S"  : this.getMilliseconds()             //毫秒 
    }; 
    if(/(y+)/.test(fmt)) {
            fmt=fmt.replace(RegExp.$1, (this.getFullYear()+"").substr(4 - RegExp.$1.length)); 
    }
     for(var k in o) {
        if(new RegExp("("+ k +")").test(fmt)){
             fmt = fmt.replace(RegExp.$1, (RegExp.$1.length==1) ? (o[k]) : (("00"+ o[k]).substr((""+ o[k]).length)));
         }
     }
    return fmt; 
}  

/*function renameFileName(oldName,newName,callback){
    fs.exists(oldName,function(exist){
        if (exist){
            
        }else{
            console.log("rename file "+oldName+" is not exist");
            callback(exist);
        }
    })
}*/
function getBlockNumber(){
    return new Promise(function(resolve,reject){
        web3.eth.getBlockNumber(function(error,result){
            if (error){
                reject(error);
            }else{
                resolve(result);
            }
        })
    })
}
function getTransactionCount(address,blockNumber){
    return new Promise(function(resolve,reject){
        web3.eth.getTransactionCount(address,blockNumber,function(error,result){
            if (error){
                reject(error);
            }else{
                resolve(result);
            }
        })
    })
}
function getNetNonce(account,block){
    return new Promise(function(resolve,reject){
        web3.eth.getTransactionCount(account,block,function(error,result){
        if (error){
            console.error('getTransactionCount error ',error);
            reject(error);
        }else{
            resolve(result);
        }
    });
});
}
async function getNextNonce(account){
    //let txCount = await getNetNonce(account,"latest");
    //let db = await evidb.getDb();
    //let localNonce = await evidb.getAccountNonce(db,account);
    //console.log("getNextNonce dbNonce is "+localNonce);

    /*let netNonce = await getNetNonce(account,"pending");
    console.log("getNextNonce netNonce is "+netNonce);
    let pendingTxsCount = pendingTxsMap.get(account);
    if (pendingTxsCount == undefined){
        pendingTxsCount = 0;
    }
    pendingTxsMap.set(account,pendingTxsCount + 1);
    
    let confirmedTxsCount = confirmedTxsMap.get(account);
    if (confirmedTxsCount == undefined){
        confirmedTxsCount = await getNetNonce(account,"latest");
        confirmedTxsMap.set(account,confirmedTxsCount);
    }

    console.log("confirmedTxsCount is "+confirmedTxsCount+",pendingTxsCount is "+pendingTxsCount);
    return Math.max(netNonce,confirmedTxsCount+pendingTxsCount);*/
    return 0;
}
async function updateNonce(account,nonce){
    let db = await evidb.getDb();
    await evidb.updateNonce(db,account,nonce);
}
function getPendingTransactions(){
    return new Promise(function(resolve,reject){
        web3.eth.getPendingTransactions(function(error,result){
            if (error){
                reject(error);
            }else{
                resolve(result);
           }
        })
    });
    
}
async function sendMethod(evtContract,encodeAbi,privateKey,resend,callback){

    var account = web3.eth.accounts.privateKeyToAccount('0x'+privateKey).address;
    
    var eviTime = new Date().getTime(); 
    console.log("account is "+account+",encodeAbi is "+encodeAbi);
    //web3.eth.getTransactionCount(account,"pending",function(error,result){
    //getNextNonce(account).then(function(nonce){
        //var pendingTxs = await getPendingTransactions();
        console.log("pendingTxs is ",pendingTxs);
        var nonceLock = await nonceTracker.getNonceLock(account);
        var nextNonce = nonceLock.nextNonce;
        await nonceLock.releaseLock();
        //var netNonce = result;
        //var localNonce = evidb.getNonceByAccount(account);
        //var localNonce = 0;
        console.log("next nonce is "+nextNonce);
        console.log('encode abi is ',encodeAbi);
        //let pendingTxsCount = pendingTxsMap.get(account);
        //if (pendingTxsCount == undefined)
        //    pendingTxsCount = 0;
        //pendingTxsMap.set(account,pendingTxsCount+1);
        //updateNonce(account,nextNonce);
        //web3.eth.txpool.status().then(console.log);
        var rawTx = {
            nonce: nextNonce,
            from: account,
            to: contractAddress,
            gas: 6000000,
            data: encodeAbi
        };
        const tx = new Tx(rawTx);
        var keyBuf =Buffer.from(privateKey,'hex'); 
        tx.sign(keyBuf);
        const serializedTx = tx.serialize();
        console.log("signed tx",'0x'+serializedTx.toString('hex'));
        //var eventArr = ["GetCaseAddr","MuitSigWaitOtherSign","SaveEvi","MuitSigInvalidAccount","MuitSigNotSet"];
        //catch events
        /*evtContract.once('allEvents',{
            fromBlock:'latest'
        },(error,event) => {
            if (!error){
                //callback(event);
                console.log("get event ",event.event);
                eventsMap.set(event.transactionHash,event);
                //evt = event;
            }else{
                callback(null,error);
                return;
            }
        });*/
        //updateNonce(account,nextNonce);
        var pendingTxs = pendingTxsMap.get(account);
        var newPendingTx = {txParams:{nonce:nextNonce}};
        if (pendingTxs == undefined){
            var array = new Array();
            array.push(newPendingTx);
            pendingTxsMap.set(account,array);
        }else{
            pendingTxs.push(newPendingTx);
        }
            var tran = web3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex'));
            tran.on('confirmation', (confirmationNumber, receipt) => {
                console.log(' confirmation: ',confirmationNumber);
                //console.log(receipt);
                //console.log('evt is ',evt);
                /*if (confirmationNumber == 1){
                    let pendingTxsCount = pendingTxsMap.get(account);
                    if (pendingTxsCount != undefined && pendingTxsCount > 0){
                        pendingTxsMap.set(account,pendingTxsCount - 1);
                    }
                    callback(evt,null); 
                }*/
               //res.send('Evidence saved OK,block number ='+receipt.blockNumber+",transaction hash = "+receipt.transactionHash);
            });

            tran.on('transactionHash', hash => {
                console.log('hash');
                console.log(hash);
            });
            
            tran.on('receipt',receipt => {
                console.log("receive receipt ",receipt);
                var account = receipt.from;
                var nonce = receipt.nonce;
                var confirmedTxs = confirmedTxsMap.get(account);
                var newTx = {txParams:{nonce:nonce}};
                if (confirmedTxs == undefined){
                    var array = new Array();
                    array.push(newTx);
                    confirmedTxsMap.set(account,array);
                }else{
                    confirmedTxs.push(newTx);
                    for (var j = 0; j < confirmedTxs.length;j++){
                        if (confirmedTxs[j].txParams.nonce < nonce)
                            confirmedTxs.splice(j,1);
                    }
                }
                
                //remove pending tx
                var pendingTxs = pendingTxsMap.get(account);
                for (var i = 0; i < pendingTxs.length;i++){
                    if (pendingTxs[i].txParams.nonce == nonce){
                        pendingTxs.splice(i,1);
                        break;
                    }
                }
               
                /*var txHash = receipt.transactionHash;
                var evt = eventsMap.get(txHash); 
                if (evt != undefined)
                    eventsMap.delete(txHash);*/
                var log = receipt.logs[0];
                var evt = null;
                var event = null;

                for (var i = 0; i < abiFile.length; i++) {
                    var item = abiFile[i];
                    if (item.type != "event") continue;
                    var signature = item.name + "(" + item.inputs.map(function(input) {return input.type;}).join(",") + ")";
                    var hash = web3.utils.sha3(signature);
                    if (hash == log.topics[0]) {
                        event = item;
                        break;
                    }
                }
               
                if (event == null){ 
                    for (var i = 0; i < abi.length; i++) {
                        var item = abi[i];
                        if (item.type != "event") continue;
                        var signature = item.name + "(" + item.inputs.map(function(input) {return input.type;}).join(",") + ")";
                        var hash = web3.utils.sha3(signature);
                        if (hash == log.topics[0]) {
                            event = item;
                            break;
                        }
                    }
                }


                if (event != null) {
                    
                    var data = web3.eth.abi.decodeLog(event.inputs,log.data,log.topics);
     // Do something with the data. Depends on the log and what you're using the data for.
                    console.log(event);
                    console.log(data);
                    var dataArray = new Array();
                    for (var i in data){
                        if(/^[0-9]*$/.test(i))
                            dataArray.push(data[i]);
                    }
                    evt = {event:event.name,returnValues:dataArray};
                    console.log(evt);
                    callback(evt,null)
                }else{
                    callback(null,{'result':'Error','msg':'内部错误'})
                }
             });
            tran.on('error', error => {
                  console.log(error);
                  /*var pendingTxsCount = pendingTxsMap.get(account);
                  if (pendingTxsCount != undefined && pendingTxsCount > 0){
                     console.log("tx error update pendingTxsCount "+pendingTxsCount);
                     pendingTxsMap.set(account,pendingTxsCount - 1);
                  }*/

                  if (error.message.search("replacement transaction underpriced") != -1){
                      //resend = resend + 1;
                      //sendMethod(evtContract,encodeAbi,privateKey,resend,callback);    
                      callback(null,{'result':'replacement transaction underpriced'});
                  }else{
                      callback(null,{'result':'Error','msg':error});
                  }
               });
    //});
    
}
function saveEvidenceFile(fileEviAddr,caseInfo,privateKey,res)
{
    console.log('saveEvidenceFile fileEviAddr is '+fileEviAddr);
    console.log(caseInfo);
    var fileEviContract = new web3.eth.Contract(abiFile,fileEviAddr);
    var eviTime = new Date().getTime();
    var encodeAbi = eviContract.methods.saveEvidence(caseInfo.caseId,caseInfo.fileNameHash,caseInfo.fileName,caseInfo.fileHash,eviTime).encodeABI();
    console.log("wait saved file name is "+caseInfo.fileNameHash+",file summery is "+caseInfo.fileHash+",time is "+eviTime);
    sendMethod(fileEviContract,encodeAbi,privateKey,0,(evt,error) => {
        if (error != null){
            res.send({'result':'Error',msg:error});
            return;
        }
        if (evt == undefined){
            res.send({'result':'Error',msg:'系统内部事件错误'});
            return;
        }

        console.log('Save evidence emit event',evt.event);
        switch(evt.event){
            case "SaveEvi":
                var _flag = evt.returnValues[3];
                //modify the evidence file
                if (_flag == 1){
                    var msg = '存证修改完成,区块编号:'+evt.blockNumber+",交易哈希: "+evt.transactionHash;
                    var bakFileName = caseInfo.fileName+".bak.tmp";
                    //rename back up file to fileName+timestamp
                    eviDfs.exists(bakFileName,function(error,exist){
						if (error){
							console.log(error);
							res.send({'result':'fail','msg':'系统内部错误！'});
							return;
						}
                        if (exist){
                            var ts = new Date().Format('yyyyMMddhhmmss');
							var newFileName = caseInfo.fileName+"."+ts;
                            eviDfs.rename(bakFileName,newFileName,function(err){
                                if (err){
                                    console.error(err);
                                    //return;
                                }
                                res.send({'result':'ok','hash':caseInfo.fileHash});
                            });
                        }else{
                            res.send({'result':'ok','hash':caseInfo.fileHash});
                        }

                    })                    
                    
                }else {
                    evidb.addEviInfo(caseInfo.caseId,caseInfo.fileName,caseInfo.fileNameHash,caseInfo.fileHash,caseInfo.eviSrc,function(err,result){
                        console.log("save db ok!");
                        //var _res = {'result':'ok','msg':'存证新建完成,区块编号:'+evt.blockNumber+",交易哈希: "+evt.transactionHash};
                        var _res = {'result':'ok','hash':caseInfo.fileHash};
                        res.send(_res);
                    });
                }
                //res.send('存证完成,区块编号:'+evt.blockNumber+",交易哈希: "+evt.transactionHash);
                break;
            case "MuitSigNotSet":
                res.send({'result':'MuitSigNotSet','msg':"无法修改存证文件,请先设置多方签名的账号地址!"});
                break;
            case "MuitSigInvalidAccount":
                res.send({'result':'MuitSigInvalidAccount','msg':"无法修改存证文件,请确认多方签名账号是否与预设置一致!"});
                break;
            case "MuitSigWaitOtherSign":
                var _hash = evt.returnValues[0];
                var _needSigCount = evt.returnValues[1];
                res.send({'result':'MuitSigWaitOtherSign','msg':"无法修改存证文件，还需要其他"+_needSigCount+"方账户的签名!"});
                break;
            case "EviFileExist":
                var _hash = evt.returnValues[0];
                var msg = {'result':'EviFileExist','msg':'文件已存证，请勿重复操作!'};
                var fileName = caseInfo.fileName+".bak.tmp";
				console.log("Backup file is "+fileName);
                //remove the back up file
                eviDfs.exists(fileName,function(error,exist){
					if (error){
						console.error(error);
						res.send({'msg':'系统内部错误'});
						return;
					}
                    if (exist){
						console.log("bak file is exist");
                        eviDfs.remove(fileName,function(err){
                            if (err){
                                console.error(err);
                                //return;
                            }
                            res.send(msg);
                        });
                    }else{
                        res.send(msg);
                    }
                })
                break;
             default:
                res.send({'result':'unKnwon','msg':"未定义"});
                break;
            }
         });
}
function evidence(caseInfo,privateKey,res){
    var caseId = caseInfo.caseId;
    console.log('privateKey is '+privateKey);
    var encodeAbi = eviContract.methods.createCase(caseId).encodeABI();
    eviContract.methods.getEviAddr(caseId).call({from:web3.eth.defaultAccount},(error,result) => {
        if (error){
          console.error("getEviAddr failed ",error);
          return;
        } else {
          if (result == 0){
             console.log("getEviAddr is 0,need to create contract");
             sendMethod(eviContract,encodeAbi,privateKey,0,(evt,error) => {
                if (error){
                    console.log(error);
                    res.send({'result':'error','msg':'获取存证合约空间失败'});
                    return;
                }
                console.log("createCase callback");
                var fileEviAddr = evt.returnValues[0];
                console.log("fileEvidence contract address is ",fileEviAddr);
                if (fileEviAddr == 0){
                     res.send("存证失败，案件空间分配失败!");
                }else
                    saveEvidenceFile(fileEviAddr,caseInfo,privateKey,res);
              });

          }else {
             console.log("getEviAddr is "+result);
             var fileEviAddr = result;
             saveEvidenceFile(fileEviAddr,caseInfo,privateKey,res);
          }
        }

    });
}
app.get('/', function (req, res) {
   res.sendFile(__dirname+'/index.html');
});
app.get('/newAccount',(req,res) =>{
   var newAccount = web3.eth.accounts.create();
   console.log("账号地址:"+newAccount.address.substr(2)+"<br>"+"私钥"+newAccount.privateKey.substr(2));
   res.send("账号地址:"+newAccount.address.substr(2)+"\n"+"私钥"+newAccount.privateKey.substr(2));
});
app.post('/evidence',(req,res) => {
    console.log("evidence process "+req.body);
    var privateKey = req.body.privateKey;
    var caseId = req.body.eviCaseId;
    var fileName = req.body.fileName;
    var fileNameHash = req.body.fileNameHash;
    var fileHash = req.body.fileHash;
    var encodeAbi = eviContract.methods.createCase(caseId).encodeABI();
    console.log("Save evidence caseId is "+caseId+",privateKey is "+privateKey+",fileName is "+fileName);
    eviContract.methods.getEviAddr(caseId).call({from:web3.eth.defaultAccount},(error,result) => {
        if (error){
          console.error("getEviAddr failed ",error);
          return;
        } else {
          var caseInfo = {'caseId':caseId,'fileName':fileName,'fileNameHash':fileNameHash,'fileHash':fileHash};
          if (result == 0){
             console.log("getEviAddr is 0,need to create contract");
             sendMethod(eviContract,encodeAbi,privateKey,0,(evt) => {
                console.log("createCase callback");
                var fileEviAddr = evt.returnValues[0];
                console.log("fileEvidence contract address is ",fileEviAddr);
                if (fileEviAddr == 0){
                     res.send("存证失败，案件空间分配失败!");
                }else 
                    saveEvidenceFile(fileEviAddr,caseInfo,privateKey,res);
              });
              
          }else {
             console.log("getEviAddr is "+result);
             var fileEviAddr = result;
             saveEvidenceFile(fileEviAddr,caseInfo,privateKey,res);
          }
        }

    });
    
});
app.post('/mutisigSet',(req,res) => {
   var _index = req.body.index;
   var _caseId = req.body.eviCaseId;
   var fileNameHash = req.body.fileNameHash;
   //console.log("mutisigSet file name is "+_name);
   //var md5sum = crypto.createHash('md5');
   //var fileNameHash = '0x' + md5sum.update(_name).digest('hex').toLowerCase(); 
   var privateKey = req.body.privateKey;
   var account = web3.eth.accounts.privateKeyToAccount("0x"+privateKey).address; 
   var encodeAbi = eviContract.methods.setMutiSigAccount(_caseId,fileNameHash,_index,account).encodeABI();
   console.log("Mutisig set account is "+account+",privateKey is "+privateKey);
   sendMethod(eviContract,encodeAbi,privateKey,0,(evt) => {
     if (evt.event == "CaseIdNotExist"){
         res.send("请确认案件编号是否存在!");
     } 
   });
   res.send("多方签名账号"+account+"已设置");

});
app.get('/getEvidence',(req,res) => {
    var getName = req.query.getName;
    var caseId = req.query.getCaseId;
    res.header("Access-Control-Allow-Origin", "*");
    console.log('Get evidence caseid = '+caseId+',file hash is ',getName);
	eviDfs.get(getName,"downloads/"+getName,function(err){
		if (err){
                        console.error(err);
			res.send("文件下载失败");
			return;
		}
		var path = "downloads/"+getName;
		var md5sum = crypto.createHash('md5');
		var getHash = '0x' + md5sum.update(getName).digest('hex').toLowerCase(); 
		var eviContract = new web3.eth.Contract(abi,contractAddress);
		eviContract.methods.getEvidence(caseId,getHash).call({from:web3.eth.defaultAccount},function(error,result){
			if (!error){
			   console.log(result);
			   var code = result[0];
			   if (code == 3002){
				   res.send("查证文件不存在!!");
				   return;
			   }
			   var fileName = result[1];
			   var fileHashSave = result[2];
			   var dateValue = result[3];
			   var date = new Date(dateValue.toNumber());
			   var eviTime = date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() +" " +date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds();
			   var eviAccount = result[4];
			   console.log('eviTime = ',eviTime);
			   var md5sumFile = crypto.createHash('md5');
			   var stream = fs.createReadStream(path);
			   stream.on('data', function(chunk) {
				   md5sumFile.update(chunk);
			   });
			   stream.on('end', function() {
				   var fileHash = md5sumFile.digest('hex');
				   fileHash = "0x" + fileHash;
				   if (fileHash == fileHashSave){
					   console.log("上传时间:"+eviTime+",上传账号:"+eviAccount);
					   var file = __dirname+"/"+path;
					   res.download(file);
					   //res.send("上传时间:"+eviTime+",上传账号:"+eviAccount);
					   
				   }else {
					   res.send('存证文件已被篡改，请检查存档备份！上链哈希:'+fileHashSave+",文件哈希:"+fileHash);
				   }
			   }); 
			}
		})
	});
    
});

app.get('/getAllEvidence',(req,res)=>{
    var caseId = req.query.getAllCaseId;
    evidb.getCaseAllEvi(caseId,function(result){
        console.log(result);
        /*var resStr = "<table>";
        for (var i = 0; i < result.length;i++){
           resStr += "<tr><td>";
           resStr += "<a href = '/getEvidence?getCaseId="+result[i].caseId+"&getName="+result[i].fileName+"'>"+result[i].fileName+"</a>"
           resStr += "</td></tr>"
           
        }
       resStr += "</table>";*/
       var fileArray = [];
       for (var i = 0; i < result.length;i++){
           fileArray.push({'caseId':result[i].caseId,'fileName':result[i].fileName,'fileHash':result[i].fileHash,'eviSrc':result[i].eviSrc});
       }
       res.header("Access-Control-Allow-Origin", "*");
       res.send(fileArray);
    });
});
app.get('/evidenceRecord',(req,res)=>{
    var account = req.query.accountAddress;
    var caseId = req.query.recordCaseId;
    console.log('Query account '+account);
    var eviContract = new web3.eth.Contract(abi,contractAddress);
    eviContract.methods.getEviAddr(caseId).call({from:web3.eth.defaultAccount},(error,result) => {
        if (error){
          console.error("getEviAddr failed ",error);
          res.send("系统内部错误");
          return;
        } else {
          if (result == 0){
             console.log("getEviAddr is 0");
             res.send("案件编号不存在存证信息!");

          }else {
             console.log("getEviAddr is "+result);
             var fileContract = new web3.eth.Contract(abiFile,result);
            
             fileContract.getPastEvents("SaveEvi",{filter:{_oper:account},fromBlock:0,toBlock:'latest'},(error,result)=> {
             if (!error){
                var showList = "<table>";
                for (i = 0;i < result.length;i++){
                    var returnValue = result[i].returnValues;
                    var eventAccount = returnValue[0];
                    var dateValue = returnValue[1];
                    var eventDate = dateFtt(dateValue.toNumber());
                    var fileName = returnValue[2];
                    var opStr = (returnValue[3] == 0 )? "新建" : "修改";
                    var elem = '账户: '+eventAccount+",时间: "+eventDate+",文件: "+fileName+",操作: "+opStr;
                    console.log(elem);
                    showList += "<tr><td>"+elem+"</td><tr>"
                }
                showList += "</table>";
                res.send(showList);
            }
            else
                console.errer(error);
            }); 
          }
        }
    });
});
var formidable = require('formidable');
//app.use(express.bodyParser({uploadDir:'ctx-uploads/',keepExtension:true,limit:'50mb'}))
//app.post('/fileUpload', upload.single('file-to-upload'), (req, res) => {
app.post('/deleteFile',(req,res) => {
    var fileName = req.body.fileName;
    eviDfs.remove(fileName,function(error,result){
        if (!error){
            res.send({'result':'ok'});
        }else{
            res.send({'result':'error'});
        }
    })
});
app.post('/fileUpload', (req, res) => {
    var form = new formidable.IncomingForm();
    form.encoding = 'utf-8';
    form.uploadDir="./uploads";
    form.keepExtensions = true;
    form.parse(req, function(err, fields, files) {
        if (err) {
    	  console.error(err.message);
          return;
        }
        //console.log(files);
        //console.log(fields);
        var caseId = fields.eviCaseId;
        var privateKey = fields.privateKey;
        var eviSrc = "0";
        if (fields.hasOwnProperty("eviSrc")){
            eviSrc = fields.eviSrc;
        }
        var path = files['file-to-upload'].path;
        var originalname = files['file-to-upload'].name;
        console.log('Case id is '+caseId+',file name is '+originalname+',new name '+path);
        var start = new Date().getTime();
        var md5sum = crypto.createHash('md5');
        var fileNameHash = '0x' + md5sum.update(originalname).digest('hex').toLowerCase();
        var md5sumFile = crypto.createHash('md5');
        var stream = fs.createReadStream(path);
        stream.on('data', function(chunk) {
            md5sumFile.update(chunk);
        });
        stream.on('end', function() {
            var fileHash = md5sumFile.digest('hex').toUpperCase();
            fileHash = "0x" + fileHash;
            console.log('文件:'+originalname+',MD5签名为:'+fileHash+'.耗时:'+(new Date().getTime()-start)/1000.00+"秒");
            var msg = '文件:'+originalname+',文件名MD5签名为:'+fileNameHash+',文件内容MD5签名为:'+fileHash+'.耗时:'+(new Date().getTime()-start)/1000.00+"秒";
            var rst = {'_result':'ok','_hash':fileNameHash,'_file':fileHash,'_msg':msg};
            eviDfs.exists(originalname,function(err,exist){
		if (err){
			console.error("File upload fail",err);
			res.send({'_result':'fail','_msg':'系统错误，文件保存失败!'});
			return;
		}
		if (exist){
			//backup older file
			console.log("file "+originalname+" is exist now!");
			var bakName = originalname+".bak.tmp";
			eviDfs.rename(originalname,bakName,function(err){
	         		if (err){
			        	console.error("File upload rename backup file fail :",err);
					res.send({'_result':'fail','_msg':'系统错误，文件保存失败!'});
					return;
				}
				//save new file 
				eviDfs.save(originalname,path,function(error, etag) {
			          if(error) {
					  res.send({'_result':'fail','_msg':'系统错误，文件保存失败!'});
					  return console.log(error);
				  }
				  fs.unlink(path,function(err){
					  if (err){
						  console.error(err);
					  }
                                          var caseInfo = {'caseId':caseId,'fileName':originalname,'fileNameHash':fileNameHash,'fileHash':fileHash,'eviSrc':eviSrc};
                                          evidence(caseInfo,privateKey,res);
					  //res.send(rst);
				  });
					  
			      });
			}); 
                 } else {
			//save new file 
			eviDfs.save(originalname,path,function(error, etag) {
			  if(error) {
				  res.send({'_result':'fail','_msg':'系统错误，文件保存失败!'});
				  return;
			  }
			  fs.unlink(path,function(err){
				  if (err){
					  console.error(err);
				  }
                                  var caseInfo = {'caseId':caseId,'fileName':originalname,'fileNameHash':fileNameHash,'fileHash':fileHash,'eviSrc':eviSrc};
                                  evidence(caseInfo,privateKey,res);
		        	  //res.send(rst);
			  });
			});
                 
		} 
             });    
        });

    });
});
function getPrivateKey(){
   var fromkey = keythereum.importFromFile("0x47ba8aab8fd55dc8b31abd0b90f79208fb3c21a6", "../qdata");
        //recover输出为buffer类型的私钥
   var privateKey = keythereum.recover('', fromkey);
   //console.log(privateKey.toString('hex'));
   return privateKey.toString('hex');
}
var server = app.listen(8080, function () {
 
  var host = server.address().address;
  var port = server.address().port;
  console.log("start");
})
