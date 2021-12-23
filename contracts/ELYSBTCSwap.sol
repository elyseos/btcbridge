// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.6;

import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "hardhat/console.sol";

contract ELYSBTCSwap {
    event ELYStoRenBTCSwap(address indexed, uint ELYSIn, uint renBTCOut);
    event RenBTCToELYSSwap(address indexed, uint renBTCIn, uint ELYSOut);
        
    IERC20 public ELYS = IERC20(0xd89cc0d2A28a769eADeF50fFf74EBC07405DB9Fc);
    IERC20 public WFTM = IERC20(0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83);
    IERC20 public renBTC = IERC20(0xDBf31dF14B66535aF65AaC99C32e9eA844e14501);

    IUniswapV2Router02 public zooDexRouter = IUniswapV2Router02(0x40b12a3E261416fF0035586ff96e23c2894560f2);
    IUniswapV2Router02 public hyperJumpRouter = IUniswapV2Router02(0x53c153a0df7E050BbEFbb70eE9632061f12795fB);

    function swapELYSToRenBTC(uint amountIn) public returns(uint renBTCOut) {
        ELYS.transferFrom(msg.sender, address(this), amountIn);

        address[] memory path = new address[](2);
        path[0] = address(ELYS);
        path[1] = address(WFTM);

        ELYS.approve(address(zooDexRouter), amountIn);
        uint WFTMOut = zooDexRouter.swapExactTokensForTokens(amountIn, 1, path, address(this), block.timestamp)[1];

        path[0] = address(WFTM);
        path[1] = address(renBTC);
        
        WFTM.approve(address(hyperJumpRouter), WFTMOut);
        renBTCOut = hyperJumpRouter.swapExactTokensForTokens(WFTMOut, 1, path, msg.sender, block.timestamp)[1];
        
        emit ELYStoRenBTCSwap(msg.sender, amountIn, renBTCOut);
    }

    function swapRenBTCToELYS(uint amountIn) public returns(uint ELYSOut) {
        renBTC.transferFrom(msg.sender, address(this), amountIn);

        address[] memory path = new address[](2);
        path[0] = address(renBTC);
        path[1] = address(WFTM);

        renBTC.approve(address(hyperJumpRouter), amountIn);
        uint WFTMOut = hyperJumpRouter.swapExactTokensForTokens(amountIn, 1, path, address(this), block.timestamp)[1];

        path[0] = address(WFTM);
        path[1] = address(ELYS);
        
        WFTM.approve(address(zooDexRouter), WFTMOut);
        ELYSOut = zooDexRouter.swapExactTokensForTokens(WFTMOut, 1, path, msg.sender, block.timestamp)[1];
        
        console.log("ELYSOut:", ELYSOut);
        emit RenBTCToELYSSwap(msg.sender, amountIn, ELYSOut);
    }
}