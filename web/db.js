var MongoClient = require('mongodb').MongoClient;
var DB_CONN_STR = "mongodb://127.0.0.1:27017/evidb";
function EviDb(){
    this.createDb = function(){
        MongoClient.connect(url, { useNewUrlParser: true }, function(err, db) {
          if (err) throw err;
          console.log("数据库已创建!");
          var dbase = db.db("evidb");
          dbase.createCollection('userinfo', function (err, res) {
            if (err) throw err;
            console.log("创建集合!");
            db.close();
          });
          dbase.createCollection('caseInfo', function (err, res) {
          if (err) throw err;
          console.log("创建集合!");
          db.close();
          });
          db.close();
        });
    };
    this.addEviInfo = function(caseId,fileName,fileNameHash,fileHash,eviSrc,callback) {  
        MongoClient.connect(DB_CONN_STR,{ useNewUrlParser: true }, function(err, db) {
            if (err){
                console.error("Connect to database failed,error is ",err);
                return;
            }
                        console.log("Connect to database!");
                        var dbo = db.db('evidb');
                        var collection = dbo.collection('caseInfo');
                        var data = {"caseId":caseId,"fileName":fileName,"fileNameHash":fileNameHash,"fileHash":fileHash,"eviSrc":eviSrc};
            collection.insertOne(data, function(err,result){
                if(err)
                {
                    console.log('Error:'+ err);
                                        db.close();
                    return;
                } 
                                //console.log(result);
                                db.close();
                callback(result);
            });
        });
    };
        
        this.getEviFileInfo = function(caseId,fileName,callback){
             MongoClient.connect(DB_CONN_STR,{ useNewUrlParser: true }, function(err, db) {
                        if (err){
                                console.error("Connect to database failed,error is ",err);
                                return;
                        }
                        var dbo = db.db('evidb');
                        var collection = dbo.collection('caseInfo');
                        var where={'caseId':caseId,'fileName':fileName};
                        var set = {fileName:1,eviSrc:1};
                        collection.find(where,set).toArray(function(err, result) {
                                if(err)
                                {
                                        console.log('Error:'+ err);
                                        db.close();
                                        return;
                                }
                                db.close();
                                callback(result);
                        });
                });
       
        }
        this.getEviFileNameByHash = function(fileNameHash,callback){
                 MongoClient.connect(DB_CONN_STR,{ useNewUrlParser: true }, function(err, db) {
                        if (err){
                                console.error("Connect to database failed,error is ",err);
                                return;
                        }
                        var dbo = db.db('evidb');
                        var collection = dbo.collection('caseInfo');
                        var where={'fileNameHash':fileNameHash};
                        var set = {fileName:1};
                        collection.findOne(where,set).toArray(function(err, result) {
                                if(err)
                                {
                                    console.error('database find one error ',err);
                                }else{
            
                                }
                                db.close();
                                callback(err,result);
                        });
                });
        }
    this.getCaseAllEvi = function(caseId,callback){
        MongoClient.connect(DB_CONN_STR,{ useNewUrlParser: true }, function(err, db) {
            if (err){
                console.error("Connect to database failed,error is ",err);
                return;
            }
                        var dbo = db.db('evidb');
                        var collection = dbo.collection('caseInfo');
                        var where={'caseId':caseId};
                        var set = {caseId:1,fileName:1,eviSrc:1};
            collection.find(where,set).toArray(function(err, result) { 
                if(err)
                {
                    console.log('Error:'+ err);
                                        db.close();
                    return;
                } 
                                db.close();
                callback(result);
            });
        });
    };
}
module.exports = EviDb;

