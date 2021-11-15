import { useRef, useState, useEffect } from 'react'
import { Box, Container, Stack } from "@chakra-ui/layout"
import { Text, Button, ButtonGroup, Input, Image, Spinner, useToast } from '@chakra-ui/react'
import { useWeb3React } from "@web3-react/core"
import { ethers } from 'ethers'
import { Bitcoin, Fantom } from "@renproject/chains"
import RenJS from "@renproject/ren";
import { validate } from 'bitcoin-address-validation';
// import swapAbi from './abi/ElysBTCSwap.json'

// CONTRACT ADDRESSES
const SWAP_CONTRACT_ADDRESS = '0x924eE9804f297A3225ed39FdF8162beB0D9a9F21'
const ELYS_CONTRACT_ADDRESS = '0xd89cc0d2A28a769eADeF50fFf74EBC07405DB9Fc'
const FTM_CONTRACT_ADDRESS = '0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83'
const RENBTC_CONTRACT__ADDRESS = '0xdbf31df14b66535af65aac99c32e9ea844e14501'
const ZOO_ROUTER_ADDRESS = '0x40b12a3E261416fF0035586ff96e23c2894560f2'
const HYPER_ROUTER_ADDRESS = '0x53c153a0df7E050BbEFbb70eE9632061f12795fB'

// CONTRACT ABIs
const routerAbi = [
    'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)'
]
const tokenAbi = [
    'function balanceOf(address _owner) public view returns(uint256 balance)',
    'function approve(address _spender, uint256 _value) public returns (bool success)',
    'function allowance(address _owner, address _spender) public view returns (uint256 remaining)'
]

const swapAbi = [
    'mapping(address => uint) public pendingWFTM(address)',
    'function swapELYSforWFTMUnchecked(uint amountIn) public returns(uint WFTMOut)',
    'function swapWFTMforRenBTCUnchecked() public returns(uint renBTCOut)',
    'function transferPendingWFTM() public'
]

