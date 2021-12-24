// CONTRACT ADDRESSES
export const SWAP_CONTRACT_ADDRESS = '0xE4A417A7C1336E8aB142a40361c8606FA5a4bD10'
export const ELYS_CONTRACT_ADDRESS = '0xd89cc0d2A28a769eADeF50fFf74EBC07405DB9Fc'
export const FTM_CONTRACT_ADDRESS = '0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83'
export const RENBTC_CONTRACT__ADDRESS = '0xdbf31df14b66535af65aac99c32e9ea844e14501'
export const ZOO_ROUTER_ADDRESS = '0x40b12a3E261416fF0035586ff96e23c2894560f2'
export const HYPER_ROUTER_ADDRESS = '0x53c153a0df7E050BbEFbb70eE9632061f12795fB'

// CONTRACT ABIs
export const routerAbi = [
    'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)'
]
export const tokenAbi = [
    'function balanceOf(address _owner) public view returns(uint256 balance)',
    'function approve(address _spender, uint256 _value) public returns (bool success)',
    'function allowance(address _owner, address _spender) public view returns (uint256 remaining)'
]