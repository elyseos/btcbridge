// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.6;

import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface ICurveStableSwap {
    // get_dy(i: int128, j: int128, _dx: uint256) -> uint256: view
    function get_dy(int128 i, int128 j, uint256 _dx) external view returns(uint256);
    // exchange(i: int128, j: int128, _dx: uint256, _min_dy: uint256) -> uint256
    function exchange(int128 i, int128 j, uint256 _dx, uint256 _min_dy) external returns(uint256);
}

interface IGateway {
    function mint(bytes32 _pHash, uint256 _amount, bytes32 _nHash, bytes calldata _sig) external returns (uint256);
    function burn(bytes calldata _to, uint256 _amount) external returns (uint256);
}

interface IGatewayRegistry {
    function getGatewayBySymbol(string calldata _tokenSymbol) external view returns (IGateway);
    function getTokenBySymbol(string calldata _tokenSymbol) external view returns (IERC20);
}

contract ELYSBTCSwap {
    event ELYStoRenBTCSwap(address indexed receiver, uint ELYSIn, uint renBTCOut);
    event BTCToELYSSwap(address indexed receiver, uint renBTCIn, uint ELYSOut);
    
    // Token addresses
    IERC20 ELYS = IERC20(0xd89cc0d2A28a769eADeF50fFf74EBC07405DB9Fc);
    address WFTM = 0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83;
    IERC20 WBTC = IERC20(0x321162Cd933E2Be498Cd2267a90534A804051b11);
    IERC20 renBTC = IERC20(0xDBf31dF14B66535aF65AaC99C32e9eA844e14501);

    // Router/Swap contracts
    IUniswapV2Router02 spookySwapRouter = IUniswapV2Router02(0xF491e7B69E4244ad4002BC14e878a34207E38c29);
    ICurveStableSwap curveBTCSwap = ICurveStableSwap(0x3eF6A01A0f81D6046290f3e2A8c5b843e738E604);
    // RenVM registry
    IGatewayRegistry registry = IGatewayRegistry(0xf36666C230Fa12333579b9Bd6196CB634D6BC506);

    // token IDs in `curveBTCSwap` pool
    int128 constant CURVE_WBTC_C = 0;
    int128 constant CURVE_RBTC_C = 1;

    // Swap ELYS->RenBTC, caller has to approve ELYS to the contract first
    function swapELYSToRenBTC(uint amountIn) public returns(uint renBTCOut) {
        // Transfer ELYS from caller to the contract
        ELYS.transferFrom(msg.sender, address(this), amountIn);

        // Execute on SpookySwap
        // Define swap path from ELYS->WFTM->WBTC  
        address[] memory path = new address[](3);
        path[0] = address(ELYS);
        path[1] = address(WFTM);
        path[2] = address(WBTC);

        ELYS.approve(address(spookySwapRouter), amountIn);
        uint WBTCOut = spookySwapRouter.swapExactTokensForTokens(amountIn, 1, path, address(this), block.timestamp)[path.length-1];

        // Execute on Curve StableSwap contract
        WBTC.approve(address(curveBTCSwap), WBTCOut);
        renBTCOut = curveBTCSwap.exchange(CURVE_WBTC_C, CURVE_RBTC_C, WBTCOut, 1);
        renBTC.transfer(msg.sender, renBTCOut);

        emit ELYStoRenBTCSwap(msg.sender, amountIn, renBTCOut);
    }

    function swapBTCToELYS(
        address        _user,
        uint256        _amount,
        bytes32        _nHash,
        bytes calldata _sig
    ) external {
        bytes32 pHash = keccak256(abi.encode(_user));
        uint256 mintedAmount = registry.getGatewayBySymbol("BTC").mint(pHash, _amount, _nHash, _sig);

        _swapRenBTCToELYS(mintedAmount, _user);
    }
    
    function _swapRenBTCToELYS(uint amountIn, address user) internal returns(uint ELYSOut) {
        // Execute on Curve StableSwap contract
        renBTC.approve(address(curveBTCSwap), amountIn);
        uint WBTCOut = curveBTCSwap.exchange(CURVE_RBTC_C, CURVE_WBTC_C, amountIn, 1);

        // Execute on SpookySwap
        address[] memory path = new address[](3);
        path[0] = address(WBTC);
        path[1] = address(WFTM);
        path[2] = address(ELYS);
        
        WBTC.approve(address(spookySwapRouter), WBTCOut);
        ELYSOut = spookySwapRouter.swapExactTokensForTokens(WBTCOut, 1, path, user, block.timestamp)[path.length-1];
        
        emit BTCToELYSSwap(user, amountIn, ELYSOut);
    }
}