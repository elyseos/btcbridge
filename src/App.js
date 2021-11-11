import { Box } from "@chakra-ui/react"
import { useWeb3React } from "@web3-react/core"
import Navbar from "./components/Navbar"
import { injected } from "./components/wallet/connector"

function App() {
  const { active, account, library, connector, activate, deactivate } = useWeb3React()

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
    <div className="App">
      <Navbar />
      {/* 
      <button onClick={connect}>Click me</button>
      <span>{account}</span>
      <button onClick={disconnect}>Disconnect</button> */}
    </div>
  );
}

export default App;
