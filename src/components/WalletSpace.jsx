import { Box, Button, Stack, Text } from "@chakra-ui/react"
import { BiWallet, BiCopy } from 'react-icons/bi'
import { AiOutlineDisconnect } from 'react-icons/ai'
import { useWeb3React } from "@web3-react/core"
import Jazzicon, { jsNumberForAddress } from 'react-jazzicon'
import { injected } from "./wallet/connector"


const WalletSpace = () => {
    const { active, account, activate, deactivate } = useWeb3React()

    async function connect() {
        try {
            await activate(injected)
        } catch (ex) {
            console.log(ex)
        }
    }

    async function disconnect() {
        try {
            deactivate()
        } catch (ex) {
            console.log(ex)
        }
    }

    return (
        <Stack direction="row">
            {<Box> { }</Box>}
            <Button colorScheme=
                {active ? "gray" :
                    "purple"} onClick={active ? () => { navigator.clipboard.writeText(account) } : connect}>
                <Stack alignItems="center" direction="row" >
                    {active ? <Jazzicon diameter={20} seed={jsNumberForAddress(account)} /> : <BiWallet />}
                    <Box><Text isTruncated maxWidth="28">{active ? account : 'Connect'}</Text></Box>
                    {active && <BiCopy />}
                </Stack>
                {active && <Box alignItems="center"></Box>}
            </Button>
            {active && <Button colorScheme="red" alignItems=" center" onClick={disconnect}><AiOutlineDisconnect /></Button>}
        </Stack >
    )
}

export default WalletSpace
