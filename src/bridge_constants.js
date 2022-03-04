// CONTRACT ADDRESSES
export const SWAP_CONTRACT_ADDRESS = '0x4396fCb5f037E8C9bf26Cb6b37d058afF9736CC6'
export const ELYS_CONTRACT_ADDRESS = '0xd89cc0d2A28a769eADeF50fFf74EBC07405DB9Fc'
export const WFTM_CONTRACT_ADDRESS = '0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83'
export const WBTC_CONTRACT_ADDRESS = '0x321162Cd933E2Be498Cd2267a90534A804051b11'
export const CURVE_WBTC_RENBTC_ADDRESS = '0x3eF6A01A0f81D6046290f3e2A8c5b843e738E604'
export const SPOOKYSWAP_ROUTER_ADDRESS = '0xF491e7B69E4244ad4002BC14e878a34207E38c29'
export const ELYS_FTM_PAIR = '0x6831b2EDe25Dcc957256FAE815f051181F6C7b08'
export const FTM_USD_PAIR = '0x2b4C76d0dc16BE1C31D4C1DC53bF9B45987Fc75c'
export const REN_BURN_GASLIMIT = 173781

// CURVE WBTC-RENBTC STABLESWAP TOKEN IDS
export const CURVE_WBTC_C = '0'
export const CURVE_RBTC_C = '1'

// CONTRACT ABIs
export const uniswapV2RouterAbi = [
    'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)'
]

export const curveStableSwapAbi = [
    'function get_dy(int128 i, int128 j, uint256 _dx) external view returns(uint256)',
    'function exchange(int128 i, int128 j, uint256 _dx, uint256 _min_dy) external returns(uint256)'
]

export const tokenAbi = [
    'function balanceOf(address _owner) public view returns(uint256 balance)',
    'function approve(address _spender, uint256 _value) public returns (bool success)',
    'function allowance(address _owner, address _spender) public view returns (uint256 remaining)'
]