var Minio = require("minio");
function EviDfs(){
    var minioClient = new Minio.Client({
        endPoint: '10.100.9.74',
        port: 9000,
        useSSL: false,
        accessKey: 'minio',
        secretKey: 'Quorum123456'
    });
    this.exists = function(fileName,callback){
        minioClient.statObject('test', fileName, function(err, stat) {
            var exists = true;
            if (err) {
                //console.log(err);
                if (err.code == "NotFound"){
                     //save new file 
                     exists = false;
                     callback(null,exists)
                }else{
                    callback(err,exists);
                }
            } else {
                callback(null,exists);
            } 
        });
    };
    this.rename = function(oldFileName,newFileName,callback){
        this.exists(oldFileName,function(err,exists){
            if (err){
                callback(err,null);
            }else{
                if (exists == false){
                    
                    callback(new Error('Source file is not exist'),null);
                }else{
                        minioClient.copyObject('test',newFileName,'test/'+oldFileName,function(err,data){
                            if (err){
                                callback(new Error('Copy file failed by :'+err.toString()));
                                return;
                            }
                            minioClient.removeObject('test',oldFileName,function(err){
                                if (err){
                                    callback(new Error('Remove file failed by :'+err.toString()));
                                    return;
                                }
                                callback(null);
                            });
                        });                     
                    }
                }
            });
    };
    this.save =  function(fileName,path,callback){
            var metaData = {
                'Content-Type': 'application/octet-stream',
                'X-Amz-Meta-Testing': 1234,
                'example': 5678
            };
            minioClient.fPutObject("test", fileName,path, metaData, function(error, etag) {
                if(error) {
                    callback(error)
                    return;
                }
                callback(null,etag);
            });
    };
    this.get = function(fileName,filePath,callback){
        minioClient.fGetObject("test",fileName,filePath,function(err){
            if (err){
                callback(err);
            }else{
                callback(null);
            }
        })
    }
    this.remove = function(fileName,callback){
        minioClient.removeObject('test',fileName,function(err){
            if (err){
                callback(err);
                return;
            }
            callback(null);
        });
    };
}
module.exports = EviDfs;

