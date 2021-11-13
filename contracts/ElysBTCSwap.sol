pragma solidity =0.6.6;

import '@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

contract ELYSBTCSwap {
    IERC20 public ELYS = IERC20(0xd89cc0d2A28a769eADeF50fFf74EBC07405DB9Fc);
    IERC20 public WFTM = IERC20(0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83);
    IERC20 public renBTC = IERC20(0xDBf31dF14B66535aF65AaC99C32e9eA844e14501);

    IUniswapV2Router02 public zooDexRouter = IUniswapV2Router02(0x40b12a3E261416fF0035586ff96e23c2894560f2);
    IUniswapV2Router02 public hyperJumpRouter = IUniswapV2Router02(0x53c153a0df7E050BbEFbb70eE9632061f12795fB);
    
    function GetCumulativeWFTMOut(uint amountIn) public view returns(uint amount) {
        address[] memory path = new address[](2);
        path[0] = address(ELYS);
        path[1] = address(WFTM);
        amount = zooDexRouter.getAmountsOut(amountIn, path)[1];
    }

    function GetCumulativeRenBTCOut(uint amountIn) public view returns(uint amount) {
        address[] memory path = new address[](2);
        path[0] = address(WFTM);
        path[1] = address(renBTC);
        amount = hyperJumpRouter.getAmountsOut(amountIn, path)[1];
    }

    function swapELYSrenBTC(uint amountIn) public returns(uint renBTCOut) {
        require(ELYS.transferFrom(msg.sender, address(this), amountIn), 'transferFrom failed.');

        address[] memory paths0 = new address[](2);
        paths0[0] = address(ELYS);
        paths0[1] = address(WFTM);
        uint WFTMOutMin = (GetCumulativeWFTMOut(amountIn) * 95) / 100;  // 5% max slippage 
        uint WFTMOut = zooDexRouter.swapExactTokensForTokens(amountIn, WFTMOutMin, paths0, address(this), block.timestamp)[1];

        address[] memory paths1 = new address[](2);
        paths1[0] = address(WFTM);
        paths1[1] = address(renBTC);
        uint renBTCOutMin = (GetCumulativeRenBTCOut(WFTMOut) * 95) / 100;  // 5% max slippage 
        renBTCOut = hyperJumpRouter.swapExactTokensForTokens(amountIn, renBTCOutMin, paths1, msg.sender, block.timestamp)[1];
    }
}