const BridgeMain = () => {
    const { account, library } = useWeb3React()
    const [estimatedBtcOut, setEstimateBtcOut] = useState(0)

    const zooRouter = useRef(null)
    const hyperRouter = useRef(null)
    const elysContract = useRef(null)
    const swapContract = useRef(null)

    const [elysIn, setElysIn] = useState('')
    const elysBalance = useRef(0)
    const btcAddress = useRef(null)

    const currentAllowance = useRef(null)
    // STAGES:
    // 0: disconnected
    // 1: approveELYS
    // 2: SwapELYSforWFTM
    // 3: SwapWFTMforRBTC
    // 4: bridge
    // 5: walletConfirm
    // 6: waitingTxConfirm
    const [transactionStage, setTransactionStage] = useState(0)

    const txStatusToast = useToast()
    const [txReciept, setTxReceipt] = useState(null)

    // ----------------------------------USE-EFFECTs----------------------------------
    // FOR INITIALIZING VALUES ON STATE CHANGE
    useEffect(() => {
        if (account) {
            // INITIALIZE CONTRACTs
            swapContract.current = new ethers.Contract(SWAP_CONTRACT_ADDRESS, swapAbi, library.getSigner())
            elysContract.current = new ethers.Contract(ELYS_CONTRACT_ADDRESS, tokenAbi, library.getSigner())
            zooRouter.current = new ethers.Contract(ZOO_ROUTER_ADDRESS, routerAbi, library.getSigner())
            hyperRouter.current = new ethers.Contract(HYPER_ROUTER_ADDRESS, routerAbi, library.getSigner())

            // UPDATE ELYS BALANCE
            elysContract.current.balanceOf(account).then((balance) => {
                elysBalance.current = ethers.utils.formatUnits(balance, 5)
                console.log("ELYS Balance:", elysBalance.current)
            })

            // FETCH APPROVED AMOUNT AND UPDATE TRANSACTION STATE IF REQUIRED
            elysContract.current.allowance(account, SWAP_CONTRACT_ADDRESS).then((out) => {
                currentAllowance.current = out
                console.log("ELYS approved to swap contract:", String(currentAllowance.current))
                setApprovalState()
            })
        }
        // IF NO ACCOUNT LOGGED, RESET PARAMS
        else {
            // NULL ALL CONTRACTs
            swapContract.current = null
            elysContract.current = null
            zooRouter.current = null
            hyperRouter.current = null

            // SET OTHER STATES TO DEFAULT
            setElysIn('')
            elysBalance.current = 0
            btcAddress.current = null
            currentAllowance.current = null

            setTransactionStage(0)
        }
    }, [account, library])

    // FOR UPDATING ESTIMATED BTC OUT AND CHECKING IF ENOUGH TOKENS ARE APPROVED
    useEffect(() => {
        const updateEstimatedBtc = async () => {
            let elysInputValue = Number(elysIn)
            if (elysInputValue === 0) { // Protect from Uniswap Insufficient Amount error
                setEstimateBtcOut('0')
                return
            } else elysInputValue = String(elysIn)

            if (account == null) {
                return
            }

            let ftmOut = (await zooRouter.current.getAmountsOut(ethers.utils.parseUnits(elysInputValue, 5), [ELYS_CONTRACT_ADDRESS, FTM_CONTRACT_ADDRESS]))[1]
            let renBtcOut = (await hyperRouter.current.getAmountsOut(ftmOut, [FTM_CONTRACT_ADDRESS, RENBTC_CONTRACT__ADDRESS]))[1]
            setEstimateBtcOut(ethers.utils.formatUnits(renBtcOut.mul(9985).div(10000), 8)) // adjust for RenVM fees
        }
        updateEstimatedBtc()
        setApprovalState()
    }, [elysIn])

    // (ONLY DEBUGGING) LOGS TRANSACTIONSTAGE
    useEffect(() => {
        console.log("TransactionStage:", transactionStage)
    }, [transactionStage])

    // 
    useEffect(() => {
        console.log(txReciept)
        if ("TxReceipt:", txReciept) {
            txStatusToast({
                title: "😄 Transaction Successful",
                description: "Transaction has been successfull. Continue on!",
                status: "success",
                duration: 9000,
                isClosable: true,
            })
        }
    }, [txReciept])

    // SWITCHES BETWEEN 1<->2 STATES, ACCORDING TO CONDITIONS
    const setApprovalState = () => {
        if (account) {
            if ((currentAllowance.current != null) && (currentAllowance.current.gt(ethers.utils.parseUnits(String(Number(elysBalance.current)), 5))))
                setTransactionStage(2)
            else setTransactionStage(1)
            swapContract.pendingWFTM(account).then((res) => console.log(res))
        }
    }

    // ----------------------------------INPUT CONTROL AND CHECKING----------------------------------
    // PREVENTS ILLEGAL INPUT IN ELYS AMOUNT
    const preventIllegalAmount = (e) => {
        if ((e.key === '-') || (e.key === '+') || (e.key === 'e'))
            e.preventDefault()
        if ((e.target.value.indexOf('.') !== -1) && (e.target.value.length - e.target.value.indexOf('.') > 5) && (!isNaN(e.key)))
            e.preventDefault()
    }

    // SETS ELYS AMOUNT AS PERCENTAGE OF WALLET BALANCE
    const setElysInFromPercent = (percent) => {
        let balance = elysBalance.current * (percent / 100)
        balance = balance.toFixed(5)
        setElysIn(String(balance))
    }

    // CHECKS WHETHER GIVEN BTC-MAINNET ADDRESS IS VALID
    const validateBitcoinAddress = (address) => {
        if (validate(btcAddress.current, 'mainnet'))
            return true
        else return false
    }

    // ----------------------------------TRANSACTION FUNCTIONS----------------------------------
    // APPROVES ELYS TO THE SWAP CONTRACT
    const approveElysToContract = async () => {
        setTransactionStage(5)
        let tx = elysContract.current.approve(SWAP_CONTRACT_ADDRESS, ethers.BigNumber.from('2').pow('256').sub('1'))
        tx.then((tx) => {
            console.log(tx)
            raiseTxSentToast()
            setTransactionStage(6)
            continuousCheckTransactionMined(tx.hash, 1)
        }).catch((err) => {
            console.log(err)
            txStatusToast({
                title: "☹️ Rejected",
                description: err.message,
                status: "error",
                duration: 9000,
                isClosable: true,
            })
            setApprovalState()
        })
    }

    // SWAPS ELYS TO WFTM (WFTM STAYS IN CONTRACT)
    const swapELYSforWFTMUnchecked = () => {
        let elysToSwap = ethers.utils.parseUnits(elysIn, 5)
        console.log(`ELYS to be swapped:" ${String(elysToSwap)}/${ethers.utils.parseUnits(elysBalance.current, 5)}`)
        if (ethers.BigNumber.from(ethers.utils.parseUnits(elysBalance.current, 5)).lt(ethers.BigNumber.from(elysToSwap))) {
            txStatusToast({
                title: "👛 Wallet Balance Exceeded",
                description: `ELYS amount exceeds balance of ${elysBalance.current}`,
                status: "error",
                duration: 9000,
                isClosable: true,
            })
            return
        }

        setTransactionStage(5)

        let txStatus = swapContract.current.swapELYSforWFTMUnchecked(elysToSwap)
        txStatus.then((tx) => {
            console.log(tx)
            raiseTxSentToast()
            setTransactionStage(6)
            continuousCheckTransactionMined(tx.hash, 2)
        }).catch((err) => {
            console.log(err)
            txStatusToast({
                title: "☹️ Rejected",
                description: err.message,
                status: "error",
                duration: 9000,
                isClosable: true,
            })
            setApprovalState()
        })
    }

    const swapWFTMforRenBTCUnchecked = async () => {
        console.log(swapContract.current)
        setTransactionStage(5)
        let tx = swapContract.current.swapWFTMforRenBTCUnchecked()
        tx.then((tx) => {
            console.log(tx)
            raiseTxSentToast()
            setTransactionStage(6)
            continuousCheckTransactionMined(tx.hash, 3)
        }).catch((err) => {
            console.log(err)
            txStatusToast({
                title: "☹️ Rejected",
                description: err.message,
                status: "error",
                duration: 9000,
                isClosable: true,
            })
            setApprovalState()
        })
    }

    // CHECK IF TRANSACTION MINED
    const isTransactionMined = async (transactionHash) => {
        const txReceipt = await library.getTransactionReceipt(transactionHash);
        if (txReceipt && txReceipt.blockNumber) {
            return txReceipt;
        }
    }

    // CHECK IF TRANSACTION MINED REPEATEDLY
    const continuousCheckTransactionMined = async (transactionHash, txStage) => {
        let txReceipt = await isTransactionMined(transactionHash)
        if (txReceipt) {
            setTxReceipt(txReceipt)
            if (txStage === 4)
                setApprovalState()
            else setTransactionStage(txStage + 1)
            return
        }
        else setTimeout(continuousCheckTransactionMined(transactionHash, txStage), 1000)
    }

    // RAISE TRANSACTION SENT TOAST
    const raiseTxSentToast = () => {
        txStatusToast({
            title: "⏲️ Transaction Sent",
            description: "Waiting for confirmation...",
            status: "info",
            duration: 9000,
            isClosable: true,
        })
    }

    // (UNTESTED) BRIDGE RENBTC TO BTC-MAINNET
    const bridgeBTC = async (amount) => {
        const renJS = new RenJS("testnet", { useV2TransactionFormat: true })
        const burnAndRelease = await renJS.burnAndRelease({
            // Send BTC from Fantom back to the Bitcoin blockchain.
            asset: "BTC",
            to: Bitcoin().Address(btcAddress),
            from: Fantom(library).Address(account),
        });

        let confirmations = 0;
        await burnAndRelease
            .burn()
            // Fantom transaction confirmations.
            .on("confirmation", (confs) => {
                confirmations = confs;
            })
            // Print Fantom transaction hash.
            .on("transactionHash", (txHash) => console.log(`Fantom txHash: ${txHash}`));

        await burnAndRelease
            .release()
            // Print RenVM status - "pending", "confirming" or "done".
            .on("status", (status) =>
                status === "confirming"
                    ? console.log(`${status} (${confirmations}/15)`)
                    : console.log(status)
            )
            // Print RenVM transaction hash
            .on("txHash", (txHash) => console.log(`RenVM txHash: ${txHash}`));

        console.log(`Withdrew ${amount} BTC to ${btcAddress}.`);
    };

    //----------------------------------ACTION BUTTON MANAGEMENT----------------------------------
    // CHANGES ACTION BUTTON CONTENT BASED ON TRANSACTION-STATE
    const getActionButtonState = () => {
        if (transactionStage === 0)
            return <Text>Connect Wallet</Text>
        else if (transactionStage === 1)
            return <Text>Approve ELYS</Text>
        else if (transactionStage === 2)
            return <Text>Swap ELYS-WFTM</Text>
        else if (transactionStage === 3)
            return <Text>Swap WFTM-RBTC</Text>
        else if (transactionStage === 4)
            return <Text>Bridge BTC</Text>
        else if (transactionStage === 5)
            return <Stack direction="row"><Spinner color="white" /> <Text>Confirm in your wallet</Text></Stack>
        else if (transactionStage === 6)
            return <Stack direction="row"><Spinner color="white" /> <Text>Waiting for confirmation</Text></Stack>
        else <Text>Invalid State</Text>
    }

    // ENABLES/DISABLES ACTION BUTTON BASED ON TRANSACTION-STATE
    const getActionButtonDisabled = () => {
        if (!account)
            return true
        if (transactionStage === 1)
            return false
        else if (transactionStage === 2)
            return false
        else if (transactionStage === 3)
            return false
        else if ((transactionStage === 4) && validateBitcoinAddress)
            return false
        else if (transactionStage === 5)
            return true
        else return true
    }

    // SETS ACTION BUTTON ONCLICK BASED ON TRANSACTION-STATE
    const getActionButtonOnClick = () => {
        if (!account)
            return undefined
        if (transactionStage === 1)
            return approveElysToContract
        else if (transactionStage === 2)
            return swapELYSforWFTMUnchecked
        else if (transactionStage === 3)
            return swapWFTMforRenBTCUnchecked
        else if (transactionStage === 4)
            return undefined
        else return undefined
    }

    return (
        <Container centerContent mt="16" minWidth="72" pb="32">
            <Container centerContent alignItems="center" p="4" maxWidth="container.md" bg="white" border="1px" borderColor="blackAlpha.100" roundedTop="3xl" shadow="lg">
                <Text my="5" textAlign="left" w="full" fontSize="3xl" fontWeight="bold" color={!account ? "gray.400" : "black"}>Bridge</Text>
                <Stack w="full">
                    <Stack direction="row" alignItems="center" border="1px" borderColor="gray.300" rounded="md" p="2">
                        {/* <Stack centerContent alignItems="center" bg="white" border="1px" borderColor="gray.200" h="full" w="32" py="2" px="3" rounded="md" direction="row"> */}
                        <Image borderRadius="full" src="https://gitcoin.co/dynamic/avatar/elyseos" bg="white" boxSize="30px" />
                        {/* <Text fontWeight="bold">ELYS</Text> */}
                        {/* </Stack> */}
                        <Input value={elysIn} isTruncated type="number" placeholder="0" textAlign="right" fontWeight="bold" fontSize="xl" onChange={e => setElysIn(e.target.value)} onKeyDown={e => preventIllegalAmount(e)} color={!account ? "gray.400" : "black"} />
                    </Stack>
                    <ButtonGroup isAttached variant="outline" w="full">
                        <Button w="full" mr="-px" disabled={!account} onClick={() => setElysInFromPercent(25)}>25%</Button>
                        <Button w="full" mr="-px" disabled={!account} onClick={() => setElysInFromPercent(50)}>50%</Button>
                        <Button w="full" mr="-px" disabled={!account} onClick={() => setElysInFromPercent(75)}>75%</Button>
                        <Button w="full" mr="-px" disabled={!account} onClick={() => setElysInFromPercent(100)}>100%</Button>
                    </ButtonGroup>
                </Stack>
                <Text w="fit-content" my="2" color={!account ? "gray.400" : "black"}>{`≈ ${estimatedBtcOut} BTC`}</Text>
            </Container>

            <Container centerContent alignItems="center" p="4" mt="0.5" maxWidth="container.md" bg="white" border="1px" borderColor="blackAlpha.100" roundedBottom="3xl" shadow="lg">
                <Box w="full" mb="6">
                    <Text mb="1" color={!account ? "blue.400" : "blue"}>Bridge tokens to: </Text>
                    <Input
                        isTruncated
                        // value={}
                        // onChange={handleChange} // Check validity of address
                        placeholder="Enter destination Bitcoin address"
                        onChange={e => btcAddress.current = e.target.value}
                        color={!account ? "gray.400" : "black"}
                    />
                </Box>

                {/* <Stack w="full"> */}
                <Button size="lg" colorScheme="purple" bgGradient="linear(to-r, purple.400, pink.400)" _hover={{
                    bgGradient: "linear(to-r, purple.500, pink.500)",
                }} w="full" rounded="xl" disabled={getActionButtonDisabled()} onClick={getActionButtonOnClick()}>
                    {getActionButtonState()}
                </Button>

            </Container>
        </Container >
    )
}

export default BridgeMain
