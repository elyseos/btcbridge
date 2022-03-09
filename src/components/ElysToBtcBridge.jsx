import { useRef, useState, useEffect } from 'react'
import { Box, Container, Link, Stack } from "@chakra-ui/layout"
import { Text, Button, ButtonGroup, Input, Spinner, Flex, useToast, Divider } from '@chakra-ui/react'
import { ExternalLinkIcon } from '@chakra-ui/icons'
import { BsArrowUpRight } from 'react-icons/bs'
import { useWeb3React } from "@web3-react/core"
import { ethers } from 'ethers'
import { Bitcoin, Fantom } from "@renproject/chains"
import RenJS from "@renproject/ren";
import WAValidator from 'multicoin-address-validator'
import { ReactComponent as ElyseosLogo } from '../images/elyseos_logo.svg'
import { ReactComponent as BTCLogo } from '../images/BTC_Logo.svg'

import {
    ELYS_CONTRACT_ADDRESS,
    WFTM_CONTRACT_ADDRESS,
    WBTC_CONTRACT_ADDRESS,
    SWAP_CONTRACT_ADDRESS,
    SPOOKYSWAP_ROUTER_ADDRESS,
    CURVE_WBTC_RENBTC_ADDRESS,
    CURVE_WBTC_C,
    CURVE_RBTC_C,
    curveStableSwapAbi,
    uniswapV2RouterAbi, tokenAbi
} from '../bridge_constants'
import swapArtifact from '../artifacts/contracts/ELYSBTCSwap.sol/ELYSBTCSwap.json'
let swapAbi = swapArtifact.abi

const TEXT_COLOR = 'white'

const renJS = new RenJS("mainnet", { useV2TransactionFormat: true })

