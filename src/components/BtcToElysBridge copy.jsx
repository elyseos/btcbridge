import { useRef, useState, useEffect } from 'react'
import { Box, Container, Link, Stack } from "@chakra-ui/layout"
import { Text, Button, ButtonGroup, Input, Image, Spinner, Flex, useToast, useColorModeValue } from '@chakra-ui/react'
import { ExternalLinkIcon } from '@chakra-ui/icons'
import { BsArrowUpRight } from 'react-icons/bs'
import { useWeb3React } from "@web3-react/core"
import { ethers } from 'ethers'
import { Bitcoin, Fantom } from "@renproject/chains"
import RenJS from "@renproject/ren";
import WAValidator from 'multicoin-address-validator'
import {
    ELYS_CONTRACT_ADDRESS,
    FTM_CONTRACT_ADDRESS,
    HYPER_ROUTER_ADDRESS,
    RENBTC_CONTRACT__ADDRESS,
    SWAP_CONTRACT_ADDRESS,
    ZOO_ROUTER_ADDRESS,
    routerAbi, tokenAbi
} from '../bridge_constants'
import swapArtifact from '../artifacts/contracts/ELYSBTCSwap.sol/ELYSBTCSwap.json'
let swapAbi = swapArtifact.abi

const renJS = new RenJS("mainnet", { useV2TransactionFormat: true })

