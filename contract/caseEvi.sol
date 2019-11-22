import "./fileEvi.sol";
contract caseEvidence{
    uint CODE_SUCCESS = 0;
    uint FILE_NOT_EXIST = 3002;
    uint FILE_ALREADY_EXIST  = 3003;
    uint USER_NOT_EXIST = 3004;

    event GetCaseAddr(address _addr);
    event CaseIdNotExist(string caseId);
    mapping(string => address) caseEvidenceMap;
    function createCase(string caseId) public{
        address fileEviAddr = caseEvidenceMap[caseId];
        if (fileEviAddr == 0) {
          fileEviAddr = new fileEvidence(caseId); 
          caseEvidenceMap[caseId] = fileEviAddr;
        } 
        emit GetCaseAddr(fileEviAddr);
    }
    function saveEvidence(string caseId,bytes16 fileNameHash,string fileName, bytes16 fileHash,uint fileUploadTime) public returns(uint code,address addr){
        address fileEviAddr = caseEvidenceMap[caseId];
        if (fileEviAddr == 0) {
          fileEviAddr = new fileEvidence(caseId); 
          caseEvidenceMap[caseId] = fileEviAddr;
        } 
        fileEvidence fileEvi = fileEvidence(fileEviAddr);
        fileEvi.saveFileEvi(fileNameHash,fileName,fileHash,fileUploadTime);
        return (0,fileEviAddr);
    }

    function getEviAddr(string caseId) public view returns(address addr){
        return caseEvidenceMap[caseId];
    }
    function getEvidence(string caseId,bytes16 fileHash) public view returns(uint _code,string _name,bytes16 _hash,uint _upTime,address _upOperator) {
        address fileEviAddr = caseEvidenceMap[caseId];
        fileEvidence fileEvi = fileEvidence(fileEviAddr);
        bytes16 _file;
        (_name,_file,_upTime,_upOperator) = fileEvi.getFileEvi(fileHash);
        if(_upTime == 0){
            return (FILE_NOT_EXIST,"","",0,msg.sender);
        }
        return (CODE_SUCCESS,_name,_file,_upTime,_upOperator);
    }
    function setMutiSigAccount(string caseId,bytes16 _hash,uint _index,address _account) public{
        address fileEviAddr = caseEvidenceMap[caseId];
        if (fileEviAddr == 0)
            emit CaseIdNotExist(caseId);
        fileEvidence fileEvi = fileEvidence(fileEviAddr);
        fileEvi.setMutiSigAccount(_hash,_index,_account);
    }
    
}