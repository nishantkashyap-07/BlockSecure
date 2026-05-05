import { ethers } from "ethers"

// ABI for the SecurityLogger smart contract
const CONTRACT_ABI = [
  "function logSecurityEvent(string eventType, string details, string severity, string userId) public returns (bytes32)",
  "function getSecurityEvent(bytes32 eventId) public view returns (string, string, string, string, uint256)",
  "function getTotalEvents() public view returns (uint256)",
  "function getEventIdByIndex(uint256 index) public view returns (bytes32)",
]

// Use a real deployed contract address for demo purposes
// This is a simple contract deployed on Sepolia for testing
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x803cd1bC1c06e64Ff4Cbd53bA4790844782A28d5"

/**
 * Timeout wrapper for any promise
 */
function timeoutPromise<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout after ${ms} ms`))
    }, ms)

    promise.then((res) => {
      clearTimeout(timer)
      resolve(res)
    }).catch((err) => {
      clearTimeout(timer)
      reject(err)
    })
  })
}

/**
 * Logs a security event to the Ethereum blockchain
 */
export async function logToBlockchain(
  eventType: string,
  details: string,
  severity: string,
  userId: string,
): Promise<string> {
  if (!process.env.ETHEREUM_RPC_URL || !process.env.PRIVATE_KEY) {
    console.warn("Blockchain environment variables not configured - using mock transaction hash")
    return `0xmock${Date.now().toString(16)}`
  }

  try {
    const provider = new ethers.providers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL)

    // Test network connection with timeout
    try {
      await timeoutPromise(provider.getNetwork(), 30000) // 30 seconds timeout
    } catch (networkError) {
      console.error("Network connection failed or timed out:", networkError)
      return `0xnetwork_error${Date.now().toString(16)}`
    }

    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider)
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet)

    console.log(`Logging security event to blockchain: ${eventType}`)

    const tx = await contract.logSecurityEvent(eventType, details, severity, userId)
    const receipt = await tx.wait()

    console.log(`Transaction confirmed: ${tx.hash}`)
    return tx.hash
  } catch (error) {
    console.error("Error logging to blockchain:", error)
    return `0xfailed${Date.now().toString(16)}`
  }
}

/**
 * Check if contract exists at address
 */
async function checkContractExists(provider: ethers.providers.JsonRpcProvider, address: string): Promise<boolean> {
  try {
    const code = await provider.getCode(address)
    return code !== "0x" && code !== "0x0"
  } catch (error) {
    return false
  }
}

/**
 * Test blockchain connection
 */
export async function testBlockchainConnection(): Promise<{ connected: boolean; network?: string; error?: string }> {
  try {
    if (!process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL) {
      return { connected: false, error: "NEXT_PUBLIC_ETHEREUM_RPC_URL not configured" }
    }

    console.log("Testing blockchain connection to:", process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL)

    const provider = new ethers.providers.JsonRpcProvider(process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL)

    // Test basic connection with timeout
    const network = await timeoutPromise(provider.getNetwork(), 30000)
    console.log("Connected to network:", network.name, "Chain ID:", network.chainId)

    // Test contract connection if contract address is provided and not default
    if (CONTRACT_ADDRESS && CONTRACT_ADDRESS !== "") {
      console.log("Testing contract connection to:", CONTRACT_ADDRESS)

      const contractExists = await checkContractExists(provider, CONTRACT_ADDRESS)

      if (!contractExists) {
        console.warn("No contract deployed at address:", CONTRACT_ADDRESS)
        return { connected: true, network: `${network.name} (No Contract)` }
      }

      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider)

      try {
        const totalEvents = await contract.getTotalEvents()
        console.log("Contract connected successfully. Total events:", totalEvents.toString())
        return { connected: true, network: `${network.name} (Contract: ✓)` }
      } catch (contractError) {
        console.warn("Contract call failed:", contractError)
        return { connected: true, network: `${network.name} (Contract: ✗)` }
      }
    } else {
      console.log("No contract address configured, testing RPC only")
      return { connected: true, network: `${network.name} (RPC Only)` }
    }
  } catch (error) {
    console.error("Blockchain connection test failed:", error)
    return {
      connected: false,
      error: error instanceof Error ? error.message : "Connection failed",
    }
  }
}

/**
 * Gets the total number of security events logged on the blockchain
 */
export async function getTotalEvents(): Promise<number> {
  if (!process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL) {
    return 0
  }

  try {
    const provider = new ethers.providers.JsonRpcProvider(process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL)

    const contractExists = await checkContractExists(provider, CONTRACT_ADDRESS)
    if (!contractExists) {
      console.warn("Contract not deployed at address:", CONTRACT_ADDRESS)
      return 0
    }

    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider)
    const total = await contract.getTotalEvents()
    return total.toNumber()
  } catch (error) {
    console.error("Error getting total events:", error)
    return 0
  }
}

/**
 * Gets the most recent security events from the blockchain
 */
export async function getRecentEvents(count = 10): Promise<any[]> {
  if (!process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL) {
    console.log("No RPC URL configured")
    return []
  }
  try {
    const provider = new ethers.providers.JsonRpcProvider(process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL)

    const contractExists = await checkContractExists(provider, CONTRACT_ADDRESS)
    if (!contractExists) {
      console.warn("Contract not deployed at address:", CONTRACT_ADDRESS, "- returning empty events")
      return []
    }

    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider)

    const total = await contract.getTotalEvents()
    const totalCount = total.toNumber()

    if (totalCount === 0) {
      console.log("No events found in contract")
      return []
    }

    const events = []
    const startIndex = Math.max(0, totalCount - count)
    const endIndex = totalCount

    for (let i = startIndex; i < endIndex; i++) {
      try {
        const eventId = await contract.getEventIdByIndex(i)
        const event = await contract.getSecurityEvent(eventId)

        events.push({
          id: eventId,
          eventType: event[0],
          details: event[1],
          severity: event[2],
          userId: event[3],
          timestamp: new Date(event[4].toNumber() * 1000),
          blockchainTxHash: eventId,
        })
      } catch (eventError) {
        console.error(`Error fetching event at index ${i}:`, eventError)
        // Continue with other events
      }
    }

    return events
  } catch (error) {
    console.error("Error getting recent events:", error)
    return []
  }
}

/**
 * Deploy a simple test contract 
 */
export async function deployTestContract(): Promise<string | null> {
  if (!process.env.ETHEREUM_RPC_URL || !process.env.PRIVATE_KEY) {
    console.error("Cannot deploy contract: missing environment variables")
    return null
  }

  try {
    // Simple contract bytecode for a basic storage contract
    const simpleContractBytecode =
      "6080604052348015600e575f5ffd5b50610f018061001c5f395ff3fe608060405234801561000f575f5ffd5b506004361061004a575f3560e01c80630e1eba1d1461004e57806361073d9d1461007e57806361606940146100ae578063f4adba01146100cc575b5f5ffd5b61006860048036038101906100639190610744565b610100565b6040516100759190610830565b60405180910390f35b6100986004803603810190610093919061087c565b61026c565b6040516100a59190610830565b60405180910390f35b6100b66102d8565b6040516100c391906108b6565b60405180910390f35b6100e660048036038101906100e191906108f9565b6102e4565b6040516100f7959493929190610984565b60405180910390f35b5f5f858585854260018054905060405160200161012296959493929190610a4b565b6040516020818303038152906040528051906020012090506040518060c00160405280878152602001868152602001858152602001848152602001428152602001600115158152505f5f8381526020019081526020015f205f820151815f01908161018d9190610ca7565b5060208201518160010190816101a39190610ca7565b5060408201518160020190816101b99190610ca7565b5060608201518160030190816101cf9190610ca7565b506080820151816004015560a0820151816005015f6101000a81548160ff021916908315150217905550905050600181908060018154018082558091505060019003905f5260205f20015f9091909190915055807fd0bde881105ff49b8f8055cff7009f96c482cd4bf0e0e608cfc2f5656e747ccc878686426040516102589493929190610d76565b60405180910390a280915050949350505050565b5f60018054905082106102b4576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016102ab90610e18565b60405180910390fd5b600182815481106102c8576102c7610e36565b5b905f5260205f2001549050919050565b5f600180549050905090565b6060806060805f5f5f8781526020019081526020015f206005015f9054906101000a900460ff1661034a576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161034190610ead565b60405180910390fd5b5f5f5f8881526020019081526020015f206040518060c00160405290815f8201805461037590610ad7565b80601f01602080910402602001604051908101604052809291908181526020018280546103a190610ad7565b80156103ec5780601f106103c3576101008083540402835291602001916103ec565b820191905f5260205f20905b8154815290600101906020018083116103cf57829003601f168201915b5050505050815260200160018201805461040590610ad7565b80601f016020809104026020016040519081016040528092919081815260200182805461043190610ad7565b801561047c5780601f106104535761010080835404028352916020019161047c565b820191905f5260205f20905b81548152906001019060200180831161045f57829003601f168201915b5050505050815260200160028201805461049590610ad7565b80601f01602080910402602001604051908101604052809291908181526020018280546104c190610ad7565b801561050c5780601f106104e35761010080835404028352916020019161050c565b820191905f5260205f20905b8154815290600101906020018083116104ef57829003601f168201915b5050505050815260200160038201805461052590610ad7565b80601f016020809104026020016040519081016040528092919081815260200182805461055190610ad7565b801561059c5780601f106105735761010080835404028352916020019161059c565b820191905f5260205f20905b81548152906001019060200180831161057f57829003601f168201915b5050505050815260200160048201548152602001600582015f9054906101000a900460ff1615151515815250509050805f01518160200151826040015183606001518460800151955095509550955095505091939590929450565b5f604051905090565b5f5ffd5b5f5ffd5b5f5ffd5b5f5ffd5b5f601f19601f8301169050919050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52604160045260245ffd5b61065682610610565b810181811067ffffffffffffffff8211171561067557610674610620565b5b80604052505050565b5f6106876105f7565b9050610693828261064d565b919050565b5f67ffffffffffffffff8211156106b2576106b1610620565b5b6106bb82610610565b9050602081019050919050565b828183375f83830152505050565b5f6106e86106e384610698565b61067e565b9050828152602081018484840111156107045761070361060c565b5b61070f8482856106c8565b509392505050565b5f82601f83011261072b5761072a610608565b5b813561073b8482602086016106d6565b91505092915050565b5f5f5f5f6080858703121561075c5761075b610600565b5b5f85013567ffffffffffffffff81111561077957610778610604565b5b61078587828801610717565b945050602085013567ffffffffffffffff8111156107a6576107a5610604565b5b6107b287828801610717565b935050604085013567ffffffffffffffff8111156107d3576107d2610604565b5b6107df87828801610717565b925050606085013567ffffffffffffffff811115610800576107ff610604565b5b61080c87828801610717565b91505092959194509250565b5f819050919050565b61082a81610818565b82525050565b5f6020820190506108435f830184610821565b92915050565b5f819050919050565b61085b81610849565b8114610865575f5ffd5b50565b5f8135905061087681610852565b92915050565b5f6020828403121561089157610890610600565b5b5f61089e84828501610868565b91505092915050565b6108b081610849565b82525050565b5f6020820190506108c95f8301846108a7565b92915050565b6108d881610818565b81146108e2575f5ffd5b50565b5f813590506108f3816108cf565b92915050565b5f6020828403121561090e5761090d610600565b5b5f61091b848285016108e5565b91505092915050565b5f81519050919050565b5f82825260208201905092915050565b8281835e5f83830152505050565b5f61095682610924565b610960818561092e565b935061097081856020860161093e565b61097981610610565b840191505092915050565b5f60a0820190508181035f83015261099c818861094c565b905081810360208301526109b0818761094c565b905081810360408301526109c4818661094c565b905081810360608301526109d8818561094c565b90506109e760808301846108a7565b9695505050505050565b5f81905092915050565b5f610a0582610924565b610a0f81856109f1565b9350610a1f81856020860161093e565b80840191505092915050565b5f819050919050565b610a45610a4082610849565b610a2b565b82525050565b5f610a5682896109fb565b9150610a6282886109fb565b9150610a6e82876109fb565b9150610a7a82866109fb565b9150610a868285610a34565b602082019150610a968284610a34565b602082019150819050979650505050505050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52602260045260245ffd5b5f6002820490506001821680610aee57607f821691505b602082108103610b0157610b00610aaa565b5b50919050565b5f819050815f5260205f209050919050565b5f6020601f8301049050919050565b5f82821b905092915050565b5f60088302610b637fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff82610b28565b610b6d8683610b28565b95508019841693508086168417925050509392505050565b5f819050919050565b5f610ba8610ba3610b9e84610849565b610b85565b610849565b9050919050565b5f819050919050565b610bc183610b8e565b610bd5610bcd82610baf565b848454610b34565b825550505050565b5f5f905090565b610bec610bdd565b610bf7818484610bb8565b505050565b5b81811015610c1a57610c0f5f82610be4565b600181019050610bfd565b5050565b601f821115610c5f57610c3081610b07565b610c3984610b19565b81016020851015610c48578190505b610c5c610c5485610b19565b830182610bfc565b50505b505050565b5f82821c905092915050565b5f610c7f5f1984600802610c64565b1980831691505092915050565b5f610c978383610c70565b9150826002028217905092915050565b610cb082610924565b67ffffffffffffffff811115610cc957610cc8610620565b5b610cd38254610ad7565b610cde828285610c1e565b5f60209050601f831160018114610d0f575f8415610cfd578287015190505b610d078582610c8c565b865550610d6e565b601f198416610d1d86610b07565b5f5b82811015610d4457848901518255600182019150602085019450602081019050610d1f565b86831015610d615784890151610d5d601f891682610c70565b8355505b6001600288020188555050505b505050505050565b5f6080820190508181035f830152610d8e818761094c565b90508181036020830152610da2818661094c565b90508181036040830152610db6818561094c565b9050610dc560608301846108a7565b95945050505050565b7f496e646578206f7574206f6620626f756e6473000000000000000000000000005f82015250565b5f610e0260138361092e565b9150610e0d82610dce565b602082019050919050565b5f6020820190508181035f830152610e2f81610df6565b9050919050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52603260045260245ffd5b7f4576656e7420646f6573206e6f742065786973740000000000000000000000005f82015250565b5f610e9760148361092e565b9150610ea282610e63565b602082019050919050565b5f6020820190508181035f830152610ec481610e8b565b905091905056fea26469706673582212209fed926b52ea5a4090dc683df4302d3220396f3b8988cfd621d08a6150ace66164736f6c634300081e0033"

     const simpleContractAbi = [ 
   [{"anonymous":false,"inputs":[{"indexed":true,"internalType":"bytes32","name":"eventId","type":"bytes32"},{"indexed":false,"internalType":"string","name":"eventType","type":"string"},{"indexed":false,"internalType":"string","name":"severity","type":"string"},{"indexed":false,"internalType":"string","name":"userId","type":"string"},{"indexed":false,"internalType":"uint256","name":"timestamp","type":"uint256"}],"name":"EventLogged","type":"event"},{"inputs":[{"internalType":"uint256","name":"index","type":"uint256"}],"name":"getEventIdByIndex","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"eventId","type":"bytes32"}],"name":"getSecurityEvent","outputs":[{"internalType":"string","name":"","type":"string"},{"internalType":"string","name":"","type":"string"},{"internalType":"string","name":"","type":"string"},{"internalType":"string","name":"","type":"string"},{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getTotalEvents","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"string","name":"eventType","type":"string"},{"internalType":"string","name":"details","type":"string"},{"internalType":"string","name":"severity","type":"string"},{"internalType":"string","name":"userId","type":"string"}],"name":"logSecurityEvent","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"nonpayable","type":"function"}],
    ];
    const provider = new ethers.providers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL)
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider)

    // Deploy simple contract
    const deployTx = await wallet.sendTransaction({
      data: simpleContractBytecode,
    })

    const receipt = await deployTx.wait()
    console.log("Test contract deployed at:", receipt.contractAddress)
    return receipt.contractAddress
  } catch (error) {
    console.error("Error deploying test contract:", error)
    return null
  }
}