const BtcToElysBridge = () => {
    const { account, library } = useWeb3React()
    const [estimatedElysOut, setEstimateElysOut] = useState(0)

    const containerBg = useColorModeValue("white", "gray.700")
    const bordersColor = useColorModeValue("gray.300", "gray.600")
    const textColor = useColorModeValue(!account ? "gray.400" : "black", "white")
    const zooRouter = useRef(null)
    const hyperRouter = useRef(null)
    const renBtcContract = useRef(null)
    const swapContract = useRef(null)

    const [renBtcIn, setRenBtcIn] = useState('')
    const renBtcBalance = useRef(0)


    const currentAllowance = useRef(null)
    const [bridgeTxHash, setBridgeTxHash] = useState([null, null])

    const [
        REN_WAITING,
        REN_TX_ON_FTM,
        REN_TX_ON_RENVM,
        REN_EXEC,
        REN_TX_ON_BTC
    ] = [0, 1, 2, 3, 4]
    const [bridgeStage, setBridgeStage] = useState(REN_WAITING)

    const [
        TS_WALLET_DISCONNECTED,
        TS_APPROVE_RENBTC,
        TS_SWAP_RENBTC_ELYS,
        TS_REN_BRIDGE,
        TS_CONFIRM_TX,
        TS_TX_CONFIRM_WAIT,
        TS_REN_BRIDGE_PROCESSING
    ] = [0, 1, 2, 3, 4, 5, 6]
    const [transactionStage, setTransactionStage] = useState(TS_WALLET_DISCONNECTED)

    const txStatusToast = useToast()
    const [txReciept, setTxReceipt] = useState(null)

    // ----------------------------------USE-EFFECTs----------------------------------
    // FOR INITIALIZING VALUES ON STATE CHANGE
    useEffect(() => {
        if (account) {
            // INITIALIZE CONTRACTs
            swapContract.current = new ethers.Contract(SWAP_CONTRACT_ADDRESS, swapAbi, library.getSigner())
            renBtcContract.current = new ethers.Contract(ELYS_CONTRACT_ADDRESS, tokenAbi, library.getSigner())
            zooRouter.current = new ethers.Contract(ZOO_ROUTER_ADDRESS, routerAbi, library.getSigner())
            hyperRouter.current = new ethers.Contract(HYPER_ROUTER_ADDRESS, routerAbi, library.getSigner())

            // UPDATE ELYS BALANCE
            renBtcContract.current.balanceOf(account).then((balance) => {
                renBtcBalance.current = ethers.utils.formatUnits(balance, 8)
                console.log("RenBTC Balance:", renBtcBalance.current)
            })

            // FETCH APPROVED AMOUNT
            renBtcContract.current.allowance(account, SWAP_CONTRACT_ADDRESS).then((out) => {
                currentAllowance.current = out
                console.log("ELYS approved to swap contract:", String(currentAllowance.current))
            })

            setTransactionStage(TS_SWAP_RENBTC_ELYS)
        }

        // IF NO ACCOUNT LOGGED, RESET PARAMS
        else {
            // NULL ALL CONTRACTs
            swapContract.current = null
            renBtcContract.current = null
            zooRouter.current = null
            hyperRouter.current = null

            // SET OTHER STATES TO DEFAULT
            setRenBtcIn('')
            renBtcBalance.current = 0
            currentAllowance.current = null

            setTransactionStage(TS_WALLET_DISCONNECTED)
            setBridgeStage(REN_WAITING)
        }
    }, [account, library])

    // FOR UPDATING ESTIMATED BTC OUT AND CHECKING IF ENOUGH TOKENS ARE APPROVED
    useEffect(() => {
        const updateEstimatedElysAndTxState = async () => {
            let rbtcInputValue = Number(renBtcIn)
            if (rbtcInputValue === 0) { // Protect from Uniswap Insufficient Amount error
                setEstimateElysOut('0')
                return
            } else rbtcInputValue = String(renBtcIn)

            if (account == null) {
                return
            }

            let ftmOut = (await hyperRouter.current.getAmountsOut(ethers.utils.parseUnits(rbtcInputValue, 8), [RENBTC_CONTRACT__ADDRESS, FTM_CONTRACT_ADDRESS]))[1]
            let elysOut = (await zooRouter.current.getAmountsOut(ftmOut, [FTM_CONTRACT_ADDRESS, ELYS_CONTRACT_ADDRESS]))[1]
            setEstimateElysOut(ethers.utils.formatUnits(elysOut, 5))

            if (
                ethers.BigNumber.from(currentAllowance.current).lt(ethers.utils.parseUnits(rbtcInputValue, 5)) &&
                transactionStage === TS_SWAP_RENBTC_ELYS
            )
                setTransactionStage(TS_APPROVE_RENBTC)
            else if (
                ethers.BigNumber.from(currentAllowance.current).gt(ethers.utils.parseUnits(rbtcInputValue, 5)) &&
                transactionStage === TS_APPROVE_RENBTC
            )
                setTransactionStage(TS_SWAP_RENBTC_ELYS)
        }

        updateEstimatedElysAndTxState()
    }, [renBtcIn])

    // (ONLY DEBUGGING) LOGS TRANSACTION-STAGE
    useEffect(() => {
        console.log("TransactionStage:", transactionStage)
    }, [transactionStage])

    // TRANSACTION SUCCESSFUL TOAST
    useEffect(() => {
        console.log("TxReceipt:", txReciept)
        if (txReciept) {
            txStatusToast({
                title: "😄 Transaction Successful",
                description: "Transaction has been successful. Continue on!",
                status: "success",
                duration: 9000,
                isClosable: true,
            })
        }
    }, [txReciept])

    // RESTARTS WHOLE PROCESS FOR A CONNECTED WALLET
    const restartProcess = () => {
        renBtcContract.current.balanceOf(account).then((balance) => {
            renBtcBalance.current = ethers.utils.formatUnits(balance, 5)
            console.log("ELYS Balance:", renBtcBalance.current)
        })

        // FETCH APPROVED AMOUNT AND UPDATE TRANSACTION STATE IF REQUIRED
        renBtcContract.current.allowance(account, SWAP_CONTRACT_ADDRESS).then((out) => {
            currentAllowance.current = out
            console.log("ELYS approved to swap contract:", String(currentAllowance.current))
            setBridgeStage(REN_WAITING)
        })
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
    const setRBtcInFromPercent = (percent) => {
        let balance = renBtcBalance.current * (percent / 100)
        balance = balance.toFixed(8)
        setRenBtcIn(String(balance))
    }

    // ----------------------------------TRANSACTION FUNCTIONS----------------------------------
    // APPROVES ELYS TO THE SWAP CONTRACT
    const approveRBtcToContract = async () => {
        setTransactionStage(TS_CONFIRM_TX)
        let tx = renBtcContract.current.approve(SWAP_CONTRACT_ADDRESS, ethers.BigNumber.from('2').pow('256').sub('1'))
        tx.then((tx) => {
            console.log(tx)
            raiseTxSentToast(tx.hash)
            setTransactionStage(TS_TX_CONFIRM_WAIT)
            continuousCheckTransactionMined(tx.hash, 1)
        }).catch((err) => {
            console.log(TS_APPROVE_RENBTC)
            console.log(err)
            txStatusToast({
                title: "☹️ Rejected",
                description: err.message,
                status: "error",
                duration: 9000,
                isClosable: true,
            })
        })
    }

    // SWAPS ELYS TO RenBTC
    const swapELYSforRenBTC = () => {
        setBridgeStage(REN_WAITING)
        console.log(renBtcIn)
        let elysToSwap = ethers.utils.parseUnits(renBtcIn, 5)
        console.log(`ELYS to be swapped:" ${String(elysToSwap)}/${ethers.utils.parseUnits(renBtcBalance.current, 5)}`)
        if (ethers.BigNumber.from(ethers.utils.parseUnits(renBtcBalance.current, 5)).lt(ethers.BigNumber.from(elysToSwap))) {
            txStatusToast({
                title: "👛 Wallet Balance Exceeded",
                description: `ELYS amount exceeds balance of ${renBtcBalance.current}`,
                status: "error",
                duration: 9000,
                isClosable: true,
            })
            return
        }

        setTransactionStage(TS_CONFIRM_TX)
        let txStatus = swapContract.current.swapELYSToRenBTC(elysToSwap)
        txStatus.then(async (tx) => {
            console.log(tx)
            raiseTxSentToast(tx.hash)
            setTransactionStage(TS_REN_BRIDGE)
            await continuousCheckTransactionMined(tx.hash, 2)
        }).catch((err) => {
            setTransactionStage(TS_SWAP_RENBTC_ELYS)
            console.log(err)
            txStatusToast({
                title: "☹️ Rejected",
                description: err.message,
                status: "error",
                duration: 9000,
                isClosable: true,
            })
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
            if (txStage === TS_REN_BRIDGE) setTransactionStage(TS_SWAP_RENBTC_ELYS)
            else setTransactionStage(txStage + 1)
            return
        }
        else setTimeout(continuousCheckTransactionMined(transactionHash, txStage), 1000)
    }

    // RAISE TRANSACTION SENT TOAST
    const raiseTxSentToast = (txHash) => {
        txStatusToast({
            title: "⏲️ Transaction Sent",
            description: <>View on <Link href={`https://ftmscan.com/tx/${txHash}`} isExternal>
                explorer<ExternalLinkIcon mx="2px" />
            </Link></>,
            status: "info",
            duration: 9000,
            isClosable: true,
        })
    }

    // BRIDGE RENBTC TO BTC-MAINNET
    const bridgeBTC = async () => {
        let value = renIn.toNumber()
        if (renIn === null) {
            console.log("Error: renIn is null, it shouldn't happen")
            return
        }

        setTransactionStage(TS_CONFIRM_TX)
        const burnAndRelease = await renJS.burnAndRelease({
            // Send BTC from Fantom back to the Bitcoin blockchain.
            asset: "BTC",
            to: Bitcoin().Address(btcAddress),
            from: Fantom(library).Account({ address: account, value }),
        });


        let confirmations = 0;
        await burnAndRelease
            .burn()
            // Fantom transaction confirmations.
            .on("confirmation", (confs) => {
                setBridgeStage(REN_TX_ON_RENVM)
                console.log(confs)
                confirmations = confs;
            })
            // Print Fantom transaction hash.
            .on("transactionHash", (txHash) => {
                setTransactionStage(TS_REN_BRIDGE_PROCESSING)
                setBridgeStage(REN_TX_ON_FTM)
                txStatusToast({
                    title: "Transaction submitted on Fantom",
                    description: <>View on <Link href={`https://ftmscan.com/tx/${txHash}`} isExternal>
                        explorer<ExternalLinkIcon mx="2px" />
                    </Link></>,
                    status: "info",
                    duration: 15000,
                    isClosable: true,
                })
                console.log(`FTM txHash: ${txHash}`)
                setBridgeTxHash([txHash, bridgeTxHash[1]])
            });

        await burnAndRelease
            .release()
            // Print RenVM status - "pending", "confirming" or "done".
            .on("status", (status) => {
                (status === "executing") && setBridgeStage(REN_EXEC)
                status === "confirming"
                    ? console.log(`${status} (${confirmations}/51)`)
                    : console.log(status)
            })
            // Print RenVM transaction hash
            .on("txHash", (txHash) => {
                setBridgeStage(REN_EXEC)
                txStatusToast({
                    title: "Transaction confirmed on RenVM",
                    description: <>View on <Link href={`https://explorer.renproject.io/#/tx/${txHash}`} isExternal>
                        explorer<ExternalLinkIcon mx="2px" />
                    </Link></>,
                    status: "info",
                    duration: 15000,
                    isClosable: true,
                })
                console.log(`RenVM txHash: ${txHash}`)
                setBridgeTxHash([bridgeTxHash[0], txHash])
            }).catch((e) => {
                console.log(e)
                setTransactionStage(TS_SWAP_RENBTC_ELYS)
                setBridgeStage(REN_TX_ON_RENVM)
                txStatusToast({
                    title: e.toString(),
                    status: "error",
                    duration: 15000,
                    isClosable: true,
                })
            });

        setBridgeStage(REN_TX_ON_BTC) // give restart button
        txStatusToast({
            title: "🎉 Transaction submitted on Bitcoin",
            description: <>View on <Link href={`https://live.blockcypher.com/btc/address/${btcAddress}`} isExternal>
                explorer<ExternalLinkIcon mx="2px" />
            </Link></>,
            status: "success",
            duration: 15000,
            isClosable: true,
        })
        console.log(`Withdrew ${value} BTC to ${btcAddress}.`);
    };

    //----------------------------------ACTION BUTTON MANAGEMENT----------------------------------
    // CHANGES ACTION BUTTON CONTENT BASED ON TRANSACTION-STATE
    const getActionButtonState = () => {
        if (transactionStage === TS_WALLET_DISCONNECTED)
            return <Text>Connect Wallet</Text>
        else if (transactionStage === TS_APPROVE_RENBTC)
            return <Text>Approve ELYS</Text>
        else if (transactionStage === TS_SWAP_RENBTC_ELYS)
            return <Text>Swap to renBTC</Text>
        else if ((transactionStage === TS_REN_BRIDGE) && (renIn === null))
            return <Stack direction="row"><Spinner color="white" /> <Text>Fetching renBTC amount</Text></Stack>
        else if (transactionStage === TS_REN_BRIDGE)
            return <Text>Bridge BTC</Text>
        else if (transactionStage === TS_CONFIRM_TX)
            return <Stack direction="row"><Spinner color="white" /> <Text>Confirm in your wallet</Text></Stack>
        else if (transactionStage === TS_TX_CONFIRM_WAIT)
            return <Stack direction="row"><Spinner color="white" /> <Text>Waiting for confirmation</Text></Stack>
        else if (transactionStage === TS_REN_BRIDGE_PROCESSING) {
            if (bridgeStage === REN_TX_ON_FTM)
                return <Stack direction="row"><Spinner color="white" /> <Text>Transaction on FTM</Text></Stack>
            if (bridgeStage === REN_TX_ON_RENVM)
                return <Stack direction="row"><Spinner color="white" /> <Text>Transaction on RenVM</Text></Stack>
            if (bridgeStage === REN_EXEC)
                return <Stack direction="row"><Spinner color="white" /> <Text>Executing</Text></Stack>
            if (bridgeStage === REN_TX_ON_BTC)
                return <Text>Restart</Text>
        }
        else <Text>Invalid State</Text>
    }

    // ENABLES/DISABLES ACTION BUTTON BASED ON TRANSACTION-STATE
    const getActionButtonDisabled = () => {
        if (!account)
            return true
        if (transactionStage === TS_APPROVE_RENBTC)
            return false
        else if ((transactionStage === TS_SWAP_RENBTC_ELYS) && (Number(renBtcIn)))
            return false
        else if ((transactionStage === TS_REN_BRIDGE) && addressValidity && (renIn != null))
            return false
        else if (transactionStage === TS_CONFIRM_TX)
            return true
        else if (transactionStage === TS_REN_BRIDGE_PROCESSING) {
            if (bridgeStage === REN_TX_ON_BTC)
                return false
            else return true
        }
        else return true
    }

    // SETS ACTION BUTTON ONCLICK BASED ON TRANSACTION-STATE
    const getActionButtonOnClick = () => {
        if (!account)
            return undefined
        if (transactionStage === TS_APPROVE_RENBTC)
            return approveRBtcToContract
        else if (transactionStage === TS_SWAP_RENBTC_ELYS)
            return swapELYSforRenBTC
        else if (transactionStage === TS_REN_BRIDGE)
            return bridgeBTC
        else if (transactionStage === TS_REN_BRIDGE_PROCESSING) {
            if (bridgeStage === REN_TX_ON_BTC)
                return restartProcess
        }
        else return undefined
    }

    return (
        <Container centerContent mt="16" minWidth="72" pb="32">
            <Container centerContent alignItems="center" p="4" maxWidth="container.md" bg={containerBg} border="1px" borderColor="blackAlpha.100" roundedTop="3xl" shadow="lg">
                <Text my="5" textAlign="left" w="full" fontSize="3xl" fontWeight="bold" color={textColor}>Bridge</Text>
                <Stack w="full">
                    <Stack direction="row" alignItems="center" border="1px" borderColor={bordersColor} rounded="md" p="2">
                        {/* <Stack centerContent alignItems="center" bg="white" border="1px" borderColor="gray.200" h="full" w="32" py="2" px="3" rounded="md" direction="row"> */}
                        <Image borderRadius="full" src="https://gitcoin.co/dynamic/avatar/elyseos" bg="white" boxSize="30px" />
                        {/* <Text fontWeight="bold">ELYS</Text> */}
                        {/* </Stack> */}
                        <Input value={renBtcIn} isTruncated type="number" placeholder="0" textAlign="right" fontWeight="bold" fontSize="xl" onChange={e => setRenBtcIn(e.target.value)} onKeyDown={e => preventIllegalAmount(e)} color={textColor} />
                    </Stack>
                    <ButtonGroup isAttached variant="outline" w="full">
                        <Button w="full" mr="-px" disabled={!account} onClick={() => setRBtcInFromPercent(25)}>25%</Button>
                        <Button w="full" mr="-px" disabled={!account} onClick={() => setRBtcInFromPercent(50)}>50%</Button>
                        <Button w="full" mr="-px" disabled={!account} onClick={() => setRBtcInFromPercent(75)}>75%</Button>
                        <Button w="full" mr="-px" disabled={!account} onClick={() => setRBtcInFromPercent(100)}>100%</Button>
                    </ButtonGroup>
                </Stack>
                <Text w="fit-content" my="2" color={textColor}>{`≈ ${estimatedElysOut} BTC`}</Text>

                {Number(renIn) ?
                    <Text w="fit-content" mt="2" color={textColor}>
                        {Number(ethers.utils.formatUnits(renIn, 8)).toFixed(8)} <b>renBTC</b> to transfer.
                    </Text>
                    : <></>
                }
            </Container>

            <Container centerContent alignItems="center" p="4" mt="0.5" maxWidth="container.md" bg={containerBg} border="1px" borderColor="blackAlpha.100" roundedBottom="3xl" shadow="lg">
                <Box w="full" mb="6">
                    <Text mb="1" color={!account ? "blue.400" : "blue"}>Bridge tokens to: </Text>
                    <Input
                        isTruncated
                        isInvalid={!addressValidity && btcAddress.length !== 0}
                        // value={}
                        // onChange={handleChange} // Check validity of address
                        placeholder="Enter destination Bitcoin address"
                        onChange={e => {
                            setBtcAddress(e.target.value)
                            setAddressValidity(validateBitcoinAddress(e.target.value))
                        }}
                        color={textColor}
                    />
                </Box>

                {/* <Stack w="full"> */}
                <Button size="lg" colorScheme="purple" bgGradient="linear(to-r, purple.400, pink.400)" _hover={{
                    bgGradient: "linear(to-r, purple.500, pink.500)",
                }} w="full" rounded="xl" disabled={getActionButtonDisabled()} onClick={getActionButtonOnClick()}>
                    {getActionButtonState()}
                </Button>
            </Container>
            {
                (bridgeStage > REN_WAITING) && <Flex justify="space-between" mt="2" w="full" alignItems="center" p="4" maxWidth="container.md" bg={containerBg} border="1px" borderColor="blackAlpha.100" roundedTop="3xl" shadow="lg">
                    {(bridgeStage >= REN_TX_ON_FTM) && <Link mx="auto" variant="ghost" fontSize="sm" href={`https://ftmscan.com/tx/${bridgeTxHash[0]}`} isExternal>
                        <Stack direction="row" alignItems="center">
                            <Text>FTM Transaction</Text>
                            <BsArrowUpRight />
                        </Stack></Link>}
                    {(bridgeStage >= REN_TX_ON_RENVM) && <Link mx="auto" variant="ghost" fontSize="sm" href={`https://explorer.renproject.io/#/tx/${bridgeTxHash[1]}`} isExternal>
                        <Stack direction="row" alignItems="center">
                            <Text>RenVM Transaction</Text>
                            <BsArrowUpRight />
                        </Stack></Link>}
                </Flex>
            }
            {
                (bridgeStage > REN_WAITING) && <Container centerContent alignItems="center" p="4" maxWidth="container.md" bg="blue" border="1px" borderColor="blackAlpha.100" roundedBottom="3xl" shadow="lg">
                    {(bridgeStage >= REN_TX_ON_BTC) ? <Link mx="auto" variant="ghost" fontSize="sm" href={`https://live.blockcypher.com/btc/address/${btcAddress}`} isExternal>
                        <Stack direction="row" alignItems="center">
                            <Text color="white">View transaction on Bitcoin</Text>
                            <BsArrowUpRight color='white' />
                        </Stack></Link> : <Spinner color="white" mx="auto" />}
                </Container>
            }
        </Container >
    )
}

export default BtcToElysBridge
