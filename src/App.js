import ElysToBtcBridge from "./components/ElysToBtcBridge"
import BtcToElysBridge from "./components/BtcToElysBridge"
import Navbar from "./components/Navbar"
import SidePanel from "./components/SidePanel"
import Footer from "./components/Footer"
import { Box, Stack, Text, Image, useColorMode } from '@chakra-ui/react'
import ElysBanner from './images/elysBanner.png'
import { useState, useEffect } from "react"
import { isMobile } from 'react-device-detect';
import elysPriceGetter from './lib/elysprice'
import { ReactComponent as HamburgerIcon } from './images/hamburger_icon.svg'


function App() {
  const { colorMode, toggleColorMode } = useColorMode()
  const [elysPrice, setElysPrice] = useState({ usd: 0, ftm: 0, loaded: false })
  const [sideMenuHidden, setSideMenuHidden] = useState(false)
  const [issue, setIssue] = useState({ status: false, description: "No issues present. You can use the bridge." })

  useEffect(() => {
    const getPrice = async () => {
      let price = await elysPriceGetter.get()
      if (price.usd === 0 || price.ftm === 0) {
        let tryAgain = () => {
          return new Promise(resolve => {
            let i = setInterval(async () => {
              let price = await elysPriceGetter.get()
              if (price.usd !== 0 && price.ftm !== 0) {
                clearInterval(i)
                resolve(price)
              }
            }, 1000)
          })
        }
        price = await tryAgain()
        console.log(price)
      }
      return price
    }
    getPrice().then(res => setElysPrice(res))
    setSideMenuHidden(isMobile ? true : false)

    console.log("color", colorMode)
    if (colorMode == "light")
      toggleColorMode()
  }, [])

  return (
    <div className="App" w="100%">
      <Stack className="App" direction={"row"} justifyContent={"start "} w="100%" spacing={"0"}>
        <SidePanel hidden={sideMenuHidden} price={elysPrice} />
        <Box w="100%" mx="auto">
          <Box >
            <Image src={ElysBanner} mx="auto" />
            {isMobile && <HamburgerIcon onClick={() => setSideMenuHidden(!sideMenuHidden)} style={{ position: 'absolute', right: 5, top: 5, fill: '#FACBAC' }} />}
          </Box>
          {issue.status && <Text direction='row' alignItems="center" mx="auto" w="80%" mb="2" mt="20px" border={"2px"} rounded={"2xl"} borderColor={"#ed6f1b"} py="3" px="5" textAlign={"center"} backgroundColor={"#730a15"} >
            {issue.description}
          </Text>}
          <ElysToBtcBridge issueState={[issue, setIssue]} />
          <BtcToElysBridge issueState={[issue, setIssue]} />
          <Footer />
        </Box>
      </Stack>
    </div >
  );
}

export default App;