const ElysToBtcBridge = ({ issueState }) => {
    const { account, library } = useWeb3React()
    const [issue, setIssue] = issueState

    const spookySwapRouter = useRef(null)
    const curveSwap = useRef(null)
    const elysContract = useRef(null)
    const swapContract = useRef(null)

    const [elysIn, setElysIn] = useState('')
    const elysBalance = useRef(0)
    const [estimatedRenBtcOut, setEstimateRenBtcOut] = useState(0)
    const [renFees, setRenFees] = useState({})
    const [estimatedBtcOut, setEstimateBtcOut] = useState(0)

    const [btcAddress, setBtcAddress] = useState('')
    const [addressValidity, setAddressValidity] = useState(false)

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
        TS_APPROVE_ELYS,
        TS_SWAP_ELYS_RENBTC,
        TS_REN_BRIDGE,
        TS_CONFIRM_TX,
        TS_TX_CONFIRM_WAIT,
        TS_REN_BRIDGE_PROCESSING
    ] = [0, 1, 2, 3, 4, 5, 6]
    const [transactionStage, setTransactionStage] = useState(TS_APPROVE_ELYS)

    const txStatusToast = useToast()
    const [txReceipt, setTxReceipt] = useState(null)
    const [renIn, setRenIn] = useState(null)

    // ----------------------------------USE-EFFECTs----------------------------------
    // FOR INITIALIZING VALUES ON STATE CHANGE
    useEffect(() => {
        if (account && !issue.status) {
            // INITIALIZE CONTRACTs
            swapContract.current = new ethers.Contract(SWAP_CONTRACT_ADDRESS, swapAbi, library.getSigner())
            elysContract.current = new ethers.Contract(ELYS_CONTRACT_ADDRESS, tokenAbi, library.getSigner())
            spookySwapRouter.current = new ethers.Contract(SPOOKYSWAP_ROUTER_ADDRESS, uniswapV2RouterAbi, library.getSigner())
            curveSwap.current = new ethers.Contract(CURVE_WBTC_RENBTC_ADDRESS, curveStableSwapAbi, library.getSigner())

            // UPDATE ELYS BALANCE
            elysContract.current.balanceOf(account).then((balance) => {
                elysBalance.current = ethers.utils.formatUnits(balance, 5)
                console.log("ELYS Balance:", elysBalance.current)
            })

            // FETCH APPROVED AMOUNT
            elysContract.current.allowance(account, SWAP_CONTRACT_ADDRESS).then((out) => {
                currentAllowance.current = out
                console.log("ELYS approved to swap contract:", String(currentAllowance.current))
            })

            swapContract.current.on("ELYStoRenBTCSwap", (user, ELYSin, renBTCout, out) => {
                console.log("ELYStoRenBTCSwap Event:", user, ELYSin, renBTCout, out)

                if (user === account) {
                    setRenIn(renBTCout)
                    console.log("EVENT INFO:", user, ELYSin, renBTCout, out)
                }
            });

            renJS.getFees({
                asset: "BTC",
                from: Fantom(library),
                to: Bitcoin(),
            }).then(res => {
                console.log(res)
                setRenFees(res)
            }).catch(_ => {
                setIssue({ status: true, description: "Cannot fetch RenVM fees. This might indicate a problem with the bridge. Retry after a few minutes." })
            })

            setTransactionStage(TS_SWAP_ELYS_RENBTC)
            setElysIn(Number(elysIn))
            setElysIn(String(elysIn))
        }

        // IF NO ACCOUNT LOGGED, RESET PARAMS
        else {
            // NULL ALL CONTRACTs
            swapContract.current = null
            elysContract.current = null
            spookySwapRouter.current = null
            curveSwap.current = null

            // SET OTHER STATES TO DEFAULT
            setElysIn('')
            elysBalance.current = 0
            currentAllowance.current = null
            setBtcAddress('')
            setRenIn(null)

            setTransactionStage(TS_APPROVE_ELYS)
            setBridgeStage(REN_WAITING)
        }
    }, [account, library])

    // FOR UPDATING ESTIMATED BTC OUT AND CHECKING IF ENOUGH TOKENS ARE APPROVED
    useEffect(() => {
        const updateEstimatedBtcAndTxState = async () => {
            let elysInputValue = Number(elysIn)
            if (elysInputValue <= 0) { // Protect from Uniswap Insufficient Amount error
                if (elysInputValue < 0)
                    setElysIn('0')
                setEstimateRenBtcOut('0')
                return
            } else elysInputValue = String(elysIn)

            if ((account == null) || (issue.status)) {
                return
            }
            let wbtcOut = (await spookySwapRouter.current.getAmountsOut(ethers.utils.parseUnits(elysInputValue, 5), [ELYS_CONTRACT_ADDRESS, WFTM_CONTRACT_ADDRESS, WBTC_CONTRACT_ADDRESS]))[2]
            let renBtcOut = await curveSwap.current.get_dy(CURVE_WBTC_C, CURVE_RBTC_C, wbtcOut)
            renBtcOut = renBtcOut.mul(9985).div(10000)

            setEstimateRenBtcOut(ethers.utils.formatUnits(renBtcOut, 8)) // adjusted for RenVM fees
            console.log()
            if (renFees.release && renBtcOut.gt(ethers.BigNumber.from(renFees.release.toString())))
                setEstimateBtcOut(ethers.utils.formatUnits(
                    renBtcOut.sub(ethers.BigNumber.from(
                        renFees.release.toString())), 8))
            else setEstimateBtcOut('0')

            currentAllowance.current = await elysContract.current.allowance(account, SWAP_CONTRACT_ADDRESS)
            console.log("Updated allowance:", currentAllowance.current.toString())
            if (
                ethers.BigNumber.from(currentAllowance.current).lt(ethers.utils.parseUnits(elysInputValue, 5)) &&
                transactionStage === TS_SWAP_ELYS_RENBTC
            )
                setTransactionStage(TS_APPROVE_ELYS)
            else if (
                ethers.BigNumber.from(currentAllowance.current).gt(ethers.utils.parseUnits(elysInputValue, 5)) &&
                transactionStage === TS_APPROVE_ELYS
            )
                setTransactionStage(TS_SWAP_ELYS_RENBTC)
        }

        updateEstimatedBtcAndTxState()
    }, [elysIn])

    // (ONLY DEBUGGING) LOGS TRANSACTION-STAGE
    useEffect(() => {
        console.log("TransactionStage:", transactionStage)
    }, [transactionStage])

    // TRANSACTION SUCCESSFUL TOAST
    useEffect(() => {
        console.log("TxReceipt:", txReceipt)
        if (txReceipt) {
            txStatusToast.closeAll()
            txStatusToast({
                title: "😄 Transaction Successful",
                description: "Transaction has been successful. Continue on!",
                status: "success",
                duration: 9000,
                isClosable: true,
            })
        }
    }, [txReceipt])

    // RESTARTS WHOLE PROCESS FOR A CONNECTED WALLET
    const restartProcess = () => {
        elysContract.current.balanceOf(account).then((balance) => {
            elysBalance.current = ethers.utils.formatUnits(balance, 5)
            console.log("ELYS Balance:", elysBalance.current)
        })

        // FETCH APPROVED AMOUNT AND UPDATE TRANSACTION STATE IF REQUIRED
        elysContract.current.allowance(account, SWAP_CONTRACT_ADDRESS).then((out) => {
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
    const setElysInFromPercent = (percent) => {
        elysContract.current.balanceOf(account).then((balance) => {
            elysBalance.current = ethers.utils.formatUnits(balance, 5)
            console.log("ELYS Balance:", elysBalance.current)

            let showBalance = elysBalance.current * (percent / 100)
            showBalance = showBalance.toFixed(5)
            setElysIn(String(showBalance))
        })
    }

    // CHECKS WHETHER GIVEN BTC-MAINNET ADDRESS IS VALID
    const validateBitcoinAddress = (address) => {
        if (!address)
            return false
        if (WAValidator.validate(address, 'BTC'))
            return true
        return false
    }

    // ----------------------------------TRANSACTION FUNCTIONS----------------------------------
    // APPROVES ELYS TO THE SWAP CONTRACT
    const approveElysToContract = async () => {
        setTransactionStage(TS_CONFIRM_TX)
        try {
            let tx = await elysContract.current.approve(SWAP_CONTRACT_ADDRESS, ethers.BigNumber.from('2').pow('256').sub('1'))
            console.log(tx)
            raiseTxSentToast(tx.hash)
            setTransactionStage(TS_TX_CONFIRM_WAIT)
            continuousCheckTransactionMined(tx, TS_SWAP_ELYS_RENBTC, false, async () => {
                currentAllowance.current = await elysContract.current.allowance(account, SWAP_CONTRACT_ADDRESS)
                console.log("Updated allowance:", currentAllowance.current.toString())
            })
        } catch (err) {
            console.log(err)
            txStatusToast.closeAll()

            txStatusToast({
                title: "☹️ Rejected",
                description: err.message,
                status: "error",
                duration: 9000,
                isClosable: true,
            })
        }
    }

    // SWAPS ELYS TO RenBTC
    const swapELYSforRenBTC = async () => {
        setBridgeStage(REN_WAITING)
        console.log(elysIn)
        let elysToSwap = ethers.utils.parseUnits(elysIn, 5)
        console.log(`ELYS to be swapped:" ${String(elysToSwap)}/${ethers.utils.parseUnits(elysBalance.current, 5)}`)
        if (ethers.BigNumber.from(ethers.utils.parseUnits(elysBalance.current, 5)).lt(ethers.BigNumber.from(elysToSwap))) {
            txStatusToast.closeAll()

            txStatusToast({
                title: "👛 Wallet Balance Exceeded",
                description: `ELYS amount exceeds balance of ${elysBalance.current}`,
                status: "error",
                duration: 9000,
                isClosable: true,
            })
            return
        }

        setTransactionStage(TS_CONFIRM_TX)
        try {
            let tx = await swapContract.current.swapELYSToRenBTC(elysToSwap)
            setTransactionStage(TS_TX_CONFIRM_WAIT)
            console.log(tx)
            raiseTxSentToast(tx.hash)
            await continuousCheckTransactionMined(tx, TS_REN_BRIDGE, false)
        } catch (err) {
            setTransactionStage(TS_SWAP_ELYS_RENBTC)
            console.log("Errored while sending swap tx:", err)
            txStatusToast.closeAll()

            txStatusToast({
                title: "☹️ Rejected",
                description: err.message,
                status: "error",
                duration: 9000,
                isClosable: true,
            })
        }
    }

    // CHECK IF TRANSACTION MINED
    const isTransactionMined = async (transactionHash) => {
        const _txReceipt = await library.getTransactionReceipt(transactionHash);
        if (_txReceipt && _txReceipt.blockNumber) {
            return _txReceipt;
        }
    }

    // CHECK IF TRANSACTION MINED REPEATEDLY
    const continuousCheckTransactionMined = async (txObject, newTxStage, txObjectisHash = true, asyncAction = null) => {
        let _txReceipt
        if (txObjectisHash) {
            try {
                _txReceipt = await isTransactionMined(txObject)
            } catch (e) { }

            if (!_txReceipt) setTimeout(continuousCheckTransactionMined(txObject, newTxStage, asyncAction), 1000)
        } else {
            try {
                _txReceipt = await txObject.wait()
            } catch (e) {
                console.error("Transaction not found!")
            }
        }

        if (_txReceipt) {
            setTxReceipt(_txReceipt)
            setTransactionStage(newTxStage)
            if (asyncAction)
                await asyncAction()
            return
        }
    }

    // RAISE TRANSACTION SENT TOAST
    const raiseTxSentToast = (txHash) => {
        txStatusToast.closeAll()

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
                txStatusToast.closeAll()

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
                setBridgeTxHash([String(txHash), bridgeTxHash[1]])
                setBridgeStage(REN_TX_ON_FTM)
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
                txStatusToast.closeAll()

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
                setTransactionStage(TS_SWAP_ELYS_RENBTC)
                setBridgeStage(REN_TX_ON_RENVM)
                txStatusToast.closeAll()

                txStatusToast({
                    title: e.toString(),
                    status: "error",
                    duration: 15000,
                    isClosable: true,
                })
            });

        setBridgeStage(REN_TX_ON_BTC) // give restart button
        txStatusToast.closeAll()

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
        if (transactionStage === TS_APPROVE_ELYS)
            return <Text>Approve ELYS</Text>
        else if (transactionStage === TS_SWAP_ELYS_RENBTC)
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
        if (Number(estimatedBtcOut) <= 0)
            return true
        if (!account || issue.status)
            return true
        if (transactionStage === TS_APPROVE_ELYS)
            return false
        else if ((transactionStage === TS_SWAP_ELYS_RENBTC) && (Number(elysIn)))
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
        if (transactionStage === TS_APPROVE_ELYS)
            return approveElysToContract
        else if (transactionStage === TS_SWAP_ELYS_RENBTC)
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
        <Container id="elysBridge" centerContent mt="16" minWidth="72" width="100%" maxWidth={"800px"} >
            <Box w="100%">
                <Text color="#ec7019" my="2" fontSize={'2xl'}>Bridge to BTC from ELYS<sup style={{ color: "white" }}><i> experimental</i></sup></Text>
                <Text mb="3">This tool provides a convenient way to convert ELYS on the FTM network to BTC on the Bitcoin blockchain.</Text>

                <Text mb="3">It relies on SpookySwap, Curve and Ren Project. These projects are outside of the control of Elyseos and things could change without notice.</Text>
                <Text mb="3">We therefore can provide no assurances for it working and can offer no remedies if anything goes wrong.</Text>
                <Text mb="3">Additionally due to nature of decentralised exchanges and liquidity pools you may not receive the best possible exchange rates.</Text>
                <Text mb="5">Please test with small amounts initially.</Text>
                <Text mb="5">After sending the first transaction, you can access the RenBTC in your wallet. You do not lose your tokens in case you choose not to bridge after the swap. You can also use <Link href='bridge.renproject.io' textColor={'orange'}>RenBridge</Link> to bridge your RenBTC afterwards.</Text>
            </Box>
            <Container centerContent alignItems="center" p="4" pt="0" border={"2px"} borderColor={"#ec7019"} rounded="3xl" shadow="lg" maxWidth="600px">
                <Text my="5" textAlign="left" w="full" fontSize="xl" fontWeight="medium" color={"#ed6f1b"}>ELYS to BTC</Text>
                <Stack w="full">
                    <Stack direction="row" alignItems="center" p="2">
                        {/* <Stack centerContent alignItems="center" bg="white" border="1px" borderColor="gray.200" h="full" w="32" py="2" px="3" rounded="md" direction="row"> */}
                        <ElyseosLogo style={{ height: 64 }} />
                        {/* <Text fontWeight="bold">ELYS</Text> */}
                        {/* </Stack> */}
                        <Input value={elysIn} isTruncated type="number" placeholder="0" textAlign="right" fontWeight="bold" fontSize="xl" onChange={e => setElysIn(e.target.value)} onKeyDown={e => preventIllegalAmount(e)} color={'black'} bg="#facbac" border={"2px"} borderColor={"#ec7019"} rounded={'full'} _placeholder={{ color: '#c6a188' }} />
                    </Stack>
                    <ButtonGroup isAttached variant="link" w="full" >
                        <Button w="full" mr="-px" disabled={!account} onClick={() => setElysInFromPercent(25)} color="#ec7019">25%</Button>
                        <Button w="full" mr="-px" disabled={!account} onClick={() => setElysInFromPercent(50)} color="#ec7019">50%</Button>
                        <Button w="full" mr="-px" disabled={!account} onClick={() => setElysInFromPercent(75)} color="#ec7019">75%</Button>
                        <Button w="full" mr="-px" disabled={!account} onClick={() => setElysInFromPercent(100)} color="#ec7019">100%</Button>
                    </ButtonGroup>
                </Stack>
                <Text w="fit-content" my="2" color={TEXT_COLOR}>{`≈ ${estimatedRenBtcOut} BTC`}</Text>

                {Number(renIn) ?
                    <Text w="fit-content" mt="2" color={TEXT_COLOR}>
                        {Number(ethers.utils.formatUnits(renIn, 8)).toFixed(8)} <b>renBTC</b> to transfer.
                    </Text>
                    : <></>
                }

                <Stack direction='row' alignItems="center" w="full" mb="2" mt="20px" border={"2px"} rounded={"2xl"} borderColor={"#ed6f1b"} py="3" px="5" justifyContent={"space-between"}>
                    <Text color={TEXT_COLOR} >Receiving</Text>
                    <BTCLogo style={{ height: 40, maxWidth: '60px', paddingLeft: "20px" }} />
                    <Text fontWeight={"bold"} fontSize={'lg'} color={TEXT_COLOR} >{`≈ ${estimatedBtcOut} BTC`}</Text>
                </Stack>
                <Divider my={"20px"} w="40%" border={"2px"} />
                <Box w="full" mb="6">
                    <Text mb="2" color="#ec7019">Bridge tokens to: </Text>
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
                        color={'black'} bg="#facbac" border={"2px"} borderColor={"#ec7019"} rounded={'full'}
                        _placeholder={{ color: '#c6a188' }}
                    />
                </Box>

                {/* <Stack w="full"> */}
                <Button size="lg" bg="#ec7019" _hover={{
                    bg: "#ba5715",
                }} _active={{ bg: "#6d330c" }} w="full" rounded="xl" disabled={getActionButtonDisabled()} onClick={getActionButtonOnClick()}>
                    {getActionButtonState()}
                </Button>
            </Container>
            {
                (bridgeStage > REN_WAITING) && <Flex justify="space-between" m="1" mt="2" w="full" alignItems="center" p="4" maxWidth="container.md" border="2px" borderColor={"#ed6f1b"} rounded="3xl" shadow="lg">
                    {(bridgeStage >= REN_TX_ON_FTM) && <Link mx="auto" variant="ghost" fontSize="md" color={"#ed6f1b"} href={`https://ftmscan.com/tx/${bridgeTxHash[0]}`} isExternal>
                        <Stack direction="row" alignItems="center">
                            <Text>FTM Transaction</Text>
                            <BsArrowUpRight />
                        </Stack></Link>}
                    {(bridgeStage >= REN_TX_ON_RENVM) && <Link mx="auto" variant="ghost" fontSize="md" color={"#ed6f1b"} href={`https://explorer.renproject.io/#/tx/${bridgeTxHash[1]}`} isExternal>
                        <Stack direction="row" alignItems="center">
                            <Text>RenVM Transaction</Text>
                            <BsArrowUpRight />
                        </Stack></Link>}
                </Flex>
            }
            {
                (bridgeStage > REN_WAITING) && <Container centerContent alignItems="center" p="4" maxWidth="container.md" bg="#6d330c" border="1px" borderColor="blackAlpha.100" rounded="3xl" shadow="lg" m="1">
                    {(bridgeStage >= REN_TX_ON_BTC) ? <Link mx="auto" variant="ghost" fontSize="md" href={`https://live.blockcypher.com/btc/address/${btcAddress}`} isExternal>
                        <Stack direction="row" alignItems="center">
                            <Text color="white">View transaction on Bitcoin</Text>
                            <BsArrowUpRight color='white' />
                        </Stack></Link> : <Spinner color="white" mx="auto" />}
                </Container>
            }
        </Container >
    )
}

export default ElysToBtcBridge
