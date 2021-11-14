import { Box, Flex, Spacer } from '@chakra-ui/react'
import WalletSpace from './WalletSpace'

const Navbar = () => {
    return (
        <Flex p="3" alignItems="center" minH="16">
            <Box alignItems="center">
                <div>Logo</div>
            </Box>
            <Spacer />
            <WalletSpace />
        </Flex>
    )
}

export default Navbar
