contract fileCtxEvidence{
    enum EviState { FINISHED,START_MOD,WAIT_OTHER_SIG,CANCEL_MOD,WAIT_LEFT_TILES }
    uint caseId;
    struct Tile{
        uint tileIndex;
        bytes tileCtx;
    }
    struct FileEvi{
        string fileName;
        Tile[] tilesCtx;
        uint upTime;
        address upOperator;
        EviState state;
        uint tilesCount;
        //uint []tilesIndex;
        address[3] mutiSigAccounts; 
    }
    mapping(string => FileEvi) evi;
    event SaveEvi(address _oper,uint _time,string _name,uint _flag);
    event WaitTiles(string _name,uint nextTileIndex);
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
    function saveFileEvi(string _name,uint tileIndex,uint tilesCount,bytes _tile,uint _upTime ) public{
            bytes memory nameBytes = bytes(evi[_name].fileName);
            if (nameBytes.length == 0){
                evi[_name].fileName = _name;
                evi[_name].tilesCount = tilesCount;
                evi[_name].upOperator = tx.origin;
            }
            
            /*for (uint i = 0; i < tilesCount;i++){
                if (evi[_name].tilesCtx[i].tileIndex == tileIndex){
                    //evi[_name].tilesCtx[i].tileCtx = _tile;
                }else{
                    evi[_name].tilesCtx.push(Tile(tileIndex,_tile));
                }
            }*/
            evi[_name].tilesCtx.push(Tile(tileIndex,_tile));
            if (evi[_name].tilesCtx.length < evi[_name].tilesCount){
                evi[_name].state = EviState.WAIT_LEFT_TILES;
                emit WaitTiles(_name,tileIndex+1);
            } else {
                evi[_name].state = EviState.FINISHED; 
                evi[_name].upTime = _upTime;
                emit SaveEvi(tx.origin,_upTime,_name,0);
            }
    }
    function getTilesCount(string _name) public view returns (uint tilesCount){
        return evi[_name].tilesCount;
    }
    function getFileEvi(string _name,uint tileIndex) public view returns(bytes _tile,uint _upTime,address _upOperator) {
         //require(tileIndex > 0 && tileIndex < evi[_name].tilesCount);
         for (uint i = 0; i < evi[_name].tilesCount;i++){
             if (evi[_name].tilesCtx[i].tileIndex == tileIndex){
                 _tile = evi[_name].tilesCtx[tileIndex].tileCtx;
                 _upTime = evi[_name].upTime;
                 _upOperator = evi[_name].upOperator;
                 break;
             }
         }
         
         if (i == evi[_name].tilesCount)
             return ("",0,0);
    }
}
