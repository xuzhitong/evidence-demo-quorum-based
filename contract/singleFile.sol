contract fileCtxEvidence{
    enum EviState { FINISHED,START_MOD,WAIT_OTHER_SIG,CANCEL_MOD,WAIT_LEFT_TILES }
    uint caseId;
    struct FileEvi{
        string fileName;
        bytes fileCtx;
        uint upTime;
        address upOperator;
        EviState state;
        //uint []tilesIndex;
        address[3] mutiSigAccounts; 
    }
    mapping(string => FileEvi) evi;
    event SaveEvi(address _oper,uint _time,string _name,uint _flag);
    event WaitTiles(string _name,uint leftTilesCount);
    //event MutiSigDuplicateSign(bytes16 _hash,address _account);
    event MuitSigNotSet(bytes16 _hash);
    event MuitSigInvalidAccount(bytes16 _hash,uint index,address _account);
    event MuitSigWaitOtherSign(bytes16 _hash,uint needSigNumber);
    event EviFileExist(bytes16 _hash);
    constructor (uint _id) public{
        caseId = _id;
    }
   // modifier allowMod()
    function setMutiSigAccount(string name,uint index,address account){
        require(index >= 0 && index < 3);
        evi[name].mutiSigAccounts[index] = account;
    }
    function saveFileEvi(string _name,bytes _file,uint _upTime ) public{
            evi[_name].fileName = _name;
            evi[_name].upTime = _upTime;
            evi[_name].upOperator = tx.origin;
            evi[_name].fileCtx = _file;
            
        emit SaveEvi(tx.origin,_upTime,_name,0);


    }
    function getFileEvi(string _name) public view returns(bytes _file,uint _upTime,address _upOperator) {
        _file = evi[_name].fileCtx;
        _upTime = evi[_name].upTime;
        _upOperator = evi[_name].upOperator;
    }
}
