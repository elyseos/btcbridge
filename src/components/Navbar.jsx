import { Box, Flex, Spacer } from '@chakra-ui/react'
import WalletSpace from './WalletSpace'

const Navbar = () => {
    return (
        <Flex p="3" alignItems="center">
            <Box>
                Logo
            </Box>
            <Spacer />
            <WalletSpace />
        </Flex>
    )
}

export default Navbar
