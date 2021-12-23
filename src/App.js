import { useColorMode, useColorModeValue } from "@chakra-ui/color-mode";
import { Square } from "@chakra-ui/layout";
import ElysToBtcBridge from "./components/ElysToBtcBridge"
import BtcToElysBridge from "./components/BtcToElysBridge"
import Navbar from "./components/Navbar"
import { BiSun, BiMoon } from 'react-icons/bi'

function App() {
  const { colorMode, toggleColorMode } = useColorMode()

  return (
    <div className="App" style={{ height: "", backgroundColor: "burlywood" }}>
      <Navbar />
      <ElysToBtcBridge />
      <BtcToElysBridge />
      <Square onClick={toggleColorMode} position="fixed" bottom="5" right="5">{colorMode === 'light' ? <BiSun size="30px" /> : <BiMoon size="30px" />}</Square>
    </div >
  );
}

export default App;
