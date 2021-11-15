pragma solidity =0.6.6;

import '@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

contract ELYSBTCSwap {
    event ELYStoWFTMSwap(address indexed, uint, uint);
    event WFTMtoRenBTCSwap(address indexed, uint, uint);
    
    // For mitigating the requirement for WFTM approval
    mapping(address=>uint) public pendingWFTM;
    
    IERC20 public ELYS = IERC20(0xd89cc0d2A28a769eADeF50fFf74EBC07405DB9Fc);
    IERC20 public WFTM = IERC20(0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83);
    IERC20 public renBTC = IERC20(0xDBf31dF14B66535aF65AaC99C32e9eA844e14501);

    IUniswapV2Router02 public zooDexRouter = IUniswapV2Router02(0x40b12a3E261416fF0035586ff96e23c2894560f2);
    IUniswapV2Router02 public hyperJumpRouter = IUniswapV2Router02(0x53c153a0df7E050BbEFbb70eE9632061f12795fB);
    
    function transferPendingWFTM() public {
        require(pendingWFTM[msg.sender] > 0, "No pending WFTM");
        
        WFTM.transfer(msg.sender, pendingWFTM[msg.sender]);
        pendingWFTM[msg.sender] = 0;
    }
    
    function swapELYSforWFTMUnchecked(uint amountIn) public returns(uint WFTMOut) {
        require(ELYS.transferFrom(msg.sender, address(this), amountIn), 'transferFrom failed.');

        address[] memory path = new address[](2);
        path[0] = address(ELYS);
        path[1] = address(WFTM);

        ELYS.approve(address(zooDexRouter), amountIn);
        WFTMOut = zooDexRouter.swapExactTokensForTokens(amountIn, 0, path, address(this), block.timestamp)[1];
        
        // Clear pending WFTM balances 
        if (pendingWFTM[msg.sender] > 0)
            WFTM.transfer(msg.sender, pendingWFTM[msg.sender]);
        pendingWFTM[msg.sender] = WFTMOut;
        
        emit ELYStoWFTMSwap(msg.sender, amountIn, WFTMOut);
    }
    
    function swapWFTMforRenBTCUnchecked() public returns(uint renBTCOut) {
        require(pendingWFTM[msg.sender] > 0, "Use the swapELYSforWFTMUnchecked method first");
        
        address[] memory path = new address[](2);
        path[0] = address(WFTM);
        path[1] = address(renBTC);
        
        WFTM.approve(address(hyperJumpRouter), pendingWFTM[msg.sender]);
        
        uint FTMin = pendingWFTM[msg.sender];
        pendingWFTM[msg.sender] = 0;
        renBTCOut = hyperJumpRouter.swapExactTokensForTokens(FTMin, 0, path, msg.sender, block.timestamp)[1];
        
        emit WFTMtoRenBTCSwap(msg.sender, FTMin, renBTCOut);
    }
}