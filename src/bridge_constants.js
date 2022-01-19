// CONTRACT ADDRESSES
export const SWAP_CONTRACT_ADDRESS = '0x4396fCb5f037E8C9bf26Cb6b37d058afF9736CC6'
export const ELYS_CONTRACT_ADDRESS = '0xd89cc0d2A28a769eADeF50fFf74EBC07405DB9Fc'
export const FTM_CONTRACT_ADDRESS = '0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83'
export const RENBTC_CONTRACT__ADDRESS = '0xdbf31df14b66535af65aac99c32e9ea844e14501'
export const ZOO_ROUTER_ADDRESS = '0x40b12a3E261416fF0035586ff96e23c2894560f2'
export const HYPER_ROUTER_ADDRESS = '0x53c153a0df7E050BbEFbb70eE9632061f12795fB'
export const REN_BURN_GASLIMIT = 173781
// CONTRACT ABIs
export const routerAbi = [
    'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)'
]
export const tokenAbi = [
    'function balanceOf(address _owner) public view returns(uint256 balance)',
    'function approve(address _spender, uint256 _value) public returns (bool success)',
    'function allowance(address _owner, address _spender) public view returns (uint256 remaining)'
]