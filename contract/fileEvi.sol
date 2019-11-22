contract fileEvidence{
    enum EviState { FINISHED,START_MOD,WAIT_OTHER_SIG,CANCEL_MOD }
    string caseId;
    uint filesCount;
    struct FileEvi{
        bytes16 fileNameHash;
        string fileName;
        bytes16 fileContentHash;
        uint upTime;
        address upOperator;
        EviState state;
        address[3] mutiSigAccounts; 
    }
    mapping(uint => bytes16) eviIndex;
    mapping(bytes16 => FileEvi) evi;
    event SaveEvi(address _oper,uint _time,string _name,uint _flag);
    //event MutiSigDuplicateSign(bytes16 _hash,address _account);
    event MuitSigNotSet(bytes16 _hash);
    event MuitSigInvalidAccount(bytes16 _hash,uint index,address _account);
    event MuitSigWaitOtherSign(bytes16 _hash,uint needSigNumber);
    event EviFileExist(bytes16 _hash);
    constructor (string _id) public{
        caseId = _id;
        filesCount = 0;
    }
   // modifier allowMod()
    function setMutiSigAccount(bytes16 hash,uint index,address account){
        require(index >= 0 && index < 3);
        evi[hash].mutiSigAccounts[index] = account;
    }
    function saveFileEvi(bytes16 _hash,string _name,bytes16 _file,uint _upTime ) public{
        if (evi[_hash].fileNameHash == 0)
        {
            evi[_hash].fileNameHash = _hash;
            evi[_hash].fileName = _name;
            evi[_hash].fileContentHash = _file;
            evi[_hash].upTime = _upTime;
            evi[_hash].upOperator = tx.origin;
            evi[_hash].state = EviState.FINISHED;
            /*for (uint i = 0; i < 3; i++){
                evi[_hash].mutiSigAccounts[i] = 0;
            }*/
            evi[_hash].mutiSigAccounts[0] = tx.origin;
            eviIndex[filesCount] = _hash;
            filesCount++;
            emit SaveEvi(tx.origin,_upTime,_name,0);
        } else {
            //someone want to modify the evidence
            if (_file != evi[_hash].fileContentHash)
            {
                for (uint i = 0; i < 3; i++)
                {
                    if (evi[_hash].mutiSigAccounts[i] == 0){
                        emit MuitSigNotSet(_hash);
                        return;
                    }
                }
                if (evi[_hash].state == EviState.FINISHED){
                    if (evi[_hash].mutiSigAccounts[0] == tx.origin){
                        evi[_hash].state = EviState.START_MOD;
                        emit MuitSigWaitOtherSign(_hash,2);
                    } else {    
                        emit MuitSigInvalidAccount(_hash,0,tx.origin);
                        return;
                    }
                }
                else if (evi[_hash].state == EviState.START_MOD)
                {
                    if (evi[_hash].mutiSigAccounts[1] == tx.origin)
                    {
                        evi[_hash].state = EviState.WAIT_OTHER_SIG;
                        emit MuitSigWaitOtherSign(_hash,1);
                    } else {
                        emit MuitSigInvalidAccount(_hash,1,tx.origin);
                        return;
                    }
                    
                } else if (evi[_hash].state == EviState.WAIT_OTHER_SIG) {
                    if (evi[_hash].mutiSigAccounts[2] == tx.origin) {
                        evi[_hash].state = EviState.FINISHED;
                        evi[_hash].fileContentHash = _file;
                        evi[_hash].upTime = _upTime;
                        evi[_hash].upOperator = evi[_hash].mutiSigAccounts[0];
                        emit SaveEvi(evi[_hash].mutiSigAccounts[0],_upTime,_name,1);
                    } else {
                        emit MuitSigInvalidAccount(_hash,2,tx.origin);
                        return;
                    }
                }
                    
            } else {
                emit EviFileExist(_hash);
            }
        }
    }
    function getFileEvi(bytes16 _hash) public view returns(string _name,bytes16 _file,uint _upTime,address _upOperator) {
        _name = evi[_hash].fileName;
        _file = evi[_hash].fileContentHash;
        _upTime = evi[_hash].upTime;
        _upOperator = evi[_hash].upOperator;
    }
}
